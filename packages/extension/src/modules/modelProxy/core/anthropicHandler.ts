/**
 * Anthropic 兼容格式处理器
 * 处理 /v1/messages 请求
 */
import * as http from 'http';
import * as vscode from 'vscode';
import { ModelBridge, AnthropicChatRequest, AnthropicTool, AnthropicToolChoice } from './modelBridge';
import { LogManager } from './logManager';
import { ProxyLogEntry, ApiKeyBinding } from '../../../common/types';

export class AnthropicHandler {
    constructor(
        private modelBridge: ModelBridge,
        private logManager: LogManager
    ) {}

    /**
     * 处理 POST /v1/messages
     * 使用 binding 绑定的模型，忽略请求体中的 model 字段
     */
    async handleMessages(body: string, res: http.ServerResponse, binding: ApiKeyBinding): Promise<void> {
        const startTime = Date.now();
        const requestId = this.logManager.generateRequestId();
        let logEntry: Partial<ProxyLogEntry> = {
            timestamp: new Date().toISOString(),
            requestId,
            format: 'anthropic',
            status: 'success',
            bindingId: binding.id,
            bindingLabel: binding.label
        };

        try {
            const request = JSON.parse(body) as AnthropicChatRequest;
            logEntry.model = binding.modelId;

            // 记录输入内容
            logEntry.inputContent = JSON.stringify({ system: request.system, messages: request.messages });

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
            const messages = this.modelBridge.convertAnthropicMessages(request.messages, request.system);

            // 估算输入 tokens
            const systemText = !request.system ? ''
                : typeof request.system === 'string' ? request.system
                : (request.system as Array<unknown>).map((b: unknown) => {
                    if (typeof b === 'string') { return b; }
                    if (b && typeof b === 'object' && (b as Record<string, unknown>).type === 'text') { return (b as Record<string, string>).text || ''; }
                    return JSON.stringify(b);
                }).join('');
            const inputText = [
                systemText,
                ...request.messages.map(m =>
                    typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                )
            ].join('\n');
            logEntry.inputTokens = await this.modelBridge.countTokens(model, inputText);

            // 构建请求选项
            const options: vscode.LanguageModelChatRequestOptions = {};
            const modelOptions: Record<string, unknown> = {};
            const maxTokens = request.max_tokens && request.max_tokens > 0 ? request.max_tokens : 1024;
            if (request.temperature !== undefined) { modelOptions['temperature'] = request.temperature; }
            if (request.top_p !== undefined) { modelOptions['top_p'] = request.top_p; }
            modelOptions['max_tokens'] = maxTokens;
            if (request.top_k !== undefined) { modelOptions['top_k'] = request.top_k; }
            if (request.stop_sequences !== undefined) { modelOptions['stop_sequences'] = request.stop_sequences; }
            if (request.thinking !== undefined) { modelOptions['thinking'] = request.thinking; }
            if (request.output_config !== undefined) { modelOptions['output_config'] = request.output_config; }
            if (request.metadata !== undefined) { modelOptions['metadata'] = request.metadata; }
            if (request.service_tier !== undefined) { modelOptions['service_tier'] = request.service_tier; }
            if (request.inference_geo !== undefined) { modelOptions['inference_geo'] = request.inference_geo; }
            if (request.tools !== undefined) { modelOptions['tools'] = request.tools; }
            if (request.tool_choice !== undefined) { modelOptions['tool_choice'] = request.tool_choice; }

            const tools = this.toLanguageModelTools(request.tools);
            if (tools.length > 0) {
                options.tools = tools;
            }
            const toolMode = this.toToolMode(request.tool_choice);
            if (toolMode !== undefined) {
                options.toolMode = toolMode;
            }
            if (request.tool_choice?.type === 'none') {
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
                this.sendError(res, 403, 'permission_error', msg);
            } else {
                this.sendError(res, 500, 'api_error', msg);
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
        const contentBlocks: Array<Record<string, unknown>> = [];
        let fullText = '';
        let hasToolUse = false;

        const pushText = (text: string) => {
            if (!text) { return; }
            const last = contentBlocks[contentBlocks.length - 1];
            if (last && last.type === 'text') {
                last.text = String(last.text || '') + text;
            } else {
                contentBlocks.push({ type: 'text', text });
            }
            fullText += text;
        };

        for await (const part of response.stream) {
            if (part instanceof vscode.LanguageModelTextPart) {
                pushText(part.value);
                continue;
            }

            if (this.isThinkingPart(part)) {
                contentBlocks.push({ type: 'thinking', thinking: part.value || '', signature: '' });
                continue;
            }

            if (part instanceof vscode.LanguageModelToolCallPart) {
                hasToolUse = true;
                contentBlocks.push({
                    type: 'tool_use',
                    id: part.callId,
                    name: part.name,
                    input: part.input
                });
                continue;
            }

            if (part instanceof vscode.LanguageModelDataPart) {
                const mimeType = typeof part.mimeType === 'string' ? part.mimeType : 'application/octet-stream';
                if (this.isImageMime(mimeType)) {
                    contentBlocks.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType,
                            data: Buffer.from(part.data).toString('base64')
                        }
                    });
                } else {
                    pushText(`[data:${mimeType}]`);
                }
                continue;
            }

            pushText('[unsupported content]');
        }

        const outputTokens = await this.modelBridge.countTokens(model, fullText);
        logEntry.outputTokens = outputTokens;
        logEntry.durationMs = Date.now() - startTime;
        logEntry.outputContent = fullText;
        this.logManager.log(logEntry as ProxyLogEntry);

        const result = {
            id: `msg_${requestId}`,
            type: 'message',
            role: 'assistant',
            model: model.id,
            content: contentBlocks.length > 0 ? contentBlocks : [{ type: 'text', text: '' }],
            stop_reason: hasToolUse ? 'tool_use' : 'end_turn',
            stop_sequence: null,
            usage: {
                input_tokens: logEntry.inputTokens || 0,
                output_tokens: outputTokens
            }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
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

        const msgId = `msg_${requestId}`;
        let outputText = '';
        let currentBlockType: 'text' | 'thinking' | null = null;
        let currentBlockIndex = -1;
        let hasToolUse = false;

        // message_start
        this.writeSSE(res, 'message_start', {
            type: 'message_start',
            message: {
                id: msgId,
                type: 'message',
                role: 'assistant',
                model: model.id,
                content: [],
                stop_reason: null,
                stop_sequence: null,
                usage: {
                    input_tokens: logEntry.inputTokens || 0,
                    output_tokens: 0
                }
            }
        });

        try {
            for await (const part of response.stream) {
                if (res.destroyed) { break; }
                if (part instanceof vscode.LanguageModelTextPart) {
                    if (currentBlockType !== 'text') {
                        if (currentBlockType !== null) {
                            this.writeSSE(res, 'content_block_stop', {
                                type: 'content_block_stop',
                                index: currentBlockIndex
                            });
                        }
                        currentBlockType = 'text';
                        currentBlockIndex++;
                        this.writeSSE(res, 'content_block_start', {
                            type: 'content_block_start',
                            index: currentBlockIndex,
                            content_block: { type: 'text', text: '' }
                        });
                    }

                    outputText += part.value;
                    this.writeSSE(res, 'content_block_delta', {
                        type: 'content_block_delta',
                        index: currentBlockIndex,
                        delta: { type: 'text_delta', text: part.value }
                    });
                    continue;
                }

                if (this.isThinkingPart(part)) {
                    if (currentBlockType !== 'thinking') {
                        if (currentBlockType !== null) {
                            this.writeSSE(res, 'content_block_stop', {
                                type: 'content_block_stop',
                                index: currentBlockIndex
                            });
                        }
                        currentBlockType = 'thinking';
                        currentBlockIndex++;
                        this.writeSSE(res, 'content_block_start', {
                            type: 'content_block_start',
                            index: currentBlockIndex,
                            content_block: { type: 'thinking', thinking: '', signature: '' }
                        });
                    }

                    this.writeSSE(res, 'content_block_delta', {
                        type: 'content_block_delta',
                        index: currentBlockIndex,
                        delta: { type: 'thinking_delta', thinking: part.value || '' }
                    });
                    continue;
                }

                if (part instanceof vscode.LanguageModelToolCallPart) {
                    hasToolUse = true;
                    if (currentBlockType !== null) {
                        this.writeSSE(res, 'content_block_stop', {
                            type: 'content_block_stop',
                            index: currentBlockIndex
                        });
                        currentBlockType = null;
                    }

                    currentBlockIndex++;
                    this.writeSSE(res, 'content_block_start', {
                        type: 'content_block_start',
                        index: currentBlockIndex,
                        content_block: {
                            type: 'tool_use',
                            id: part.callId,
                            name: part.name,
                            input: {}
                        }
                    });
                    const inputJson = JSON.stringify(part.input ?? {});
                    this.writeSSE(res, 'content_block_delta', {
                        type: 'content_block_delta',
                        index: currentBlockIndex,
                        delta: { type: 'input_json_delta', partial_json: inputJson }
                    });
                    this.writeSSE(res, 'content_block_stop', {
                        type: 'content_block_stop',
                        index: currentBlockIndex
                    });
                    continue;
                }

                if (part instanceof vscode.LanguageModelDataPart) {
                    const mimeType = typeof part.mimeType === 'string' ? part.mimeType : 'application/octet-stream';
                    if (this.isImageMime(mimeType)) {
                        if (currentBlockType !== null) {
                            this.writeSSE(res, 'content_block_stop', {
                                type: 'content_block_stop',
                                index: currentBlockIndex
                            });
                            currentBlockType = null;
                        }

                        currentBlockIndex++;
                        this.writeSSE(res, 'content_block_start', {
                            type: 'content_block_start',
                            index: currentBlockIndex,
                            content_block: {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: mimeType,
                                    data: Buffer.from(part.data).toString('base64')
                                }
                            }
                        });
                        this.writeSSE(res, 'content_block_stop', {
                            type: 'content_block_stop',
                            index: currentBlockIndex
                        });
                    } else {
                        if (currentBlockType !== 'text') {
                            if (currentBlockType !== null) {
                                this.writeSSE(res, 'content_block_stop', {
                                    type: 'content_block_stop',
                                    index: currentBlockIndex
                                });
                            }
                            currentBlockType = 'text';
                            currentBlockIndex++;
                            this.writeSSE(res, 'content_block_start', {
                                type: 'content_block_start',
                                index: currentBlockIndex,
                                content_block: { type: 'text', text: '' }
                            });
                        }

                        const placeholder = `[data:${mimeType}]`;
                        outputText += placeholder;
                        this.writeSSE(res, 'content_block_delta', {
                            type: 'content_block_delta',
                            index: currentBlockIndex,
                            delta: { type: 'text_delta', text: placeholder }
                        });
                    }
                    continue;
                }

                if (currentBlockType !== 'text') {
                    if (currentBlockType !== null) {
                        this.writeSSE(res, 'content_block_stop', {
                            type: 'content_block_stop',
                            index: currentBlockIndex
                        });
                    }
                    currentBlockType = 'text';
                    currentBlockIndex++;
                    this.writeSSE(res, 'content_block_start', {
                        type: 'content_block_start',
                        index: currentBlockIndex,
                        content_block: { type: 'text', text: '' }
                    });
                }

                const unknownText = '[unsupported content]';
                outputText += unknownText;
                this.writeSSE(res, 'content_block_delta', {
                    type: 'content_block_delta',
                    index: currentBlockIndex,
                    delta: { type: 'text_delta', text: unknownText }
                });
            }

            if (currentBlockType !== null) {
                this.writeSSE(res, 'content_block_stop', {
                    type: 'content_block_stop',
                    index: currentBlockIndex
                });
            }

            const outputTokens = await this.modelBridge.countTokens(model, outputText);

            // message_delta
            this.writeSSE(res, 'message_delta', {
                type: 'message_delta',
                delta: { stop_reason: hasToolUse ? 'tool_use' : 'end_turn', stop_sequence: null },
                usage: { output_tokens: outputTokens }
            });

            // message_stop
            this.writeSSE(res, 'message_stop', {
                type: 'message_stop'
            });

            logEntry.outputTokens = outputTokens;
        } finally {
            logEntry.durationMs = Date.now() - startTime;
            logEntry.outputContent = outputText;
            this.logManager.log(logEntry as ProxyLogEntry);
            res.end();
        }
    }

    private toLanguageModelTools(tools?: AnthropicTool[]): vscode.LanguageModelChatTool[] {
        if (!tools || tools.length === 0) {
            return [];
        }
        return tools.map(tool => ({
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.input_schema
        }));
    }

    private toToolMode(toolChoice?: AnthropicToolChoice): vscode.LanguageModelChatToolMode | undefined {
        if (!toolChoice) {
            return undefined;
        }
        if (toolChoice.type === 'auto') {
            return vscode.LanguageModelChatToolMode.Auto;
        }
        if (toolChoice.type === 'any' || toolChoice.type === 'tool') {
            return vscode.LanguageModelChatToolMode.Required;
        }
        return undefined;
    }

    private isImageMime(mimeType: string): boolean {
        const lower = mimeType.toLowerCase();
        return lower.startsWith('image/');
    }

    private isThinkingPart(part: unknown): part is { value?: string } {
        if (!part || typeof part !== 'object') {
            return false;
        }
        const ctorName = (part as { constructor?: { name?: string } }).constructor?.name;
        return ctorName === 'LanguageModelThinkingPart' && 'value' in (part as Record<string, unknown>);
    }

    private writeSSE(res: http.ServerResponse, event: string, data: unknown): void {
        if (res.destroyed) { return; }
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    private sendError(res: http.ServerResponse, status: number, type: string, message: string): void {
        if (res.headersSent) { return; }
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            type: 'error',
            error: { type, message }
        }));
    }
}
