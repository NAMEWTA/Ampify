/**
 * Launcher 数据桥接
 * 将 Launcher 模块数据适配为 TreeNode[]
 */
import * as vscode from 'vscode';
import { TreeNode, ToolbarAction } from '../protocol';
import { ConfigManager } from '../../launcher/core/configManager';
import { I18n } from '../../../common/i18n';
import { instanceKey } from '../../../extension';

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

        const activeKey = instanceKey || config.lastUsedKey;

        return entries.map(([key, instance]) => {
            const isActive = activeKey === key;
            const label = instance.description || key;
            const parts: string[] = [];

            if (isActive) {
                parts.push(I18n.get('launcher.active'));
            }

            if (instance.dirName && instance.dirName !== label) {
                parts.push(instance.dirName);
            }

            const lastUsedAt = instance.lastUsedAt ?? (config.lastUsedKey === key ? config.lastUsedAt : undefined);
            if (lastUsedAt) {
                parts.push(`${I18n.get('launcher.lastActive')}${formatTime(lastUsedAt)}`);
            } else {
                parts.push(`${I18n.get('launcher.lastActive')}—`);
            }

            return {
                id: `launcher-${key}`,
                label,
                description: parts.join(' · '),
                iconId: isActive ? 'pass-filled' : 'account',
                nodeType: 'instance',
                command: 'ampify.launcher.launch',
                commandArgs: JSON.stringify({ key, instance }),
                tooltip: `${label} (${instance.dirName})${isActive ? ` · ${I18n.get('launcher.active')}` : ''}`,
                inlineActions: [
                    { id: 'switch', label: I18n.get('launcher.switch'), iconId: 'arrow-swap' },
                    { id: 'delete', label: 'Delete', iconId: 'trash', danger: true }
                ]
            };
        });
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
            case 'switch':
            case 'launch':
                if (instance) {
                    // 构造与原 InstanceItem 兼容的对象
                    await vscode.commands.executeCommand('ampify.launcher.launch', {
                        label: instance.description || key,
                        description: instance.dirName,
                        instanceConfig: instance,
                        key: key
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

function formatTime(value?: number): string {
    if (!value) { return '—'; }
    try {
        return new Date(value).toLocaleString();
    } catch {
        return '—';
    }
}
