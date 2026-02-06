/**
 * OpenAI 兼容格式处理器
 * 处理 /v1/chat/completions 和 /v1/models 请求
 */
import * as http from 'http';
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { ModelBridge, OpenAIChatRequest } from './modelBridge';
import { LogManager } from './logManager';
import { ProxyLogEntry } from '../../../common/types';

export class OpenAIHandler {
    constructor(
        private modelBridge: ModelBridge,
        private logManager: LogManager
    ) {}

    /**
     * 处理 GET /v1/models
     */
    handleModels(res: http.ServerResponse): void {
        const models = this.modelBridge.getAvailableModels();
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
     */
    async handleChatCompletions(body: string, res: http.ServerResponse): Promise<void> {
        const startTime = Date.now();
        const requestId = this.logManager.generateRequestId();
        let logEntry: Partial<ProxyLogEntry> = {
            timestamp: new Date().toISOString(),
            requestId,
            format: 'openai',
            status: 'success'
        };

        try {
            const request = JSON.parse(body) as OpenAIChatRequest;
            logEntry.model = request.model;

            // 记录输入内容
            logEntry.inputContent = JSON.stringify(request.messages);

            // 查找模型
            const model = this.modelBridge.findModel(request.model) || this.modelBridge.getConfiguredDefaultModel();
            if (!model) {
                this.sendError(res, 404, 'model_not_found', 'No models available');
                logEntry.status = 'error';
                logEntry.error = 'No models available';
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

        for await (const chunk of response.text) {
            fullText += chunk;
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
                    content: fullText
                },
                finish_reason: 'stop'
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
            for await (const chunk of response.text) {
                if (res.destroyed) { break; }
                outputText += chunk;

                const data = {
                    id: completionId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: model.id,
                    choices: [{
                        index: 0,
                        delta: { content: chunk },
                        finish_reason: null
                    }]
                };
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            }

            // 发送结束 chunk
            const endChunk = {
                id: completionId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model.id,
                choices: [{
                    index: 0,
                    delta: {},
                    finish_reason: 'stop'
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
}
