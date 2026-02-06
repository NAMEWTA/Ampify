/**
 * Anthropic 兼容格式处理器
 * 处理 /v1/messages 请求
 */
import * as http from 'http';
import * as vscode from 'vscode';
import { ModelBridge, AnthropicChatRequest } from './modelBridge';
import { LogManager } from './logManager';
import { ProxyLogEntry } from '../../../common/types';

export class AnthropicHandler {
    constructor(
        private modelBridge: ModelBridge,
        private logManager: LogManager
    ) {}

    /**
     * 处理 POST /v1/messages
     */
    async handleMessages(body: string, res: http.ServerResponse): Promise<void> {
        const startTime = Date.now();
        const requestId = this.logManager.generateRequestId();
        let logEntry: Partial<ProxyLogEntry> = {
            timestamp: new Date().toISOString(),
            requestId,
            format: 'anthropic',
            status: 'success'
        };

        try {
            const request = JSON.parse(body) as AnthropicChatRequest;
            logEntry.model = request.model;

            // 记录输入内容
            logEntry.inputContent = JSON.stringify({ system: request.system, messages: request.messages });

            // 查找模型
            const model = this.modelBridge.findModel(request.model) || this.modelBridge.getConfiguredDefaultModel();
            if (!model) {
                this.sendError(res, 404, 'not_found_error', 'No models available');
                logEntry.status = 'error';
                logEntry.error = 'No models available';
                return;
            }

            logEntry.model = model.id;

            // 转换消息
            const messages = this.modelBridge.convertAnthropicMessages(request.messages, request.system);

            // 估算输入 tokens
            const inputText = [
                request.system || '',
                ...request.messages.map(m =>
                    typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                )
            ].join('\n');
            logEntry.inputTokens = await this.modelBridge.countTokens(model, inputText);

            // 构建请求选项
            const options: vscode.LanguageModelChatRequestOptions = {};
            const modelOptions: Record<string, unknown> = {};
            if (request.temperature !== undefined) { modelOptions['temperature'] = request.temperature; }
            if (request.top_p !== undefined) { modelOptions['top_p'] = request.top_p; }
            if (request.max_tokens !== undefined) { modelOptions['max_tokens'] = request.max_tokens; }
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
        let fullText = '';

        for await (const chunk of response.text) {
            fullText += chunk;
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
            content: [{
                type: 'text',
                text: fullText
            }],
            stop_reason: 'end_turn',
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

        // content_block_start
        this.writeSSE(res, 'content_block_start', {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'text', text: '' }
        });

        try {
            for await (const chunk of response.text) {
                if (res.destroyed) { break; }
                outputText += chunk;

                this.writeSSE(res, 'content_block_delta', {
                    type: 'content_block_delta',
                    index: 0,
                    delta: { type: 'text_delta', text: chunk }
                });
            }

            // content_block_stop
            this.writeSSE(res, 'content_block_stop', {
                type: 'content_block_stop',
                index: 0
            });

            const outputTokens = await this.modelBridge.countTokens(model, outputText);

            // message_delta
            this.writeSSE(res, 'message_delta', {
                type: 'message_delta',
                delta: { stop_reason: 'end_turn', stop_sequence: null },
                usage: { output_tokens: outputTokens }
            });

            // message_stop
            this.writeSSE(res, 'message_stop', {
                type: 'message_stop'
            });

            logEntry.outputTokens = outputTokens;
        } finally {
            logEntry.durationMs = Date.now() - startTime;            logEntry.outputContent = outputText;            this.logManager.log(logEntry as ProxyLogEntry);
            res.end();
        }
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
