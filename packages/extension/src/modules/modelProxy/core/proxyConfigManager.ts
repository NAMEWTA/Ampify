/**
 * Model Proxy 配置管理器
 * 管理代理服务的配置（端口、API Key 绑定、模型路由等）
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ProxyConfig, ApiKeyBinding } from '../../../common/types';
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
            apiKeyBindings: [],
            enabled: false,
            logEnabled: true,
            bindAddress: '127.0.0.1'
        };
    }

    ensureInit(): void {
        ensureDir(this.rootDir);
        ensureDir(this.logsDir);

        if (!fs.existsSync(this.configPath)) {
            const defaultConfig = this.getDefaultConfig();
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        } else {
            // 迁移旧配置格式：apiKey + defaultModelId → apiKeyBindings
            this.migrateOldConfig();
        }
    }

    /**
     * 迁移旧配置：将 apiKey + defaultModelId 转为 apiKeyBindings 数组第一条记录
     */
    private migrateOldConfig(): void {
        try {
            const content = fs.readFileSync(this.configPath, 'utf8');
            const raw = JSON.parse(content);

            // 检测旧格式：存在 apiKey 字段且不存在 apiKeyBindings
            if (typeof raw.apiKey === 'string' && raw.apiKey && !Array.isArray(raw.apiKeyBindings)) {
                const binding: ApiKeyBinding = {
                    id: crypto.randomBytes(4).toString('hex'),
                    apiKey: raw.apiKey,
                    modelId: raw.defaultModelId || '',
                    label: 'Default',
                    createdAt: Date.now()
                };

                const migrated: ProxyConfig = {
                    port: raw.port ?? 18080,
                    apiKeyBindings: [binding],
                    enabled: raw.enabled ?? false,
                    logEnabled: raw.logEnabled ?? true,
                    bindAddress: raw.bindAddress ?? '127.0.0.1'
                };

                fs.writeFileSync(this.configPath, JSON.stringify(migrated, null, 2), 'utf8');
                console.log('ProxyConfigManager: migrated old config format to apiKeyBindings');
            }
        } catch (error) {
            console.error('Failed to migrate old proxy config:', error);
        }
    }

    getConfig(): ProxyConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            const raw = JSON.parse(content);
            // Ensure apiKeyBindings is always an array
            if (!Array.isArray(raw.apiKeyBindings)) {
                raw.apiKeyBindings = [];
            }
            return raw as ProxyConfig;
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

    // ==================== Binding CRUD ====================

    /**
     * 生成绑定 ID（8 位 hex）
     */
    private generateBindingId(): string {
        return crypto.randomBytes(4).toString('hex');
    }

    /**
     * 添加一个 Key-Model 绑定
     */
    addBinding(modelId: string, label?: string): ApiKeyBinding {
        const config = this.getConfig();
        const binding: ApiKeyBinding = {
            id: this.generateBindingId(),
            apiKey: AuthManager.generateKey(),
            modelId,
            label: label || modelId,
            createdAt: Date.now()
        };
        config.apiKeyBindings.push(binding);
        this.saveConfig(config);
        return binding;
    }

    /**
     * 删除指定绑定
     */
    removeBinding(bindingId: string): boolean {
        const config = this.getConfig();
        const idx = config.apiKeyBindings.findIndex(b => b.id === bindingId);
        if (idx === -1) { return false; }
        config.apiKeyBindings.splice(idx, 1);
        this.saveConfig(config);
        return true;
    }

    /**
     * 获取所有绑定
     */
    getBindings(): ApiKeyBinding[] {
        return this.getConfig().apiKeyBindings;
    }

    /**
     * 根据 API Key 查找绑定
     */
    getBindingByKey(apiKey: string): ApiKeyBinding | undefined {
        return this.getConfig().apiKeyBindings.find(b => b.apiKey === apiKey);
    }

    /**
     * 根据 ID 查找绑定
     */
    getBindingById(bindingId: string): ApiKeyBinding | undefined {
        return this.getConfig().apiKeyBindings.find(b => b.id === bindingId);
    }

    /**
     * 更新绑定别名
     */
    updateBindingLabel(bindingId: string, label: string): boolean {
        const config = this.getConfig();
        const binding = config.apiKeyBindings.find(b => b.id === bindingId);
        if (!binding) { return false; }
        binding.label = label;
        this.saveConfig(config);
        return true;
    }

    /**
     * 重新生成指定绑定的 API Key
     */
    regenerateBindingKey(bindingId: string): string | undefined {
        const config = this.getConfig();
        const binding = config.apiKeyBindings.find(b => b.id === bindingId);
        if (!binding) { return undefined; }
        binding.apiKey = AuthManager.generateKey();
        this.saveConfig(config);
        return binding.apiKey;
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
