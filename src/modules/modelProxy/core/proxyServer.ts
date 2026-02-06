/**
 * HTTP 代理服务器
 * 使用 Node.js 内置 http 模块，路由请求到 OpenAI / Anthropic 处理器
 */
import * as http from 'http';
import { URL } from 'url';
import { ModelBridge } from './modelBridge';
import { OpenAIHandler } from './openaiHandler';
import { AnthropicHandler } from './anthropicHandler';
import { AuthManager } from './authManager';
import { LogManager } from './logManager';
import { ProxyConfigManager } from './proxyConfigManager';

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export class ProxyServer {
    private server: http.Server | null = null;
    private openaiHandler: OpenAIHandler;
    private anthropicHandler: AnthropicHandler;
    private configManager: ProxyConfigManager;
    private _running = false;

    constructor(
        private modelBridge: ModelBridge,
        private logManager: LogManager
    ) {
        this.openaiHandler = new OpenAIHandler(modelBridge, logManager);
        this.anthropicHandler = new AnthropicHandler(modelBridge, logManager);
        this.configManager = ProxyConfigManager.getInstance();
    }

    get running(): boolean {
        return this._running;
    }

    /**
     * 启动 HTTP 服务器
     */
    start(port: number, bindAddress: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                resolve();
                return;
            }

            this.server = http.createServer((req, res) => {
                void this.handleRequest(req, res);
            });

            this.server.on('error', (err: NodeJS.ErrnoException) => {
                this.server = null;
                this._running = false;
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${port} is already in use`));
                } else {
                    reject(err);
                }
            });

            this.server.listen(port, bindAddress, () => {
                this._running = true;
                resolve();
            });
        });
    }

    /**
     * 停止 HTTP 服务器
     */
    stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server) {
                this._running = false;
                resolve();
                return;
            }

            this.server.close(() => {
                this.server = null;
                this._running = false;
                resolve();
            });

            // 强制关闭所有连接
            this.server.closeAllConnections?.();
        });
    }

    /**
     * 处理传入请求
     */
    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');

        // 预检请求
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        // 健康检查（无需认证）
        if (pathname === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                models: this.modelBridge.getAvailableModels().length
            }));
            return;
        }

        // API Key 验证
        const config = this.configManager.getConfig();
        if (!AuthManager.validateRequest(req, config.apiKey)) {
            this.sendError(res, 401, 'Unauthorized', 'Invalid or missing API key');
            return;
        }

        try {
            // 路由
            if (pathname === '/v1/models' && req.method === 'GET') {
                this.openaiHandler.handleModels(res);
            } else if (pathname === '/v1/chat/completions' && req.method === 'POST') {
                const body = await this.readBody(req);
                await this.openaiHandler.handleChatCompletions(body, res);
            } else if (pathname === '/v1/messages' && req.method === 'POST') {
                const body = await this.readBody(req);
                await this.anthropicHandler.handleMessages(body, res);
            } else {
                this.sendError(res, 404, 'Not Found', `Unknown endpoint: ${req.method} ${pathname}`);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('Proxy server error:', msg);
            this.sendError(res, 500, 'Internal Server Error', msg);
        }
    }

    /**
     * 读取请求体
     */
    private readBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            let size = 0;

            req.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > MAX_BODY_SIZE) {
                    req.destroy();
                    reject(new Error('Request body too large'));
                    return;
                }
                chunks.push(chunk);
            });

            req.on('end', () => {
                resolve(Buffer.concat(chunks).toString('utf8'));
            });

            req.on('error', reject);
        });
    }

    private sendError(res: http.ServerResponse, status: number, type: string, message: string): void {
        if (res.headersSent) { return; }
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: { message, type, code: status }
        }));
    }
}
