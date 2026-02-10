/**
 * 模型桥接器
 * 管理 VS Code Chat Models 与外部 API 格式之间的转换
 */
import * as vscode from 'vscode';
import { AvailableModel } from '../../../common/types';

export class ModelBridge {
    private models = new Map<string, vscode.LanguageModelChat>();
    private modelInfos: AvailableModel[] = [];
    private disposables: vscode.Disposable[] = [];
    private autoRefreshEnabled = false;

    constructor() {
    }

    /**
     * 启用模型自动刷新（避免在扩展激活时触发 VS Code 模型选择）
     */
    enableAutoRefresh(): void {
        if (this.autoRefreshEnabled) { return; }
        this.autoRefreshEnabled = true;
        // 监听模型变化
        this.disposables.push(
            vscode.lm.onDidChangeChatModels(() => {
                void this.refreshModels();
            })
        );
    }

    /**
     * 刷新可用模型列表
     */
    async refreshModels(): Promise<void> {
        try {
            const chatModels = await vscode.lm.selectChatModels();
            this.models.clear();
            this.modelInfos = [];

            for (const model of chatModels) {
                this.models.set(model.id, model);
                // 同时按 family 注册别名，方便外部匹配
                if (model.family && !this.models.has(model.family)) {
                    this.models.set(model.family, model);
                }
                this.modelInfos.push({
                    id: model.id,
                    name: model.name,
                    vendor: model.vendor,
                    family: model.family,
                    version: model.version,
                    maxInputTokens: model.maxInputTokens
                });
            }
        } catch (error) {
            console.error('Failed to refresh chat models:', error);
        }
    }

    /**
     * 获取所有可用模型信息
     */
    getAvailableModels(): AvailableModel[] {
        return this.modelInfos;
    }

    /**
     * 查找模型：先精确匹配 id，再匹配 family，再模糊匹配
     */
    findModel(modelId: string): vscode.LanguageModelChat | undefined {
        // 精确匹配
        if (this.models.has(modelId)) {
            return this.models.get(modelId);
        }

        // 按 family 精确匹配
        for (const model of this.models.values()) {
            if (model.family === modelId) {
                return model;
            }
        }

        // 模糊匹配（包含关键字）
        const lower = modelId.toLowerCase();
        for (const model of this.models.values()) {
            if (model.id.toLowerCase().includes(lower) ||
                model.family.toLowerCase().includes(lower) ||
                model.name.toLowerCase().includes(lower)) {
                return model;
            }
        }

        return undefined;
    }

    /**
     * 获取默认模型（第一个可用的）
     */
    getDefaultModel(): vscode.LanguageModelChat | undefined {
        const values = Array.from(this.models.values());
        // 去重（因为 family 别名可能重复）
        const seen = new Set<string>();
        for (const model of values) {
            if (!seen.has(model.id)) {
                seen.add(model.id);
                return model;
            }
        }
        return undefined;
    }

    /**
     * 发送请求到模型并返回流式响应
     */
    async sendRequest(
        model: vscode.LanguageModelChat,
        messages: vscode.LanguageModelChatMessage[],
        options?: vscode.LanguageModelChatRequestOptions,
        token?: vscode.CancellationToken
    ): Promise<vscode.LanguageModelChatResponse> {
        return model.sendRequest(messages, options || {}, token);
    }

    /**
     * 估算 token 数量
     */
    async countTokens(model: vscode.LanguageModelChat, text: string): Promise<number> {
        try {
            return await model.countTokens(text);
        } catch {
            // 简单估算：大约 4 字符 = 1 token
            return Math.ceil(text.length / 4);
        }
    }

    /**
     * 将 OpenAI 格式的 messages 转换为 VS Code LanguageModelChatMessage[]
     */
    convertOpenAIMessages(messages: OpenAIMessage[]): vscode.LanguageModelChatMessage[] {
        const result: vscode.LanguageModelChatMessage[] = [];

        for (const msg of messages) {
            if (msg.role === 'tool') {
                const toolCallId = msg.tool_call_id || msg.name || `tool_${Math.random().toString(16).slice(2, 10)}`;
                const toolResultParts = this.openAIContentToToolResultParts(msg.content);
                const toolResult = new vscode.LanguageModelToolResultPart(toolCallId, toolResultParts);
                result.push(vscode.LanguageModelChatMessage.User([toolResult]));
                continue;
            }

            const parts = this.openAIContentToParts(msg.content);
            if (msg.tool_calls && msg.role === 'assistant') {
                for (const call of msg.tool_calls) {
                    if (call.type !== 'function') { continue; }
                    const input = this.safeJsonParse(call.function.arguments);
                    parts.push(new vscode.LanguageModelToolCallPart(call.id, call.function.name, input));
                }
            }

            const content = this.toUserMessageContent(parts);
            switch (msg.role) {
                case 'system':
                case 'user':
                    result.push(vscode.LanguageModelChatMessage.User(content));
                    break;
                case 'assistant':
                    result.push(vscode.LanguageModelChatMessage.Assistant(this.toAssistantMessageContent(parts)));
                    break;
                default:
                    // 'tool' 等角色也当作 user 处理
                    result.push(vscode.LanguageModelChatMessage.User(content));
                    break;
            }
        }

        return result;
    }

    /**
     * 将 Anthropic 格式的 messages + system 转换为 VS Code LanguageModelChatMessage[]
     */
    convertAnthropicMessages(messages: AnthropicMessage[], system?: string | AnthropicContentBlock[]): vscode.LanguageModelChatMessage[] {
        const result: vscode.LanguageModelChatMessage[] = [];

        // system prompt 作为第一条 User 消息
        if (system) {
            const systemParts = this.anthropicContentToParts(system, 'user');
            const systemContent = this.toUserMessageContent(systemParts);
            result.push(vscode.LanguageModelChatMessage.User(systemContent));
        }

        for (const msg of messages) {
            const parts = this.anthropicContentToParts(msg.content, msg.role);
            const content = this.toUserMessageContent(parts);

            switch (msg.role) {
                case 'user':
                    result.push(vscode.LanguageModelChatMessage.User(content));
                    break;
                case 'assistant':
                    result.push(vscode.LanguageModelChatMessage.Assistant(this.toAssistantMessageContent(parts)));
                    break;
                default:
                    result.push(vscode.LanguageModelChatMessage.User(content));
                    break;
            }
        }

        return result;
    }

    private openAIContentToParts(content: string | OpenAIContentPart[]): Array<vscode.LanguageModelInputPart> {
        if (typeof content === 'string') {
            return [new vscode.LanguageModelTextPart(content)];
        }

        const parts: Array<vscode.LanguageModelInputPart> = [];
        for (const part of content) {
            if (typeof part === 'string') {
                parts.push(new vscode.LanguageModelTextPart(part));
                continue;
            }

            if (part.type === 'text') {
                parts.push(new vscode.LanguageModelTextPart(part.text || ''));
                continue;
            }

            if (part.type === 'image_url') {
                const imageUrl = (part as { image_url?: { url?: string } }).image_url?.url || '';
                const data = this.tryDecodeDataUrl(imageUrl);
                if (data) {
                    parts.push(new vscode.LanguageModelDataPart(data.bytes, data.mimeType));
                } else {
                    parts.push(new vscode.LanguageModelTextPart('[image_url]'));
                }
                continue;
            }

            parts.push(new vscode.LanguageModelTextPart(this.safeStringify(part)));
        }

        return parts;
    }

    private openAIContentToToolResultParts(content: string | OpenAIContentPart[]): Array<vscode.LanguageModelTextPart | vscode.LanguageModelDataPart> {
        const parts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelDataPart> = [];
        for (const part of this.openAIContentToParts(content)) {
            if (part instanceof vscode.LanguageModelTextPart || part instanceof vscode.LanguageModelDataPart) {
                parts.push(part);
            }
        }
        return parts;
    }

    private toUserMessageContent(parts: vscode.LanguageModelInputPart[]): string | Array<vscode.LanguageModelTextPart | vscode.LanguageModelToolResultPart | vscode.LanguageModelDataPart> {
        const userParts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelToolResultPart | vscode.LanguageModelDataPart> = [];
        for (const part of parts) {
            if (part instanceof vscode.LanguageModelTextPart ||
                part instanceof vscode.LanguageModelToolResultPart ||
                part instanceof vscode.LanguageModelDataPart) {
                userParts.push(part);
                continue;
            }
            if (part instanceof vscode.LanguageModelToolCallPart) {
                userParts.push(new vscode.LanguageModelTextPart(`[tool_call:${part.name}]`));
            }
        }
        return userParts.length > 0 ? userParts : '';
    }

    private toAssistantMessageContent(parts: vscode.LanguageModelInputPart[]): string | Array<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart | vscode.LanguageModelDataPart> {
        const assistantParts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart | vscode.LanguageModelDataPart> = [];
        for (const part of parts) {
            if (part instanceof vscode.LanguageModelTextPart ||
                part instanceof vscode.LanguageModelToolCallPart ||
                part instanceof vscode.LanguageModelDataPart) {
                assistantParts.push(part);
                continue;
            }
            if (part instanceof vscode.LanguageModelToolResultPart) {
                assistantParts.push(new vscode.LanguageModelTextPart('[tool_result]'));
            }
        }
        return assistantParts.length > 0 ? assistantParts : '';
    }

    private anthropicContentToParts(content: string | AnthropicContentBlock[], role: 'user' | 'assistant'): Array<vscode.LanguageModelInputPart> {
        if (typeof content === 'string') {
            return [new vscode.LanguageModelTextPart(content)];
        }

        const parts: Array<vscode.LanguageModelInputPart> = [];
        for (const block of content) {
            if (typeof block === 'string') {
                parts.push(new vscode.LanguageModelTextPart(block));
                continue;
            }

            switch (block.type) {
                case 'text':
                    parts.push(new vscode.LanguageModelTextPart(block.text || ''));
                    break;
                case 'image': {
                    const image = this.anthropicImageToDataPart(block.source);
                    if (image) {
                        parts.push(image);
                    } else {
                        parts.push(new vscode.LanguageModelTextPart('[image]'));
                    }
                    break;
                }
                case 'tool_use':
                    if (role === 'assistant') {
                        parts.push(new vscode.LanguageModelToolCallPart(block.id, block.name, block.input || {}));
                    } else {
                        parts.push(new vscode.LanguageModelTextPart(`[tool_use:${block.name}]`));
                    }
                    break;
                case 'tool_result':
                    if (role === 'user') {
                        const toolResultParts = this.anthropicToolResultContentToParts(block.content);
                        parts.push(new vscode.LanguageModelToolResultPart(block.tool_use_id, toolResultParts));
                    } else {
                        parts.push(new vscode.LanguageModelTextPart(this.anthropicBlockToText(block)));
                    }
                    break;
                case 'thinking':
                    parts.push(new vscode.LanguageModelTextPart(block.thinking || ''));
                    break;
                case 'redacted_thinking':
                    parts.push(new vscode.LanguageModelTextPart('[redacted_thinking]'));
                    break;
                case 'document':
                case 'search_result':
                case 'server_tool_use':
                case 'web_search_tool_result':
                    parts.push(new vscode.LanguageModelTextPart(this.anthropicBlockToText(block)));
                    break;
                default:
                    parts.push(new vscode.LanguageModelTextPart(this.anthropicBlockToText(block)));
                    break;
            }
        }

        return parts;
    }

    private anthropicToolResultContentToParts(content?: string | AnthropicContentBlock[]): Array<vscode.LanguageModelTextPart | vscode.LanguageModelDataPart> {
        if (!content) {
            return [new vscode.LanguageModelTextPart('')];
        }

        if (typeof content === 'string') {
            return [new vscode.LanguageModelTextPart(content)];
        }

        const parts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelDataPart> = [];
        for (const block of content) {
            if (typeof block === 'string') {
                parts.push(new vscode.LanguageModelTextPart(block));
                continue;
            }

            if (block.type === 'text') {
                parts.push(new vscode.LanguageModelTextPart(block.text || ''));
                continue;
            }

            if (block.type === 'image') {
                const image = this.anthropicImageToDataPart(block.source);
                if (image) {
                    parts.push(image);
                } else {
                    parts.push(new vscode.LanguageModelTextPart('[image]'));
                }
                continue;
            }

            parts.push(new vscode.LanguageModelTextPart(this.anthropicBlockToText(block)));
        }

        return parts;
    }

    private anthropicImageToDataPart(source: AnthropicImageSource | undefined): vscode.LanguageModelDataPart | undefined {
        if (!source) {
            return undefined;
        }
        if (source.type === 'base64' && typeof source.data === 'string' && typeof source.media_type === 'string') {
            try {
                return new vscode.LanguageModelDataPart(Buffer.from(source.data, 'base64'), source.media_type);
            } catch {
                return undefined;
            }
        }
        return undefined;
    }

    private anthropicBlockToText(block: AnthropicContentBlock): string {
        if (typeof block === 'string') {
            return block;
        }

        switch (block.type) {
            case 'text':
                return block.text || '';
            case 'thinking':
                return block.thinking || '';
            case 'redacted_thinking':
                return '[redacted_thinking]';
            case 'tool_use':
                return `[tool_use:${block.name}]`;
            case 'tool_result':
                return typeof block.content === 'string'
                    ? block.content
                    : this.anthropicBlocksToText(this.asAnthropicContentArray(block.content));
            case 'document':
                return this.anthropicDocumentToText(block.source);
            case 'search_result':
                return this.anthropicBlocksToText(this.asAnthropicContentArray(block.content));
            case 'image':
                return '[image]';
            case 'server_tool_use':
                return `[server_tool_use:${block.name}]`;
            case 'web_search_tool_result':
                return '[web_search_tool_result]';
            default:
                return this.safeStringify(block);
        }
    }

    private anthropicBlocksToText(blocks: AnthropicContentBlock[]): string {
        return blocks.map(block => this.anthropicBlockToText(block)).join('');
    }

    private anthropicDocumentToText(source?: AnthropicDocumentSource): string {
        if (!source) {
            return '[document]';
        }
        if (source.type === 'text' && typeof source.data === 'string') {
            return source.data;
        }
        if (source.type === 'content') {
            if (typeof source.content === 'string') {
                return source.content;
            }
            return this.anthropicBlocksToText(this.asAnthropicContentArray(source.content));
        }
        return '[document]';
    }

    private asAnthropicContentArray(content: string | AnthropicContentBlock[] | undefined): AnthropicContentBlock[] {
        if (!content) {
            return [];
        }
        if (typeof content === 'string') {
            return [{ type: 'text', text: content }];
        }
        return content;
    }

    private safeJsonParse(value: string): object {
        try {
            return JSON.parse(value) as object;
        } catch {
            return { raw: value };
        }
    }

    private safeStringify(value: unknown): string {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    private tryDecodeDataUrl(url: string): { mimeType: string; bytes: Uint8Array } | undefined {
        if (!url.startsWith('data:')) {
            return undefined;
        }
        const commaIndex = url.indexOf(',');
        if (commaIndex === -1) {
            return undefined;
        }
        const meta = url.slice(5, commaIndex);
        const data = url.slice(commaIndex + 1);
        if (!meta.includes(';base64')) {
            return undefined;
        }
        const mimeType = meta.split(';')[0] || 'application/octet-stream';
        try {
            const bytes = Buffer.from(data, 'base64');
            return { mimeType, bytes };
        } catch {
            return undefined;
        }
    }

    dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
    }
}

// ==================== 外部 API 消息类型 ====================

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | OpenAIContentPart[];
    name?: string;
    tool_calls?: OpenAIToolCall[];
    tool_call_id?: string;
}

export type OpenAIContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string | AnthropicContentBlock[];
}

export type AnthropicContentBlock =
    | string
    | { type: 'text'; text: string; citations?: unknown[]; cache_control?: unknown }
    | { type: 'image'; source: AnthropicImageSource; cache_control?: unknown }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown>; cache_control?: unknown }
    | { type: 'tool_result'; tool_use_id: string; content?: string | AnthropicContentBlock[]; is_error?: boolean; cache_control?: unknown }
    | { type: 'thinking'; thinking: string; signature?: string }
    | { type: 'redacted_thinking'; data: string }
    | { type: 'document'; source?: AnthropicDocumentSource; cache_control?: unknown; title?: string; context?: string }
    | { type: 'search_result'; content?: AnthropicContentBlock[]; source?: string; title?: string }
    | { type: 'server_tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'web_search_tool_result'; tool_use_id: string; content?: unknown };

export interface AnthropicImageSource {
    type: 'base64' | 'url';
    media_type?: string;
    data?: string;
    url?: string;
}

export interface AnthropicDocumentSource {
    type: 'base64' | 'text' | 'content' | 'url';
    media_type?: string;
    data?: string;
    url?: string;
    content?: string | AnthropicContentBlock[];
}

export interface OpenAIChatRequest {
    model: string;
    messages: OpenAIMessage[];
    stream?: boolean;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    stop?: string | string[];
    presence_penalty?: number;
    frequency_penalty?: number;
    tools?: OpenAITool[];
    tool_choice?: OpenAIToolChoice;
    response_format?: OpenAIResponseFormat;
    user?: string;
}

export interface AnthropicChatRequest {
    model: string;
    messages: AnthropicMessage[];
    system?: string | AnthropicContentBlock[];
    stream?: boolean;
    max_tokens: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stop_sequences?: string[];
    tools?: AnthropicTool[];
    tool_choice?: AnthropicToolChoice;
    thinking?: AnthropicThinkingConfig;
    output_config?: AnthropicOutputConfig;
    metadata?: AnthropicMetadata;
    service_tier?: 'auto' | 'standard_only';
    inference_geo?: string;
}

export interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters?: object;
    };
}

export type OpenAIToolChoice =
    | 'auto'
    | 'none'
    | 'required'
    | { type: 'function'; function: { name: string } };

export type OpenAIResponseFormat =
    | { type: 'text' }
    | { type: 'json_object' }
    | { type: 'json_schema'; json_schema: object };

export interface AnthropicTool {
    name: string;
    description?: string;
    input_schema?: object;
}

export type AnthropicToolChoice =
    | { type: 'auto'; disable_parallel_tool_use?: boolean }
    | { type: 'any'; disable_parallel_tool_use?: boolean }
    | { type: 'tool'; name: string; disable_parallel_tool_use?: boolean }
    | { type: 'none' };

export type AnthropicThinkingConfig =
    | { type: 'enabled'; budget_tokens: number }
    | { type: 'disabled' }
    | { type: 'adaptive' };

export interface AnthropicOutputConfig {
    effort?: 'low' | 'medium' | 'high' | 'max';
    format?: { type: 'json_schema'; schema: object };
}

export interface AnthropicMetadata {
    user_id?: string;
}
