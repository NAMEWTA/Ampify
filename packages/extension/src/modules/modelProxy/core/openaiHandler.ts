/**
 * OpenAI 兼容格式处理器
 * 处理 /v1/chat/completions 和 /v1/models 请求
 */
import * as http from 'http';
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { ModelBridge, OpenAIChatRequest, OpenAITool, OpenAIToolChoice } from './modelBridge';
import { LogManager } from './logManager';
import { ProxyLogEntry, ApiKeyBinding } from '../../../common/types';

export class OpenAIHandler {
    constructor(
        private modelBridge: ModelBridge,
        private logManager: LogManager
    ) {}

    /**
     * 处理 GET /v1/models — 仅返回该 Key 绑定的模型
     */
    handleModels(res: http.ServerResponse, binding: ApiKeyBinding): void {
        const allModels = this.modelBridge.getAvailableModels();
        // 仅返回绑定的模型
        const boundModel = allModels.find(m => m.id === binding.modelId || m.family === binding.modelId);
        const models = boundModel ? [boundModel] : [];

        const data = {
            object: 'list',
            data: models.map(m => ({
                id: m.id,
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: m.vendor,
                permission: [],
                root: m.family,
                parent: null
            }))
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    /**
     * 处理 POST /v1/chat/completions
     * 使用 binding 绑定的模型，忽略请求体中的 model 字段
     */
    async handleChatCompletions(body: string, res: http.ServerResponse, binding: ApiKeyBinding): Promise<void> {
        const startTime = Date.now();
        const requestId = this.logManager.generateRequestId();
        let logEntry: Partial<ProxyLogEntry> = {
            timestamp: new Date().toISOString(),
            requestId,
            format: 'openai',
            status: 'success',
            bindingId: binding.id,
            bindingLabel: binding.label
        };

        try {
            const request = JSON.parse(body) as OpenAIChatRequest;
            logEntry.model = binding.modelId;

            // 记录输入内容
            logEntry.inputContent = JSON.stringify(request.messages);

            // 使用绑定的模型（忽略请求体中的 model 字段）
            const model = this.modelBridge.findModel(binding.modelId);
            if (!model) {
                this.sendError(res, 503, 'model_unavailable', `Bound model "${binding.modelId}" is not available`);
                logEntry.status = 'error';
                logEntry.error = `Bound model "${binding.modelId}" is not available`;
                return;
            }

            logEntry.model = model.id;

            // 转换消息
            const messages = this.modelBridge.convertOpenAIMessages(request.messages);

            // 估算输入 tokens
            const inputText = request.messages.map(m =>
                typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            ).join('\n');
            logEntry.inputTokens = await this.modelBridge.countTokens(model, inputText);

            // 构建请求选项
            const options: vscode.LanguageModelChatRequestOptions = {};
            const modelOptions: Record<string, unknown> = {};
            if (request.temperature !== undefined) { modelOptions['temperature'] = request.temperature; }
            if (request.top_p !== undefined) { modelOptions['top_p'] = request.top_p; }
            if (request.max_tokens !== undefined) { modelOptions['max_tokens'] = request.max_tokens; }
            if (request.max_completion_tokens !== undefined) { modelOptions['max_tokens'] = request.max_completion_tokens; }
            if (request.stop !== undefined) { modelOptions['stop'] = request.stop; }
            if (request.presence_penalty !== undefined) { modelOptions['presence_penalty'] = request.presence_penalty; }
            if (request.frequency_penalty !== undefined) { modelOptions['frequency_penalty'] = request.frequency_penalty; }
            if (request.tools !== undefined) { modelOptions['tools'] = request.tools; }
            if (request.tool_choice !== undefined) { modelOptions['tool_choice'] = request.tool_choice; }
            if (request.response_format !== undefined) { modelOptions['response_format'] = request.response_format; }
            if (request.user !== undefined) { modelOptions['user'] = request.user; }

            const tools = this.toLanguageModelTools(request.tools);
            if (tools.length > 0) {
                options.tools = tools;
            }
            const toolMode = this.toToolMode(request.tool_choice);
            if (toolMode !== undefined) {
                options.toolMode = toolMode;
            }
            if (request.tool_choice === 'none') {
                options.tools = undefined;
                options.toolMode = undefined;
            }
            if (Object.keys(modelOptions).length > 0) {
                options.modelOptions = modelOptions;
            }

            // 创建 CancellationToken
            const cts = new vscode.CancellationTokenSource();
            res.on('close', () => cts.cancel());

            // 发送请求
            const response = await this.modelBridge.sendRequest(model, messages, options, cts.token);

            if (request.stream) {
                await this.handleStream(response, model, res, requestId, logEntry, startTime);
            } else {
                await this.handleNonStream(response, model, res, requestId, logEntry, startTime);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logEntry.status = 'error';
            logEntry.error = msg;
            logEntry.durationMs = Date.now() - startTime;
            logEntry.outputTokens = 0;
            this.logManager.log(logEntry as ProxyLogEntry);

            if (error instanceof vscode.LanguageModelError) {
                this.sendError(res, 403, 'permission_denied', msg);
            } else {
                this.sendError(res, 500, 'internal_error', msg);
            }
        }
    }

    private async handleNonStream(
        response: vscode.LanguageModelChatResponse,
        model: vscode.LanguageModelChat,
        res: http.ServerResponse,
        requestId: string,
        logEntry: Partial<ProxyLogEntry>,
        startTime: number
    ): Promise<void> {
        let fullText = '';
        const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
        const toolCallIndex = new Map<string, number>();

        const pushToolCall = (part: vscode.LanguageModelToolCallPart) => {
            if (!toolCallIndex.has(part.callId)) {
                toolCallIndex.set(part.callId, toolCalls.length);
                toolCalls.push({
                    id: part.callId,
                    type: 'function',
                    function: {
                        name: part.name,
                        arguments: JSON.stringify(part.input ?? {})
                    }
                });
            }
        };

        const appendText = (text: string) => {
            if (text) {
                fullText += text;
            }
        };

        for await (const part of response.stream) {
            if (part instanceof vscode.LanguageModelTextPart) {
                appendText(part.value);
                continue;
            }
            if (this.isThinkingPart(part)) {
                appendText(part.value ? `[thinking]\n${part.value}` : '[thinking]');
                continue;
            }
            if (part instanceof vscode.LanguageModelToolCallPart) {
                pushToolCall(part);
                continue;
            }
            if (part instanceof vscode.LanguageModelDataPart) {
                const mimeType = typeof part.mimeType === 'string' ? part.mimeType : 'application/octet-stream';
                appendText(`[data:${mimeType}]`);
                continue;
            }
            appendText('[unsupported content]');
        }

        const outputTokens = await this.modelBridge.countTokens(model, fullText);
        logEntry.outputTokens = outputTokens;
        logEntry.durationMs = Date.now() - startTime;
        logEntry.outputContent = fullText;
        this.logManager.log(logEntry as ProxyLogEntry);

        const completion = {
            id: `chatcmpl-${requestId}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model.id,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: fullText || null,
                    tool_calls: toolCalls.length > 0 ? toolCalls : undefined
                },
                finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop'
            }],
            usage: {
                prompt_tokens: logEntry.inputTokens || 0,
                completion_tokens: outputTokens,
                total_tokens: (logEntry.inputTokens || 0) + outputTokens
            }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(completion));
    }

    private async handleStream(
        response: vscode.LanguageModelChatResponse,
        model: vscode.LanguageModelChat,
        res: http.ServerResponse,
        requestId: string,
        logEntry: Partial<ProxyLogEntry>,
        startTime: number
    ): Promise<void> {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const completionId = `chatcmpl-${requestId}`;
        let outputText = '';
        const toolCallIndex = new Map<string, number>();

        // 发送初始 chunk（role）
        const initialChunk = {
            id: completionId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model.id,
            choices: [{
                index: 0,
                delta: { role: 'assistant', content: '' },
                finish_reason: null
            }]
        };
        res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

        try {
            for await (const part of response.stream) {
                if (res.destroyed) { break; }

                if (part instanceof vscode.LanguageModelTextPart) {
                    outputText += part.value;
                    const data = {
                        id: completionId,
                        object: 'chat.completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: model.id,
                        choices: [{
                            index: 0,
                            delta: { content: part.value },
                            finish_reason: null
                        }]
                    };
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                    continue;
                }

                if (this.isThinkingPart(part)) {
                    const thinkingText = part.value ? `[thinking]\n${part.value}` : '[thinking]';
                    outputText += thinkingText;
                    const data = {
                        id: completionId,
                        object: 'chat.completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: model.id,
                        choices: [{
                            index: 0,
                            delta: { content: thinkingText },
                            finish_reason: null
                        }]
                    };
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                    continue;
                }

                if (part instanceof vscode.LanguageModelToolCallPart) {
                    let index = toolCallIndex.get(part.callId);
                    if (index === undefined) {
                        index = toolCallIndex.size;
                        toolCallIndex.set(part.callId, index);
                    }

                    const data = {
                        id: completionId,
                        object: 'chat.completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: model.id,
                        choices: [{
                            index: 0,
                            delta: {
                                tool_calls: [{
                                    index,
                                    id: part.callId,
                                    type: 'function',
                                    function: {
                                        name: part.name,
                                        arguments: JSON.stringify(part.input ?? {})
                                    }
                                }]
                            },
                            finish_reason: null
                        }]
                    };
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                    continue;
                }

                if (part instanceof vscode.LanguageModelDataPart) {
                    const mimeType = typeof part.mimeType === 'string' ? part.mimeType : 'application/octet-stream';
                    const placeholder = `[data:${mimeType}]`;
                    outputText += placeholder;
                    const data = {
                        id: completionId,
                        object: 'chat.completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: model.id,
                        choices: [{
                            index: 0,
                            delta: { content: placeholder },
                            finish_reason: null
                        }]
                    };
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                    continue;
                }

                const unknownText = '[unsupported content]';
                outputText += unknownText;
                const data = {
                    id: completionId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: model.id,
                    choices: [{
                        index: 0,
                        delta: { content: unknownText },
                        finish_reason: null
                    }]
                };
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            }

            // 发送结束 chunk
            const finishReason = toolCallIndex.size > 0 ? 'tool_calls' : 'stop';
            const endChunk = {
                id: completionId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model.id,
                choices: [{
                    index: 0,
                    delta: {},
                    finish_reason: finishReason
                }]
            };
            res.write(`data: ${JSON.stringify(endChunk)}\n\n`);
            res.write('data: [DONE]\n\n');
        } finally {
            logEntry.outputTokens = await this.modelBridge.countTokens(model, outputText);
            logEntry.durationMs = Date.now() - startTime;
            logEntry.outputContent = outputText;
            this.logManager.log(logEntry as ProxyLogEntry);
            res.end();
        }
    }

    private sendError(res: http.ServerResponse, status: number, type: string, message: string): void {
        if (res.headersSent) { return; }
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: { message, type, code: status }
        }));
    }

    private toLanguageModelTools(tools?: OpenAITool[]): vscode.LanguageModelChatTool[] {
        if (!tools || tools.length === 0) {
            return [];
        }
        return tools
            .filter(tool => tool.type === 'function')
            .map(tool => ({
                name: tool.function.name,
                description: tool.function.description || '',
                inputSchema: tool.function.parameters
            }));
    }

    private toToolMode(toolChoice?: OpenAIToolChoice): vscode.LanguageModelChatToolMode | undefined {
        if (!toolChoice) {
            return undefined;
        }
        if (toolChoice === 'auto') {
            return vscode.LanguageModelChatToolMode.Auto;
        }
        if (toolChoice === 'required') {
            return vscode.LanguageModelChatToolMode.Required;
        }
        if (typeof toolChoice === 'object' && toolChoice.type === 'function') {
            return vscode.LanguageModelChatToolMode.Required;
        }
        return undefined;
    }

    private isThinkingPart(part: unknown): part is { value?: string } {
        if (!part || typeof part !== 'object') {
            return false;
        }
        const ctorName = (part as { constructor?: { name?: string } }).constructor?.name;
        return ctorName === 'LanguageModelThinkingPart' && 'value' in (part as Record<string, unknown>);
    }
}
