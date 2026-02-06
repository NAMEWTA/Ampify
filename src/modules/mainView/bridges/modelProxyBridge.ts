/**
 * Model Proxy 数据桥接
 * 将 Model Proxy 模块数据适配为 ModelProxyDashboardData 和 TreeNode[]
 */
import * as vscode from 'vscode';
import { TreeNode, ToolbarAction, ModelProxyDashboardData, ModelProxyModelInfo, ModelProxyLogInfo, ModelProxyLabels, LogFileInfo, LogQueryResult } from '../protocol';
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
        const defaultModelId = this.configManager.getDefaultModelId();

        // 获取运行状态
        let running = false;
        try {
            const { getProxyServer } = require('../../modelProxy/index');
            const server = getProxyServer();
            running = server?.running ?? false;
        } catch {
            running = false;
        }

        // API Key
        const key = config.apiKey || '';
        const maskedKey = key.length > 12
            ? `${key.slice(0, 8)}...${key.slice(-4)}`
            : key;

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
            maskedApiKey: maskedKey,
            fullApiKey: key,
            defaultModelId,
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
            availableModels: I18n.get('modelProxy.availableModels'),
            selectModelHint: I18n.get('modelProxy.selectModelHint'),
            noModels: I18n.get('modelProxy.noModels'),
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
            case 'selectModel':
                await vscode.commands.executeCommand('ampify.modelProxy.selectModel');
                break;
            case 'openLogs':
                await vscode.commands.executeCommand('ampify.modelProxy.viewLogs');
                break;
        }
    }

    /**
     * 设置默认模型 ID（同时保存到 config.json 和 VS Code Settings）
     */
    async setDefaultModel(modelId: string): Promise<void> {
        // 保存到 config.json
        const config = this.configManager.getConfig();
        config.defaultModelId = modelId;
        this.configManager.saveConfig(config);

        // 同步保存到 VS Code Settings
        const vsConfig = vscode.workspace.getConfiguration('ampify');
        await vsConfig.update('modelProxy.defaultModel', modelId, vscode.ConfigurationTarget.Global);
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
