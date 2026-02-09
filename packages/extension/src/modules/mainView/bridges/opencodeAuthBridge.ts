/**
 * OpenCode Copilot Auth 数据桥接
 * 将 OpenCode Copilot Auth 模块数据适配为 CardItem[]
 */
import * as vscode from 'vscode';
import type { TreeNode, ToolbarAction, CardItem } from '@ampify/shared';
import { OpenCodeCopilotAuthConfigManager } from '../../opencode-copilot-auth/core/configManager';
import { I18n } from '../../../common/i18n';

export class OpenCodeAuthBridge {
    private configManager: OpenCodeCopilotAuthConfigManager;

    constructor() {
        this.configManager = new OpenCodeCopilotAuthConfigManager();
    }

    getTreeData(): TreeNode[] {
        const nodes: TreeNode[] = [];
        const credentials = this.configManager.getCredentials();
        const activeId = this.configManager.getActiveId();

        if (credentials.length === 0) {
            nodes.push({
                id: 'opencode-empty',
                label: I18n.get('opencodeAuth.noCredentials'),
                iconId: 'info',
                nodeType: 'empty',
                command: 'ampify.opencodeAuth.add'
            });
        } else {
            for (const cred of credentials) {
                const isActive = cred.id === activeId;
                nodes.push({
                    id: `opencode-${cred.id}`,
                    label: cred.name,
                    subtitle: isActive ? I18n.get('opencodeAuth.active') : '',
                    iconId: isActive ? 'pass-filled' : 'key',
                    layout: 'twoLine',
                    nodeType: 'credentialItem',
                    pinnedActionId: 'switch',
                    collapsible: false,
                    tooltip: `${cred.name} (${cred.type || 'github-copilot'})`,
                    inlineActions: [
                        { id: 'switch', label: I18n.get('opencodeAuth.switch'), iconId: 'arrow-swap' },
                        { id: 'rename', label: I18n.get('opencodeAuth.rename'), iconId: 'edit' }
                    ],
                    contextActions: [
                        { id: 'delete', label: I18n.get('opencodeAuth.delete'), iconId: 'trash', danger: true }
                    ]
                });
            }
        }

        return nodes;
    }

    getCardData(): CardItem[] {
        const credentials = this.configManager.getCredentials();
        const activeId = this.configManager.getActiveId();

        return credentials.map(cred => {
            const isActive = cred.id === activeId;
            return {
                id: `opencode-${cred.id}`,
                name: cred.name,
                description: isActive ? I18n.get('opencodeAuth.active') : (cred.type || 'github-copilot'),
                badges: isActive ? [I18n.get('opencodeAuth.active')] : [],
                iconId: isActive ? 'pass-filled' : 'key',
                actions: [
                    { id: 'switch', label: I18n.get('opencodeAuth.switch'), iconId: 'arrow-swap' },
                    { id: 'rename', label: I18n.get('opencodeAuth.rename'), iconId: 'edit' },
                    { id: 'delete', label: I18n.get('opencodeAuth.delete'), iconId: 'trash', danger: true }
                ]
            };
        });
    }

    getToolbar(): ToolbarAction[] {
        return [
            { id: 'refresh', label: 'Refresh', iconId: 'refresh', command: 'ampify.mainView.refresh' },
            { id: 'add', label: I18n.get('opencodeAuth.add'), iconId: 'add', command: '', action: 'overlay' },
            { id: 'import', label: I18n.get('opencodeAuth.import'), iconId: 'cloud-download', command: 'ampify.opencodeAuth.import' },
            { id: 'switchNext', label: I18n.get('opencodeAuth.switchNext'), iconId: 'arrow-swap', command: 'ampify.opencodeAuth.switchNext' },
            { id: 'clear', label: I18n.get('opencodeAuth.clear'), iconId: 'close-all', command: 'ampify.opencodeAuth.clear' }
        ];
    }

    async executeAction(actionId: string, nodeId: string): Promise<void> {
        const credId = nodeId.replace('opencode-', '');

        switch (actionId) {
            case 'switch':
                await vscode.commands.executeCommand('ampify.opencodeAuth.switch', { credentialId: credId });
                break;
            case 'rename':
                await vscode.commands.executeCommand('ampify.opencodeAuth.rename', { credentialId: credId });
                break;
            case 'delete':
                await vscode.commands.executeCommand('ampify.opencodeAuth.delete', { credentialId: credId });
                break;
        }
    }

    getCredentialCount(): number {
        return this.configManager.getCredentials().length;
    }

    getActiveCredentialName(): string | undefined {
        const activeId = this.configManager.getActiveId();
        if (!activeId) return undefined;
        const cred = this.configManager.getCredentialById(activeId);
        return cred?.name;
    }
}
