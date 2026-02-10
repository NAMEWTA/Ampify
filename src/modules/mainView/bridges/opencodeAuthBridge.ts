import * as vscode from 'vscode';
import { CardItem, TreeNode, ToolbarAction } from '../protocol';
import { I18n } from '../../../common/i18n';
import { OpenCodeCopilotAuthConfigManager } from '../../opencode-copilot-auth/core/configManager';

export class OpenCodeAuthBridge {
    private configManager: OpenCodeCopilotAuthConfigManager;

    constructor() {
        this.configManager = new OpenCodeCopilotAuthConfigManager();
    }

    getTreeData(): TreeNode[] {
        const nodes: TreeNode[] = [];
        const credentials = this.configManager.getCredentials();
        const activeId = this.configManager.getActiveId();
        const lastSwitchedAt = this.configManager.getLastSwitchedAt();

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
                const expiresLabel = formatExpires(cred.expires);
                const tokenLabel = maskToken(cred.access);
                const lastUsedAt = cred.lastUsedAt ?? (this.configManager.getLastSwitchedId() === cred.id ? lastSwitchedAt : undefined);
                const lastLabel = lastUsedAt ? formatTime(lastUsedAt) : '—';
                const parts: string[] = [];
                if (isActive) {
                    parts.push(I18n.get('opencodeAuth.active'));
                }
                parts.push(`${I18n.get('opencodeAuth.token')}${tokenLabel}`);
                parts.push(`${I18n.get('opencodeAuth.expires')}${expiresLabel}`);
                parts.push(`${I18n.get('opencodeAuth.lastActive')}${lastLabel}`);
                nodes.push({
                    id: `opencode-${cred.id}`,
                    label: cred.name,
                    description: parts.join(' · '),
                    iconId: isActive ? 'pass-filled' : 'key',
                    nodeType: 'credentialItem',
                    pinnedActionId: 'rename',
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
        const lastSwitchedAt = this.configManager.getLastSwitchedAt();

        return credentials.map(cred => {
            const isActive = cred.id === activeId;
            const expiresLabel = formatExpires(cred.expires);
            const tokenLabel = maskToken(cred.access);
            const lastUsedAt = cred.lastUsedAt ?? (this.configManager.getLastSwitchedId() === cred.id ? lastSwitchedAt : undefined);
            const lastLabel = lastUsedAt ? formatTime(lastUsedAt) : '—';
            const descriptionParts = [
                `${I18n.get('opencodeAuth.token')}${tokenLabel}`,
                `${I18n.get('opencodeAuth.expires')}${expiresLabel}`,
                `${I18n.get('opencodeAuth.lastActive')}${lastLabel}`
            ];
            return {
                id: `opencode-${cred.id}`,
                name: cred.name,
                description: (isActive ? `${I18n.get('opencodeAuth.active')} · ` : '') + descriptionParts.join(' · '),
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
                await vscode.commands.executeCommand('ampify.opencodeAuth.switch', credId);
                break;
            case 'delete':
                await vscode.commands.executeCommand('ampify.opencodeAuth.delete', credId);
                break;
            case 'rename':
                await vscode.commands.executeCommand('ampify.opencodeAuth.rename', credId);
                break;
        }
    }
}

function maskToken(value: string): string {
    if (!value) { return '—'; }
    const trimmed = value.trim();
    if (trimmed.length <= 12) { return trimmed; }
    return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

function formatExpires(value: number): string {
    if (!value) { return '—'; }
    let ts = value;
    if (value < 1e11) {
        ts = value * 1000;
    }
    try {
        return new Date(ts).toLocaleDateString();
    } catch {
        return '—';
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
