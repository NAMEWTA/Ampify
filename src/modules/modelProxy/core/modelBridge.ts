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

    constructor() {
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
     * 获取配置的默认模型（读取 config.defaultModelId 或 VS Code Settings）
     * 若配置了 defaultModelId 则按该 ID 查找；否则 fallback 到第一个可用模型
     */
    getConfiguredDefaultModel(): vscode.LanguageModelChat | undefined {
        try {
            const { ProxyConfigManager } = require('./proxyConfigManager') as typeof import('./proxyConfigManager');
            const configManager = ProxyConfigManager.getInstance();
            const defaultModelId = configManager.getDefaultModelId();
            if (defaultModelId) {
                const found = this.findModel(defaultModelId);
                if (found) {
                    return found;
                }
            }
        } catch {
            // ignore
        }
        return this.getDefaultModel();
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
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            switch (msg.role) {
                case 'system':
                case 'user':
                    result.push(vscode.LanguageModelChatMessage.User(content));
                    break;
                case 'assistant':
                    result.push(vscode.LanguageModelChatMessage.Assistant(content));
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
    convertAnthropicMessages(messages: AnthropicMessage[], system?: string): vscode.LanguageModelChatMessage[] {
        const result: vscode.LanguageModelChatMessage[] = [];

        // system prompt 作为第一条 User 消息
        if (system) {
            result.push(vscode.LanguageModelChatMessage.User(system));
        }

        for (const msg of messages) {
            const content = typeof msg.content === 'string'
                ? msg.content
                : msg.content.map(block => {
                    if (typeof block === 'string') { return block; }
                    if (block.type === 'text') { return block.text || ''; }
                    return JSON.stringify(block);
                }).join('');

            switch (msg.role) {
                case 'user':
                    result.push(vscode.LanguageModelChatMessage.User(content));
                    break;
                case 'assistant':
                    result.push(vscode.LanguageModelChatMessage.Assistant(content));
                    break;
                default:
                    result.push(vscode.LanguageModelChatMessage.User(content));
                    break;
            }
        }

        return result;
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
}

export type OpenAIContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string | AnthropicContentBlock[];
}

export type AnthropicContentBlock = string | { type: 'text'; text: string } | { type: 'image'; source: unknown };

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
}

export interface AnthropicChatRequest {
    model: string;
    messages: AnthropicMessage[];
    system?: string;
    stream?: boolean;
    max_tokens: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stop_sequences?: string[];
}
