import * as vscode from 'vscode';
import { ConfigManager } from './core/configManager';
import { ProcessEngine } from './core/processEngine';
import { InstanceTreeProvider, InstanceItem } from './views/instanceTreeProvider';
import { I18n } from '../../common/i18n';

export function registerLauncher(context: vscode.ExtensionContext) {
    const configManager = new ConfigManager();
    const processEngine = new ProcessEngine(configManager);
    const treeProvider = new InstanceTreeProvider(configManager);

    vscode.window.registerTreeDataProvider('ampify-launcher-instances', treeProvider);

    // Launch
    context.subscriptions.push(vscode.commands.registerCommand('ampify.launcher.launch', (item: InstanceItem) => {
        if (item && item.instanceConfig) {
            processEngine.launch(item.instanceConfig);
        }
    }));

    // Refresh
    context.subscriptions.push(vscode.commands.registerCommand('ampify.launcher.refresh', () => {
        treeProvider.refresh();
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
        treeProvider.refresh();
    }));

    // Delete Instance
    context.subscriptions.push(vscode.commands.registerCommand('ampify.launcher.delete', async (item: InstanceItem) => {
        if (!item) return;
        const confirm = await vscode.window.showWarningMessage(I18n.get('launcher.confirmDelete', item.label), 'Yes', 'No');
        if (confirm === 'Yes') {
            const config = configManager.getConfig();
            delete config.instances[item.key];
            configManager.saveConfig(config);
            treeProvider.refresh();
        }
    }));
    
    console.log('Module "Launcher" loaded');
}
