/**
 * Model Proxy 数据桥接
 * 将 Model Proxy 模块数据适配为 ModelProxyDashboardData 和 TreeNode[]
 */
import * as vscode from 'vscode';
import { TreeNode, ToolbarAction, ModelProxyDashboardData, ModelProxyModelInfo, ModelProxyLogInfo, ModelProxyLabels, ModelProxyBindingInfo, LogFileInfo, LogQueryResult } from '../protocol';
import { ProxyConfigManager } from '../../modelProxy/core/proxyConfigManager';
import { LogManager } from '../../modelProxy/core/logManager';
import { I18n } from '../../../common/i18n';

export class ModelProxyBridge {
    private configManager: ProxyConfigManager;
    private logManager: LogManager;

    constructor() {
        this.configManager = ProxyConfigManager.getInstance();
        this.logManager = new LogManager();
    }

    /**
     * 获取 Model Proxy 仪表板数据（用于自定义渲染）
     */
    getDashboardData(): ModelProxyDashboardData {
        const config = this.configManager.getConfig();
        const port = this.configManager.getPort();
        const bindAddress = this.configManager.getBindAddress();

        // 获取运行状态
        let running = false;
        try {
            const { getProxyServer } = require('../../modelProxy/index');
            const server = getProxyServer();
            running = server?.running ?? false;
        } catch {
            running = false;
        }

        // 模型列表
        let models: ModelProxyModelInfo[] = [];
        try {
            const { getModelBridge } = require('../../modelProxy/index');
            const bridge = getModelBridge();
            if (bridge) {
                models = bridge.getAvailableModels().map((m: ModelProxyModelInfo) => ({
                    id: m.id,
                    name: m.name,
                    vendor: m.vendor,
                    family: m.family,
                    maxInputTokens: m.maxInputTokens
                }));
            }
        } catch { /* ignore */ }

        // 构建绑定信息列表
        const bindings: ModelProxyBindingInfo[] = config.apiKeyBindings.map(b => {
            const key = b.apiKey || '';
            const maskedKey = key.length > 12
                ? `${key.slice(0, 8)}...${key.slice(-4)}`
                : key;
            // 查找模型名称
            const modelInfo = models.find(m => m.id === b.modelId || m.family === b.modelId);
            return {
                id: b.id,
                maskedKey,
                fullKey: key,
                modelId: b.modelId,
                modelName: modelInfo?.name || b.modelId,
                label: b.label,
                createdAt: b.createdAt
            };
        });

        // 今日统计
        const stats = this.logManager.getTodayStats();

        // 最近日志
        const recentLogs: ModelProxyLogInfo[] = this.logManager.getRecentLogs(10).map(log => ({
            timestamp: log.timestamp,
            requestId: log.requestId || '',
            format: log.format,
            model: log.model || '?',
            durationMs: log.durationMs,
            inputTokens: log.inputTokens,
            outputTokens: log.outputTokens,
            status: log.status,
            error: log.error,
            inputContent: log.inputContent,
            outputContent: log.outputContent
        }));

        return {
            running,
            port,
            bindAddress,
            baseUrl: `http://${bindAddress}:${port}`,
            bindings,
            todayRequests: stats.requests,
            todayTokens: stats.tokens,
            todayErrors: stats.errors,
            avgLatencyMs: stats.avgLatencyMs,
            models,
            recentLogs,
            labels: this.getLabels()
        };
    }

    private getLabels(): ModelProxyLabels {
        return {
            statusRunning: I18n.get('modelProxy.status.running'),
            statusStopped: I18n.get('modelProxy.status.stopped'),
            offline: I18n.get('modelProxy.offline'),
            requests: I18n.get('modelProxy.statRequests'),
            tokens: I18n.get('modelProxy.statTokens'),
            errorRate: I18n.get('modelProxy.errorRate'),
            avgLatency: I18n.get('modelProxy.avgLatency'),
            connection: I18n.get('modelProxy.connectionInfo'),
            baseUrl: I18n.get('modelProxy.baseUrl'),
            apiKey: I18n.get('modelProxy.apiKey'),
            copy: I18n.get('modelProxy.copy'),
            regenerate: I18n.get('modelProxy.regenerate'),
            bindings: I18n.get('modelProxy.bindings'),
            availableModels: I18n.get('modelProxy.availableModels'),
            noModels: I18n.get('modelProxy.noModels'),
            addBinding: I18n.get('modelProxy.addBinding'),
            removeBinding: I18n.get('modelProxy.removeBinding'),
            noBindings: I18n.get('modelProxy.noBindings'),
            recentLogs: I18n.get('modelProxy.recentLogs'),
            tokensMax: I18n.get('modelProxy.tokensMax'),
            openLogsFolder: I18n.get('modelProxy.openLogsFolder'),
            logDetailTitle: I18n.get('modelProxy.logDetailTitle'),
            logInput: I18n.get('modelProxy.logInput'),
            logOutput: I18n.get('modelProxy.logOutput'),
            logError: I18n.get('modelProxy.logError'),
            logRequestId: I18n.get('modelProxy.logRequestId'),
            logDuration: I18n.get('modelProxy.logDuration'),
            logClose: I18n.get('modelProxy.logClose'),
            viewAllLogs: I18n.get('modelProxy.viewAllLogs'),
            logViewerTitle: I18n.get('modelProxy.logViewerTitle'),
            logYear: I18n.get('modelProxy.logYear'),
            logMonth: I18n.get('modelProxy.logMonth'),
            logDay: I18n.get('modelProxy.logDay'),
            logAll: I18n.get('modelProxy.logAll'),
            logSuccess: I18n.get('modelProxy.logSuccess'),
            logErrors: I18n.get('modelProxy.logErrors'),
            logSearchPlaceholder: I18n.get('modelProxy.logSearchPlaceholder'),
            logSelectDate: I18n.get('modelProxy.logSelectDate'),
            logNoResults: I18n.get('modelProxy.logNoResults'),
            logTotalEntries: I18n.get('modelProxy.logTotalEntries'),
            logTime: I18n.get('modelProxy.logTime'),
            noLogs: I18n.get('modelProxy.noLogs')
        };
    }

    getTreeData(): TreeNode[] {
        // Not used for modelProxy anymore (custom rendering), return empty
        return [];
    }

    getToolbar(): ToolbarAction[] {
        let running = false;
        try {
            const { getProxyServer } = require('../../modelProxy/index');
            const server = getProxyServer();
            running = server?.running ?? false;
        } catch {
            running = false;
        }

        return [
            {
                id: 'toggle',
                label: running ? 'Stop' : 'Start',
                iconId: running ? 'debug-stop' : 'play',
                command: 'ampify.modelProxy.toggle',
                action: 'overlay'
            },
            {
                id: 'refresh',
                label: 'Refresh',
                iconId: 'refresh',
                command: 'ampify.modelProxy.refresh',
                action: 'overlay'
            },
            {
                id: 'openLogs',
                label: 'Open Logs',
                iconId: 'folder-opened',
                command: 'ampify.modelProxy.viewLogs',
                action: 'overlay'
            }
        ];
    }

    async executeAction(actionId: string, _nodeId: string): Promise<void> {
        switch (actionId) {
            case 'toggle':
                await vscode.commands.executeCommand('ampify.modelProxy.toggle');
                break;
            case 'copyUrl':
                await vscode.commands.executeCommand('ampify.modelProxy.copyBaseUrl');
                break;
            case 'copyKey':
                await vscode.commands.executeCommand('ampify.modelProxy.copyKey');
                break;
            case 'regenerateKey':
                await vscode.commands.executeCommand('ampify.modelProxy.regenerateKey');
                break;
            case 'addBinding':
                await vscode.commands.executeCommand('ampify.modelProxy.addBinding');
                break;
            case 'removeBinding':
                await vscode.commands.executeCommand('ampify.modelProxy.removeBinding');
                break;
            case 'openLogs':
                await vscode.commands.executeCommand('ampify.modelProxy.viewLogs');
                break;
        }
    }

    /**
     * 复制指定绑定的 API Key
     */
    async copyBindingKey(bindingId: string): Promise<void> {
        const binding = this.configManager.getBindingById(bindingId);
        if (binding) {
            await vscode.env.clipboard.writeText(binding.apiKey);
            vscode.window.showInformationMessage(I18n.get('modelProxy.keyCopied'));
        }
    }

    /**
     * 删除指定绑定
     */
    async removeBinding(bindingId: string): Promise<void> {
        const binding = this.configManager.getBindingById(bindingId);
        if (!binding) { return; }

        const answer = await vscode.window.showWarningMessage(
            I18n.get('modelProxy.confirmRemoveBinding', binding.label),
            { modal: true },
            I18n.get('skills.yes')
        );
        if (answer === I18n.get('skills.yes')) {
            this.configManager.removeBinding(bindingId);
            vscode.window.showInformationMessage(I18n.get('modelProxy.bindingRemoved', binding.label));
        }
    }

    /**
     * 获取所有日志文件列表（按日期分组）
     */
    getLogFiles(): LogFileInfo[] {
        return this.logManager.getLogFiles();
    }

    /**
     * 分页查询日志
     */
    queryLogs(
        date: string,
        page: number,
        pageSize: number,
        statusFilter: 'all' | 'success' | 'error',
        keyword?: string
    ): LogQueryResult {
        const result = this.logManager.queryLogs(date, page, pageSize, statusFilter, keyword);
        return {
            entries: result.entries.map(log => ({
                timestamp: log.timestamp,
                requestId: log.requestId || '',
                format: log.format,
                model: log.model || '?',
                durationMs: log.durationMs,
                inputTokens: log.inputTokens,
                outputTokens: log.outputTokens,
                status: log.status,
                error: log.error,
                inputContent: log.inputContent,
                outputContent: log.outputContent
            })),
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            totalPages: result.totalPages
        };
    }
}
