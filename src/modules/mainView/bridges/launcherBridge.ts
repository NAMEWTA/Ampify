/**
 * Launcher 数据桥接
 * 将 Launcher 模块数据适配为 TreeNode[]
 */
import * as vscode from 'vscode';
import { TreeNode, ToolbarAction } from '../protocol';
import { ConfigManager } from '../../launcher/core/configManager';
import { I18n } from '../../../common/i18n';

export class LauncherBridge {
    private configManager: ConfigManager;

    constructor() {
        this.configManager = new ConfigManager();
    }

    getTreeData(): TreeNode[] {
        const config = this.configManager.getConfig();
        const entries = Object.entries(config.instances);

        if (entries.length === 0) {
            return [{
                id: 'launcher-empty',
                label: I18n.get('launcher.noInstances'),
                description: I18n.get('launcher.addInstancePlaceholder'),
                iconId: 'info',
                nodeType: 'empty',
                command: 'ampify.launcher.add'
            }];
        }

        return entries.map(([key, instance]) => ({
            id: `launcher-${key}`,
            label: instance.description || key,
            description: instance.dirName,
            iconId: 'account',
            nodeType: 'instance',
            command: 'ampify.launcher.launch',
            commandArgs: JSON.stringify({ key, instance }),
            tooltip: `${instance.description || key} (${instance.dirName})`,
            inlineActions: [
                { id: 'launch', label: 'Launch', iconId: 'rocket' },
                { id: 'delete', label: 'Delete', iconId: 'trash', danger: true }
            ]
        }));
    }

    getToolbar(): ToolbarAction[] {
        return [
            { id: 'add', label: 'Add Instance', iconId: 'add', command: '', action: 'overlay' },
            { id: 'refresh', label: 'Refresh', iconId: 'refresh', command: 'ampify.launcher.refresh' },
            { id: 'editConfig', label: 'Edit Config', iconId: 'settings-gear', command: 'ampify.launcher.editConfig' }
        ];
    }

    async executeAction(actionId: string, nodeId: string): Promise<void> {
        const key = nodeId.replace('launcher-', '');
        const config = this.configManager.getConfig();
        const instance = config.instances[key];

        switch (actionId) {
            case 'launch':
                if (instance) {
                    // 构造与原 InstanceItem 兼容的对象
                    await vscode.commands.executeCommand('ampify.launcher.launch', {
                        label: instance.description || key,
                        description: instance.dirName,
                        instanceConfig: instance,
                        key
                    });
                }
                break;
            case 'delete':
                if (instance) {
                    await vscode.commands.executeCommand('ampify.launcher.delete', {
                        label: instance.description || key,
                        description: instance.dirName,
                        instanceConfig: instance,
                        key
                    });
                }
                break;
        }
    }
}
