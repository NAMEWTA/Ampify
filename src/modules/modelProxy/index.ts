/**
 * Model Proxy 模块入口
 * 注册命令并管理代理服务器生命周期
 */
import * as vscode from 'vscode';
import { ProxyConfigManager } from './core/proxyConfigManager';
import { ProxyServer } from './core/proxyServer';
import { ModelBridge } from './core/modelBridge';
import { LogManager } from './core/logManager';
import { AuthManager } from './core/authManager';
import { I18n } from '../../common/i18n';

let proxyServer: ProxyServer | undefined;
let modelBridge: ModelBridge | undefined;
let logManager: LogManager | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function getModelBridge(): ModelBridge | undefined {
    return modelBridge;
}

export function getLogManager(): LogManager | undefined {
    return logManager;
}

export function getProxyServer(): ProxyServer | undefined {
    return proxyServer;
}

export async function registerModelProxy(context: vscode.ExtensionContext): Promise<void> {
    const configManager = ProxyConfigManager.getInstance();
    configManager.ensureInit();

    modelBridge = new ModelBridge();
    logManager = new LogManager();
    proxyServer = new ProxyServer(modelBridge, logManager);

    // 创建状态栏
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'ampify.modelProxy.toggle';
    updateStatusBar(false);
    context.subscriptions.push(statusBarItem);

    // 初始化模型列表
    await modelBridge.refreshModels();

    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.modelProxy.toggle', async () => {
            if (proxyServer?.running) {
                await stopProxy();
            } else {
                await startProxy();
            }
        }),

        vscode.commands.registerCommand('ampify.modelProxy.start', async () => {
            await startProxy();
        }),

        vscode.commands.registerCommand('ampify.modelProxy.stop', async () => {
            await stopProxy();
        }),

        vscode.commands.registerCommand('ampify.modelProxy.copyKey', () => {
            const config = configManager.getConfig();
            if (config.apiKey) {
                void vscode.env.clipboard.writeText(config.apiKey);
                vscode.window.showInformationMessage(I18n.get('modelProxy.keyCopied'));
            }
        }),

        vscode.commands.registerCommand('ampify.modelProxy.regenerateKey', async () => {
            const answer = await vscode.window.showWarningMessage(
                I18n.get('modelProxy.confirmRegenerate'),
                { modal: true },
                I18n.get('skills.yes')
            );
            if (answer === I18n.get('skills.yes')) {
                const config = configManager.getConfig();
                config.apiKey = AuthManager.generateKey();
                configManager.saveConfig(config);
                vscode.window.showInformationMessage(I18n.get('modelProxy.keyRegenerated'));
            }
        }),

        vscode.commands.registerCommand('ampify.modelProxy.copyBaseUrl', () => {
            const config = configManager.getConfig();
            const url = `http://${config.bindAddress}:${configManager.getPort()}`;
            void vscode.env.clipboard.writeText(url);
            vscode.window.showInformationMessage(I18n.get('modelProxy.urlCopied'));
        }),

        vscode.commands.registerCommand('ampify.modelProxy.selectModel', async () => {
            if (!modelBridge) { return; }
            const models = modelBridge.getAvailableModels();
            if (models.length === 0) {
                vscode.window.showWarningMessage(I18n.get('modelProxy.noModels'));
                return;
            }

            const items = models.map(m => ({
                label: m.name || m.id,
                description: `${m.vendor} · ${m.family}`,
                detail: `ID: ${m.id} | Max tokens: ${m.maxInputTokens}`,
                modelId: m.id
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: I18n.get('modelProxy.selectModel')
            });

            if (selected) {
                const config = configManager.getConfig();
                config.defaultModelId = selected.modelId;
                configManager.saveConfig(config);
            }
        }),

        vscode.commands.registerCommand('ampify.modelProxy.viewLogs', async () => {
            // 打开当前实例的日志目录
            const logsDir = logManager ? logManager.getInstanceLogsDir() : configManager.getLogsDir();
            const uri = vscode.Uri.file(logsDir);
            await vscode.commands.executeCommand('revealFileInOS', uri);
        }),

        vscode.commands.registerCommand('ampify.modelProxy.refresh', async () => {
            await modelBridge?.refreshModels();
        })
    );

    // 注册 dispose
    context.subscriptions.push({
        dispose: () => {
            void proxyServer?.stop();
            modelBridge?.dispose();
        }
    });

    // 每次启动 VS Code 时重置为未启动状态
    const config = configManager.getConfig();
    if (config.enabled) {
        config.enabled = false;
        configManager.saveConfig(config);
    }
}

async function startProxy(): Promise<void> {
    if (!proxyServer || !modelBridge) { return; }

    const configManager = ProxyConfigManager.getInstance();

    // 确保模型列表已刷新
    await modelBridge.refreshModels();

    if (modelBridge.getAvailableModels().length === 0) {
        vscode.window.showWarningMessage(I18n.get('modelProxy.noModels'));
        return;
    }

    const basePort = Number(configManager.getPort());
    const bindAddress = configManager.getBindAddress();
    const maxAttempts = 50;

    let actualPort = basePort;
    let started = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        actualPort = basePort + attempt;
        try {
            await proxyServer.start(actualPort, bindAddress);
            started = true;
            break;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes('already in use')) {
                // 继续尝试下一个端口
                continue;
            } else {
                // 非端口占用错误，直接报错退出
                vscode.window.showErrorMessage(I18n.get('modelProxy.startFailed', msg));
                return;
            }
        }
    }

    if (!started) {
        const lastPort = basePort + maxAttempts - 1;
        vscode.window.showErrorMessage(I18n.get('modelProxy.portExhausted', String(basePort), String(lastPort)));
        return;
    }

    // 保存启用状态
    const config = configManager.getConfig();
    config.enabled = true;
    configManager.saveConfig(config);

    updateStatusBar(true, actualPort);

    if (actualPort !== basePort) {
        vscode.window.showInformationMessage(I18n.get('modelProxy.portFallback', String(basePort), String(actualPort)));
    } else {
        vscode.window.showInformationMessage(I18n.get('modelProxy.started', String(actualPort)));
    }
}

async function stopProxy(): Promise<void> {
    if (!proxyServer) { return; }

    await proxyServer.stop();

    const configManager = ProxyConfigManager.getInstance();
    const config = configManager.getConfig();
    config.enabled = false;
    configManager.saveConfig(config);

    updateStatusBar(false);
    vscode.window.showInformationMessage(I18n.get('modelProxy.stopped'));
}

function updateStatusBar(running: boolean, port?: number): void {
    if (!statusBarItem) { return; }
    if (running) {
        statusBarItem.text = `$(radio-tower) Proxy :${port || '?'}`;
        statusBarItem.tooltip = 'Model Proxy: Running — Click to stop';
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = '$(radio-tower) Proxy Off';
        statusBarItem.tooltip = 'Model Proxy: Stopped — Click to start';
        statusBarItem.backgroundColor = undefined;
    }
    statusBarItem.show();
}
