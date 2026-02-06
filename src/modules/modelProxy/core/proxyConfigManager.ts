/**
 * Model Proxy 配置管理器
 * 管理代理服务的配置（端口、API Key、默认模型等）
 */
import * as fs from 'fs';
import * as path from 'path';
import { ProxyConfig } from '../../../common/types';
import { ensureDir, getModuleDir } from '../../../common/paths';
import { AuthManager } from './authManager';

const MODULE_NAME = 'modelproxy';

export class ProxyConfigManager {
    private static instance: ProxyConfigManager | undefined;
    private readonly rootDir: string;
    private readonly configPath: string;
    private readonly logsDir: string;

    private constructor() {
        this.rootDir = getModuleDir(MODULE_NAME);
        this.configPath = path.join(this.rootDir, 'config.json');
        this.logsDir = path.join(this.rootDir, 'logs');
    }

    static getInstance(): ProxyConfigManager {
        if (!ProxyConfigManager.instance) {
            ProxyConfigManager.instance = new ProxyConfigManager();
        }
        return ProxyConfigManager.instance;
    }

    /** 仅用于测试 */
    static resetInstance(): void {
        ProxyConfigManager.instance = undefined;
    }

    getModuleName(): string {
        return MODULE_NAME;
    }

    getDefaultConfig(): ProxyConfig {
        return {
            port: 18080,
            apiKey: '',
            enabled: false,
            defaultModelId: '',
            logEnabled: true,
            bindAddress: '127.0.0.1'
        };
    }

    ensureInit(): void {
        ensureDir(this.rootDir);
        ensureDir(this.logsDir);

        if (!fs.existsSync(this.configPath)) {
            const defaultConfig = this.getDefaultConfig();
            // 首次初始化时自动生成 API Key
            defaultConfig.apiKey = AuthManager.generateKey();
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        }
    }

    getConfig(): ProxyConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(content) as ProxyConfig;
        } catch (error) {
            console.error('Failed to read modelproxy config', error);
            return this.getDefaultConfig();
        }
    }

    saveConfig(config: ProxyConfig): void {
        ensureDir(this.rootDir);
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    getRootDir(): string {
        return this.rootDir;
    }

    getLogsDir(): string {
        return this.logsDir;
    }

    getConfigPath(): string {
        return this.configPath;
    }

    /**
     * 获取端口（优先从 VS Code 设置读取）
     */
    getPort(): number {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const vscode = require('vscode') as typeof import('vscode');
            const vsConfig = vscode.workspace.getConfiguration('ampify');
            const port = vsConfig.get<number>('modelProxy.port');
            if (port && port > 0) {
                return port;
            }
        } catch {
            // ignore
        }
        return this.getConfig().port;
    }

    /**
     * 获取默认模型 ID（优先从 VS Code 设置读取）
     */
    getDefaultModelId(): string {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const vscode = require('vscode') as typeof import('vscode');
            const vsConfig = vscode.workspace.getConfiguration('ampify');
            const modelId = vsConfig.get<string>('modelProxy.defaultModel');
            if (modelId) {
                return modelId;
            }
        } catch {
            // ignore
        }
        return this.getConfig().defaultModelId;
    }

    /**
     * 获取绑定地址（优先从 VS Code 设置读取）
     */
    getBindAddress(): string {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const vscode = require('vscode') as typeof import('vscode');
            const vsConfig = vscode.workspace.getConfiguration('ampify');
            const addr = vsConfig.get<string>('modelProxy.bindAddress');
            if (addr) {
                return addr;
            }
        } catch {
            // ignore
        }
        return this.getConfig().bindAddress;
    }
}
