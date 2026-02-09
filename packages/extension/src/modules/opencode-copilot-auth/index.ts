import * as vscode from 'vscode';
import { I18n } from '../../common/i18n';
import { OpenCodeCopilotAuthConfigManager } from './core/configManager';
import { AuthSwitcher } from './core/authSwitcher';

const TERMINAL_NAME = 'opencode';

interface AddCredentialInput {
    name?: string;
    access?: string;
    refresh?: string;
    type?: string;
    expires?: string | number;
}

export function registerOpenCodeCopilotAuth(context: vscode.ExtensionContext): void {
    const configManager = new OpenCodeCopilotAuthConfigManager();
    const authSwitcher = new AuthSwitcher();

    const getNextCredentialId = (): string | undefined => {
        const credentials = configManager.getCredentials();
        if (credentials.length === 0) {
            return undefined;
        }
        const lastId = configManager.getLastSwitchedId() || configManager.getActiveId();
        const lastIndex = lastId ? credentials.findIndex((cred) => cred.id === lastId) : -1;
        const nextIndex = (lastIndex + 1) % credentials.length;
        return credentials[nextIndex]?.id;
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.opencodeAuth.add', async (values?: AddCredentialInput) => {
            const input = values || {};
            const name = (input.name || (await vscode.window.showInputBox({ prompt: I18n.get('opencodeAuth.inputName') })) || '').trim();
            if (!name) {
                return;
            }

            const access = (input.access || (await vscode.window.showInputBox({ prompt: I18n.get('opencodeAuth.inputAccess') })) || '').trim();
            if (!access) {
                return;
            }

            const refresh = (input.refresh || (await vscode.window.showInputBox({ prompt: I18n.get('opencodeAuth.inputRefresh') })) || '').trim();
            if (!refresh) {
                return;
            }

            const type = (input.type || 'oauth').trim() || 'oauth';
            const expires = normalizeExpires(input.expires);

            configManager.addCredential(name, type, access, refresh, expires);
            await vscode.commands.executeCommand('ampify.mainView.refresh');
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.import', async () => {
            try {
                const entry = authSwitcher.importCurrentCredential();
                if (!entry) {
                    vscode.window.showWarningMessage(I18n.get('opencodeAuth.importNotFound'));
                    return;
                }
                const credentials = configManager.getCredentials();
                const exists = credentials.find((cred) => cred.access === entry.access);
                if (exists) {
                    vscode.window.showInformationMessage(I18n.get('opencodeAuth.importExists', exists.name));
                    return;
                }
                const name = await vscode.window.showInputBox({ prompt: I18n.get('opencodeAuth.inputName') });
                if (!name) {
                    return;
                }
                configManager.addCredential(name, entry.type, entry.access, entry.refresh, entry.expires);
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.importSuccess', name));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Import opencode auth failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.importFailed'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.switch', async (credentialId: string) => {
            if (!credentialId) {
                return;
            }
            const credential = configManager.getCredentialById(credentialId);
            if (!credential) {
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.switchFailed'));
                return;
            }
            try {
                authSwitcher.switchCredential(credential);
                configManager.setActiveId(credential.id);
                configManager.setLastSwitched(credential.id);
                await launchOpenCodeTerminal();
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.switchSuccess', credential.name));
            } catch (error) {
                console.error('Switch opencode auth failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.switchFailed'));
            }
            await vscode.commands.executeCommand('ampify.mainView.refresh');
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.switchNext', async () => {
            const nextId = getNextCredentialId();
            if (!nextId) {
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.noCredentials'));
                return;
            }
            await vscode.commands.executeCommand('ampify.opencodeAuth.switch', nextId);
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.clear', async () => {
            try {
                authSwitcher.clearCredential();
                await launchOpenCodeTerminal();
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.cleared'));
            } catch (error) {
                console.error('Clear opencode auth failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.clearFailed'));
            }
            await vscode.commands.executeCommand('ampify.mainView.refresh');
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.delete', async (credentialId: string) => {
            if (!credentialId) {
                return;
            }
            const credential = configManager.getCredentialById(credentialId);
            if (!credential) {
                return;
            }
            const removed = configManager.removeCredential(credentialId);
            if (removed) {
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.deleted', credential.name));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.rename', async (credentialId: string) => {
            if (!credentialId) {
                return;
            }
            const current = configManager.getCredentialById(credentialId);
            if (!current) {
                return;
            }
            const name = await vscode.window.showInputBox({
                prompt: I18n.get('opencodeAuth.inputName'),
                value: current.name
            });
            if (!name) {
                return;
            }
            const renamed = configManager.renameCredential(credentialId, name.trim());
            if (renamed) {
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.renamed', name.trim()));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    console.log('Module "OpenCode Copilot Auth" loaded');
}

function normalizeExpires(value?: string | number): number {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

async function launchOpenCodeTerminal(): Promise<void> {
    const existing = vscode.window.terminals.find((t) => t.name === TERMINAL_NAME);
    if (existing) {
        existing.dispose();
    }

    const terminal = vscode.window.createTerminal({ name: TERMINAL_NAME });
    terminal.show();
    terminal.sendText('opencode');
}
