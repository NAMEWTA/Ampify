import * as vscode from 'vscode';
import { ConfigManager } from './core/configManager';
import { ProcessEngine } from './core/processEngine';
import { I18n } from '../../common/i18n';

interface InstanceItemLike {
    label: string;
    description?: string;
    instanceConfig?: {
        dirName: string;
        description: string;
        vscodeArgs: string[];
        defaultProject?: string;
    };
    key: string;
}

export function registerLauncher(context: vscode.ExtensionContext) {
    const configManager = new ConfigManager();
    const processEngine = new ProcessEngine(configManager);

    // TreeView 已由 mainView 模块统一管理

    // Launch
    context.subscriptions.push(vscode.commands.registerCommand('ampify.launcher.launch', (item: InstanceItemLike) => {
        if (item && item.instanceConfig) {
            processEngine.launch(item.instanceConfig);
        }
    }));

    // Refresh (由 mainView 统一刷新)
    context.subscriptions.push(vscode.commands.registerCommand('ampify.launcher.refresh', () => {
        // 刷新由 mainView 处理
    }));
    
    // Open Config
    context.subscriptions.push(vscode.commands.registerCommand('ampify.launcher.editConfig', () => {
        vscode.workspace.openTextDocument(configManager.getConfigPath()).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }));

    // Add Instance
    context.subscriptions.push(vscode.commands.registerCommand('ampify.launcher.add', async () => {
        const name = await vscode.window.showInputBox({ prompt: I18n.get('launcher.inputKey') });
        if (!name) return;
        
        const dirName = await vscode.window.showInputBox({ prompt: I18n.get('launcher.inputDirName'), value: `github-${name}` });
        if (!dirName) return;

        const desc = await vscode.window.showInputBox({ prompt: I18n.get('launcher.inputDesc'), value: `${name} Account` });
        if (!desc) return;

        const config = configManager.getConfig();
        config.instances[name] = {
            dirName,
            description: desc,
            vscodeArgs: ["--new-window"]
        };
        configManager.saveConfig(config);
        vscode.commands.executeCommand('ampify.mainView.refresh');
    }));

    // Delete Instance
    context.subscriptions.push(vscode.commands.registerCommand('ampify.launcher.delete', async (item: InstanceItemLike) => {
        if (!item) return;
        const confirm = await vscode.window.showWarningMessage(I18n.get('launcher.confirmDelete', item.label), 'Yes', 'No');
        if (confirm === 'Yes') {
            const config = configManager.getConfig();
            delete config.instances[item.key];
            configManager.saveConfig(config);
            vscode.commands.executeCommand('ampify.mainView.refresh');
        }
    }));
    
    console.log('Module "Launcher" loaded');
}
