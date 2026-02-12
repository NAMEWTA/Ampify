import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { I18n } from '../../common/i18n';
import { OpenCodeCopilotAuthConfigManager } from './core/configManager';
import { AuthSwitcher } from './core/authSwitcher';
import { OhMyProfileManager } from './core/ohMyProfileManager';
import { OpencodeSessionManager } from './core/opencodeSessionManager';

interface AddCredentialInput {
    name?: string;
    provider?: string;
    access?: string;
    refresh?: string;
    type?: string;
    expires?: string | number;
}

interface KillArgs {
    pid?: number;
    sessionId?: string;
}

export function registerOpenCodeCopilotAuth(context: vscode.ExtensionContext): void {
    const configManager = new OpenCodeCopilotAuthConfigManager();
    const authSwitcher = new AuthSwitcher();
    const ohMyManager = new OhMyProfileManager(configManager);
    const sessionManager = new OpencodeSessionManager(configManager);

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

    const importAllCredentialsIntoLibrary = (): number => {
        const entries = authSwitcher.importAllCredentials();
        for (const entry of entries) {
            const credential = configManager.upsertCredentialByProviderRefresh({
                provider: entry.provider,
                type: entry.type,
                access: entry.access,
                refresh: entry.refresh,
                expires: entry.expires,
                raw: entry.raw
            });
            configManager.setActiveByProvider(entry.provider, credential.id);
        }
        return entries.length;
    };

    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((terminal) => {
            configManager.removeManagedSessionsByTerminalName(terminal.name);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.opencodeAuth.add', async (values?: AddCredentialInput) => {
            const input = values || {};
            const provider = (input.provider || (await vscode.window.showInputBox({
                prompt: I18n.get('opencodeAuth.inputProvider'),
                value: 'github-copilot'
            })) || '').trim();
            if (!provider) {
                return;
            }

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

            const credential = configManager.addCredential(name, provider, type, access, refresh, expires);
            configManager.setActiveByProvider(provider, credential.id);
            await vscode.commands.executeCommand('ampify.mainView.refresh');
        }),

        // Import all provider entries from ~/.local/share/opencode/auth.json
        vscode.commands.registerCommand('ampify.opencodeAuth.import', async () => {
            try {
                const imported = importAllCredentialsIntoLibrary();
                if (imported === 0) {
                    vscode.window.showWarningMessage(I18n.get('opencodeAuth.importNotFound'));
                    return;
                }

                vscode.window.showInformationMessage(I18n.get('opencodeAuth.importAllSuccess', String(imported)));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Import opencode auth failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.importFailed'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.openAuthJson', async () => {
            try {
                const filePath = authSwitcher.ensureAuthJsonFile();
                const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                console.error('Open auth.json failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.openAuthJson'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.zeroConfig', async () => {
            try {
                importAllCredentialsIntoLibrary();
                authSwitcher.clearAllProviders();
                configManager.clearAllActiveByProvider();
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.zeroConfigSuccess'));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Zero config failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.zeroConfigFailed'));
            }
        }),

        // New canonical command: apply credential to auth.json provider entry (no startup side effects).
        vscode.commands.registerCommand('ampify.opencodeAuth.apply', async (credentialId: string) => {
            if (!credentialId) {
                return;
            }
            const credential = configManager.getCredentialById(credentialId);
            if (!credential) {
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.switchFailed'));
                return;
            }

            try {
                authSwitcher.applyCredential(credential);
                configManager.setActiveByProvider(credential.provider, credential.id);
                configManager.setLastSwitched(credential.id);
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.applySuccess', credential.name));
            } catch (error) {
                console.error('Apply opencode auth failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.switchFailed'));
            }

            await vscode.commands.executeCommand('ampify.mainView.refresh');
        }),

        // Backward compatible alias.
        vscode.commands.registerCommand('ampify.opencodeAuth.switch', async (credentialId: string) => {
            await vscode.commands.executeCommand('ampify.opencodeAuth.apply', credentialId);
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.switchNext', async () => {
            const nextId = getNextCredentialId();
            if (!nextId) {
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.noCredentials'));
                return;
            }
            await vscode.commands.executeCommand('ampify.opencodeAuth.apply', nextId);
        }),

        vscode.commands.registerCommand('ampify.opencodeAuth.clear', async (provider?: string) => {
            const targetProvider = (provider || 'github-copilot').trim();
            try {
                authSwitcher.clearProvider(targetProvider);
                configManager.clearActiveByProvider(targetProvider);
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.clearedProvider', targetProvider));
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
        }),

        vscode.commands.registerCommand('ampify.opencode.ohmy.import', async (profileName?: string) => {
            const name = (profileName || await vscode.window.showInputBox({
                prompt: I18n.get('opencodeAuth.ohmyInputName'),
                value: `oh-my-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`
            }) || '').trim();
            if (!name) {
                return;
            }

            try {
                const profile = ohMyManager.importCurrentProfile(name);
                configManager.setActiveOhMyProfile(profile.id);
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.ohmyImportSuccess', name));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Import oh-my-opencode failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.ohmyImportFailed'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencode.ohmy.apply', async (profileId: string) => {
            if (!profileId) {
                return;
            }
            try {
                const profile = ohMyManager.applyProfile(profileId);
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.ohmyApplySuccess', profile.name));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Apply oh-my-opencode failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.ohmyApplyFailed'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencode.ohmy.openConfig', async () => {
            try {
                const filePath = ohMyManager.getFilePath();
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    fs.writeFileSync(filePath, '{}\n', 'utf8');
                }
                const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                console.error('Open oh-my config failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.openOhMyConfig'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencode.session.start', async () => {
            try {
                const session = await sessionManager.startSession();
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.sessionStartSuccess', session.terminalName));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Start opencode session failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.sessionStartFailed'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencode.session.startInternal', async () => {
            try {
                const session = await sessionManager.startInternalSession();
                vscode.window.showInformationMessage(I18n.get('opencodeAuth.sessionStartInternalSuccess', session.terminalName));
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Start internal opencode session failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.sessionStartInternalFailed'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencode.session.open', async (sessionId: string) => {
            if (!sessionId) {
                return;
            }
            const opened = await sessionManager.openManagedSession(sessionId);
            if (!opened) {
                vscode.window.showWarningMessage(I18n.get('opencodeAuth.sessionOpenUnavailable'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencode.session.openInternal', async (sessionId: string) => {
            if (!sessionId) {
                return;
            }
            const opened = await sessionManager.openInternalSession(sessionId);
            if (!opened) {
                vscode.window.showWarningMessage(I18n.get('opencodeAuth.sessionOpenInternalUnavailable'));
            }
            await vscode.commands.executeCommand('ampify.mainView.refresh');
        }),

        vscode.commands.registerCommand('ampify.opencode.session.minimizeInternal', async (sessionId: string) => {
            if (!sessionId) {
                return;
            }
            try {
                const minimized = await sessionManager.minimizeInternalSession(sessionId);
                if (!minimized) {
                    vscode.window.showWarningMessage(I18n.get('opencodeAuth.sessionMinimizeInternalFailed'));
                }
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Minimize internal opencode session failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.sessionMinimizeInternalFailed'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencode.session.kill', async (args: KillArgs | number | string) => {
            try {
                const normalized = normalizeKillArgs(args);
                if (normalized.sessionId) {
                    await sessionManager.killManagedSession(normalized.sessionId);
                } else if (normalized.pid && normalized.pid > 0) {
                    await sessionManager.killByPid(normalized.pid);
                } else {
                    return;
                }
                await vscode.commands.executeCommand('ampify.mainView.refresh');
            } catch (error) {
                console.error('Kill opencode session failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.sessionKillFailed'));
            }
        }),

        vscode.commands.registerCommand('ampify.opencode.session.refresh', async () => {
            await sessionManager.getSessionViews();
            await vscode.commands.executeCommand('ampify.mainView.refresh');
        }),

        vscode.commands.registerCommand('ampify.opencode.session.openConfig', async () => {
            try {
                const filePath = configManager.getConfigPath();
                const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                console.error('Open session config failed:', error);
                vscode.window.showErrorMessage(I18n.get('opencodeAuth.openSessionConfig'));
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

function normalizeKillArgs(args: KillArgs | number | string): KillArgs {
    if (typeof args === 'number') {
        return { pid: args };
    }
    if (typeof args === 'string') {
        const maybePid = Number.parseInt(args, 10);
        if (!Number.isNaN(maybePid)) {
            return { pid: maybePid };
        }
        return { sessionId: args };
    }

    return args || {};
}
