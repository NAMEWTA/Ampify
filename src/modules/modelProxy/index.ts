/**
 * Model Proxy 模块入口
 * 注册命令并管理代理服务器生命周期
 * 支持多 API Key 绑定，每个 Key 对应一个特定模型
 */
import * as vscode from 'vscode';
import { ProxyConfigManager } from './core/proxyConfigManager';
import { ProxyServer } from './core/proxyServer';
import { ModelBridge } from './core/modelBridge';
import { LogManager } from './core/logManager';
import { I18n } from '../../common/i18n';
import { ensureDir } from '../../common/paths';

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

        vscode.commands.registerCommand('ampify.modelProxy.copyKey', async () => {
            const bindings = configManager.getBindings();
            if (bindings.length === 0) {
                vscode.window.showWarningMessage(I18n.get('modelProxy.noBindings'));
                return;
            }
            if (bindings.length === 1) {
                void vscode.env.clipboard.writeText(bindings[0].apiKey);
                vscode.window.showInformationMessage(I18n.get('modelProxy.keyCopied'));
                return;
            }
            // 多个绑定时让用户选择
            const items = bindings.map(b => ({
                label: b.label,
                description: b.modelId,
                detail: `Key: ${b.apiKey.slice(0, 8)}...${b.apiKey.slice(-4)}`,
                binding: b
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: I18n.get('modelProxy.selectBindingToCopy')
            });
            if (selected) {
                void vscode.env.clipboard.writeText(selected.binding.apiKey);
                vscode.window.showInformationMessage(I18n.get('modelProxy.keyCopied'));
            }
        }),

        vscode.commands.registerCommand('ampify.modelProxy.regenerateKey', async () => {
            const bindings = configManager.getBindings();
            if (bindings.length === 0) {
                vscode.window.showWarningMessage(I18n.get('modelProxy.noBindings'));
                return;
            }
            // 选择要重新生成的绑定
            let bindingId: string;
            if (bindings.length === 1) {
                bindingId = bindings[0].id;
            } else {
                const items = bindings.map(b => ({
                    label: b.label,
                    description: b.modelId,
                    detail: `Key: ${b.apiKey.slice(0, 8)}...${b.apiKey.slice(-4)}`,
                    bindingId: b.id
                }));
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: I18n.get('modelProxy.selectBindingToRegenerate')
                });
                if (!selected) { return; }
                bindingId = selected.bindingId;
            }
            const answer = await vscode.window.showWarningMessage(
                I18n.get('modelProxy.confirmRegenerate'),
                { modal: true },
                I18n.get('skills.yes')
            );
            if (answer === I18n.get('skills.yes')) {
                configManager.regenerateBindingKey(bindingId);
                vscode.window.showInformationMessage(I18n.get('modelProxy.keyRegenerated'));
            }
        }),

        vscode.commands.registerCommand('ampify.modelProxy.copyBaseUrl', () => {
            const config = configManager.getConfig();
            const url = `http://${config.bindAddress}:${configManager.getPort()}`;
            void vscode.env.clipboard.writeText(url);
            vscode.window.showInformationMessage(I18n.get('modelProxy.urlCopied'));
        }),

        vscode.commands.registerCommand('ampify.modelProxy.addBinding', async () => {
            if (!modelBridge) { return; }
            const models = modelBridge.getAvailableModels();
            if (models.length === 0) {
                vscode.window.showWarningMessage(I18n.get('modelProxy.noModels'));
                return;
            }

            // 选择模型
            const items = models.map(m => ({
                label: m.name || m.id,
                description: `${m.vendor} · ${m.family}`,
                detail: `ID: ${m.id} | Max tokens: ${m.maxInputTokens}`,
                modelId: m.id
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: I18n.get('modelProxy.selectModel')
            });
            if (!selected) { return; }

            // 输入别名
            const label = await vscode.window.showInputBox({
                prompt: I18n.get('modelProxy.bindingLabelPrompt'),
                value: selected.label
            });
            if (!label) { return; }

            const binding = configManager.addBinding(selected.modelId, label);
            vscode.window.showInformationMessage(I18n.get('modelProxy.bindingCreated', label));

            // 自动复制新 Key 到剪贴板
            void vscode.env.clipboard.writeText(binding.apiKey);
            vscode.window.showInformationMessage(I18n.get('modelProxy.keyCopied'));
        }),

        vscode.commands.registerCommand('ampify.modelProxy.removeBinding', async () => {
            const bindings = configManager.getBindings();
            if (bindings.length === 0) {
                vscode.window.showWarningMessage(I18n.get('modelProxy.noBindings'));
                return;
            }

            const items = bindings.map(b => ({
                label: b.label,
                description: b.modelId,
                detail: `Key: ${b.apiKey.slice(0, 8)}...${b.apiKey.slice(-4)}`,
                bindingId: b.id
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: I18n.get('modelProxy.selectBindingToRemove')
            });
            if (!selected) { return; }

            const answer = await vscode.window.showWarningMessage(
                I18n.get('modelProxy.confirmRemoveBinding', selected.label),
                { modal: true },
                I18n.get('skills.yes')
            );
            if (answer === I18n.get('skills.yes')) {
                configManager.removeBinding(selected.bindingId);
                vscode.window.showInformationMessage(I18n.get('modelProxy.bindingRemoved', selected.label));
            }
        }),

        // 保留 selectModel 作为 addBinding 的别名
        vscode.commands.registerCommand('ampify.modelProxy.selectModel', async () => {
            await vscode.commands.executeCommand('ampify.modelProxy.addBinding');
        }),

        vscode.commands.registerCommand('ampify.modelProxy.viewLogs', async () => {
            // 打开当前实例的日志目录（确保目录存在，否则 revealFileInOS 静默失败）
            const logsDir = logManager ? logManager.getInstanceLogsDir() : configManager.getLogsDir();
            ensureDir(logsDir);
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

    // 检查是否有绑定
    const bindings = configManager.getBindings();
    if (bindings.length === 0) {
        vscode.window.showWarningMessage(I18n.get('modelProxy.noBindings'));
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
        const configManager = ProxyConfigManager.getInstance();
        const bindingCount = configManager.getBindings().length;
        statusBarItem.text = `$(radio-tower) Proxy :${port || '?'} [${bindingCount}]`;
        statusBarItem.tooltip = `Model Proxy: Running — ${bindingCount} binding(s) — Click to stop`;
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = '$(radio-tower) Proxy Off';
        statusBarItem.tooltip = 'Model Proxy: Stopped — Click to start';
        statusBarItem.backgroundColor = undefined;
    }
    statusBarItem.show();
}
