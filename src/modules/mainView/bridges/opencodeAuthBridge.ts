import * as vscode from 'vscode';
import { TreeNode, ToolbarAction } from '../protocol';
import { I18n } from '../../../common/i18n';
import { OpenCodeCopilotAuthConfigManager } from '../../opencode-copilot-auth/core/configManager';

export class OpenCodeAuthBridge {
    private configManager: OpenCodeCopilotAuthConfigManager;

    constructor() {
        this.configManager = new OpenCodeCopilotAuthConfigManager();
    }

    getTreeData(): TreeNode[] {
        const credentials = this.configManager.getCredentials();
        const activeId = this.configManager.getActiveId();

        if (credentials.length === 0) {
            return [{
                id: 'opencode-auth-empty',
                label: I18n.get('opencodeAuth.noCredentials'),
                description: I18n.get('opencodeAuth.addCredential'),
                iconId: 'info',
                nodeType: 'empty',
                command: 'ampify.opencodeAuth.add'
            }];
        }

        return credentials.map((cred) => {
            const isActive = activeId === cred.id;
            const descParts = [maskToken(cred.access)];
            if (isActive) {
                descParts.push(I18n.get('opencodeAuth.active'));
            }
            return {
                id: cred.id,
                label: cred.name,
                description: descParts.join(' · '),
                iconId: 'key',
                iconColor: isActive ? '#6a9bcc' : undefined,
                nodeType: 'credential',
                inlineActions: [
                    { id: 'switch', label: 'Switch & Launch', iconId: 'play' },
                    { id: 'delete', label: 'Delete', iconId: 'trash', danger: true }
                ],
                contextActions: [
                    { id: 'rename', label: 'Rename', iconId: 'edit' },
                    { id: 'delete', label: 'Delete', iconId: 'trash', danger: true }
                ]
            } as TreeNode;
        });
    }

    getToolbar(): ToolbarAction[] {
        return [
            { id: 'add', label: I18n.get('opencodeAuth.addCredential'), iconId: 'add', command: '', action: 'overlay' },
            { id: 'import', label: I18n.get('opencodeAuth.importCurrent'), iconId: 'cloud-download', command: 'ampify.opencodeAuth.import' },
            { id: 'clear', label: I18n.get('opencodeAuth.clear'), iconId: 'circle-slash', command: 'ampify.opencodeAuth.clear' }
        ];
    }

    async executeAction(actionId: string, nodeId: string): Promise<void> {
        switch (actionId) {
            case 'switch':
                await vscode.commands.executeCommand('ampify.opencodeAuth.switch', nodeId);
                break;
            case 'delete':
                await vscode.commands.executeCommand('ampify.opencodeAuth.delete', nodeId);
                break;
            case 'rename':
                await vscode.commands.executeCommand('ampify.opencodeAuth.rename', nodeId);
                break;
        }
    }
}

function maskToken(token: string): string {
    if (!token) {
        return '';
    }
    if (token.length <= 8) {
        return token;
    }
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
}
