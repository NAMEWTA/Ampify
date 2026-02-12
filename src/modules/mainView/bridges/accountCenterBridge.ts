import * as vscode from 'vscode';
import { ConfigManager as LauncherConfigManager } from '../../launcher/core/configManager';
import { I18n } from '../../../common/i18n';
import {
    AccountCenterData,
    AccountCenterRow,
    AccountCenterTabData,
    AccountCenterTabId,
    ToolbarAction
} from '../protocol';
import { OpenCodeCopilotAuthConfigManager } from '../../opencode-copilot-auth/core/configManager';
import { AuthSwitcher } from '../../opencode-copilot-auth/core/authSwitcher';
import { OhMyProfileManager } from '../../opencode-copilot-auth/core/ohMyProfileManager';
import { OpencodeSessionManager, OpencodeSessionView } from '../../opencode-copilot-auth/core/opencodeSessionManager';

export class AccountCenterBridge {
    private launcherConfig = new LauncherConfigManager();
    private authConfig = new OpenCodeCopilotAuthConfigManager();
    private authSwitcher = new AuthSwitcher();
    private ohMyManager = new OhMyProfileManager(this.authConfig);
    private sessionManager = new OpencodeSessionManager(this.authConfig);
    private activeTab: AccountCenterTabId = 'launcher';
    private lastSessionViews: OpencodeSessionView[] = [];

    setActiveTab(tab: AccountCenterTabId): void {
        this.activeTab = tab;
    }

    getActiveTab(): AccountCenterTabId {
        return this.activeTab;
    }

    async getData(): Promise<AccountCenterData> {
        const launcherCount = Object.keys(this.launcherConfig.getConfig().instances).length;
        const authCount = this.authConfig.getCredentials().length;
        const ohMyCount = this.authConfig.getOhMyProfiles().length;
        const activeByProvider = this.authConfig.getActiveByProviderMap();
        const credentialIds = new Set(this.authConfig.getCredentials().map((cred) => cred.id));
        const activeProviders = Object.entries(activeByProvider)
            .filter(([, credentialId]) => typeof credentialId === 'string' && credentialIds.has(credentialId))
            .map(([provider]) => provider)
            .sort();

        let launcherRows: AccountCenterRow[] = [];
        let authRows: AccountCenterRow[] = [];
        let ohMyRows: AccountCenterRow[] = [];
        let sessionRows: AccountCenterRow[] = [];

        switch (this.activeTab) {
            case 'launcher':
                launcherRows = this.buildLauncherRows();
                break;
            case 'auth':
                authRows = this.buildAuthRows();
                break;
            case 'ohmy':
                ohMyRows = this.buildOhMyRows();
                break;
            case 'sessions':
                sessionRows = await this.buildSessionRows();
                break;
        }

        const currentInfo = this.ohMyManager.readCurrentInfo();
        const activeOhMyId = this.ohMyManager.resolveCurrentProfileId();
        const activeOhMy = activeOhMyId ? this.authConfig.getOhMyProfileById(activeOhMyId) : undefined;
        const sessionCount = this.lastSessionViews.filter((item) => item.status === 'running').length;

        const sections: Record<AccountCenterTabId, AccountCenterTabData> = {
            launcher: {
                id: 'launcher',
                emptyText: I18n.get('launcher.noInstances'),
                rows: launcherRows
            },
            auth: {
                id: 'auth',
                emptyText: I18n.get('opencodeAuth.noCredentials'),
                rows: authRows
            },
            ohmy: {
                id: 'ohmy',
                emptyText: I18n.get('opencodeAuth.ohmyNoProfiles'),
                rows: ohMyRows
            },
            sessions: {
                id: 'sessions',
                emptyText: I18n.get('opencodeAuth.sessionNoRunning'),
                rows: sessionRows
            }
        };

        const tabs = [
            {
                id: 'launcher' as const,
                label: I18n.get('accountCenter.tabLauncher'),
                count: launcherCount,
                domain: 'github' as const
            },
            {
                id: 'auth' as const,
                label: I18n.get('accountCenter.tabAuth'),
                count: authCount,
                domain: 'opencode' as const
            },
            {
                id: 'ohmy' as const,
                label: I18n.get('accountCenter.tabOhMy'),
                count: ohMyCount,
                domain: 'opencode' as const
            },
            {
                id: 'sessions' as const,
                label: I18n.get('accountCenter.tabSessions'),
                count: sessionCount,
                domain: 'opencode' as const
            }
        ];

        return {
            title: I18n.get('accountCenter.title'),
            activeTab: this.activeTab,
            tabs,
            dashboard: {
                providerCount: this.authSwitcher.getProviderCount(),
                activeProviders,
                activeOhMyName: activeOhMy?.name,
                activeOhMyHash: currentInfo.contentHash?.slice(0, 12),
                modelCount: currentInfo.modelIds.length,
                models: currentInfo.modelIds
            },
            labels: {
                dashboardProviders: I18n.get('accountCenter.dashboardProviders'),
                dashboardActiveProviders: I18n.get('accountCenter.dashboardActiveProviders'),
                dashboardActiveOhMy: I18n.get('accountCenter.dashboardActiveOhMy'),
                dashboardModels: I18n.get('accountCenter.dashboardModels'),
                dashboardModelsMeaningTitle: I18n.get('accountCenter.dashboardModelsMeaningTitle'),
                dashboardModelsMeaningDesc: I18n.get('accountCenter.dashboardModelsMeaningDesc'),
                emptyData: I18n.get('accountCenter.emptyData'),
                groupGithub: I18n.get('accountCenter.groupGithub'),
                groupOpenCode: I18n.get('accountCenter.groupOpenCode'),
                toolbarRefresh: I18n.get('accountCenter.toolbarRefresh'),
                toolbarOpenConfig: I18n.get('accountCenter.toolbarOpenConfig'),
                toolbarActions: I18n.get('accountCenter.toolbarActions'),
                authZeroConfig: I18n.get('accountCenter.authZeroConfig'),
                sourceManaged: I18n.get('accountCenter.sourceManaged'),
                sourceExternal: I18n.get('accountCenter.sourceExternal')
            },
            sections,
            toolbar: this.getToolbarByActiveTab()
        };
    }

    async executeAction(actionId: string, rowId?: string): Promise<void> {
        switch (this.activeTab) {
            case 'launcher':
                await this.executeLauncherAction(actionId, rowId);
                break;
            case 'auth':
                await this.executeAuthAction(actionId, rowId);
                break;
            case 'ohmy':
                await this.executeOhMyAction(actionId, rowId);
                break;
            case 'sessions':
                await this.executeSessionAction(actionId, rowId);
                break;
        }
    }

    private getToolbarByActiveTab(): ToolbarAction[] {
        switch (this.activeTab) {
            case 'launcher':
                return [
                    { id: 'openConfig', label: I18n.get('accountCenter.toolbarOpenConfig'), iconId: 'go-to-file', command: '' },
                    { id: 'addLauncher', label: I18n.get('accountCenter.addLauncher'), iconId: 'add', command: '' },
                    { id: 'refresh', label: I18n.get('accountCenter.toolbarRefresh'), iconId: 'refresh', command: '' }
                ];
            case 'auth':
                return [
                    { id: 'openConfig', label: I18n.get('accountCenter.toolbarOpenConfig'), iconId: 'go-to-file', command: '' },
                    { id: 'zeroConfig', label: I18n.get('accountCenter.authZeroConfig'), iconId: 'discard', command: '' },
                    { id: 'addCredential', label: I18n.get('opencodeAuth.add'), iconId: 'add', command: '' },
                    { id: 'importCredentials', label: I18n.get('opencodeAuth.import'), iconId: 'cloud-download', command: '' },
                    { id: 'refresh', label: I18n.get('accountCenter.toolbarRefresh'), iconId: 'refresh', command: '' }
                ];
            case 'ohmy':
                return [
                    { id: 'openConfig', label: I18n.get('accountCenter.toolbarOpenConfig'), iconId: 'go-to-file', command: '' },
                    { id: 'importOhMy', label: I18n.get('accountCenter.importOhMy'), iconId: 'cloud-download', command: '' },
                    { id: 'refresh', label: I18n.get('accountCenter.toolbarRefresh'), iconId: 'refresh', command: '' }
                ];
            case 'sessions':
                return [
                    { id: 'openConfig', label: I18n.get('accountCenter.toolbarOpenConfig'), iconId: 'go-to-file', command: '' },
                    { id: 'startSession', label: I18n.get('accountCenter.startSession'), iconId: 'play', command: '' },
                    { id: 'refreshSessions', label: I18n.get('accountCenter.refreshSessions'), iconId: 'refresh', command: '' }
                ];
        }
    }

    private buildLauncherRows(): AccountCenterRow[] {
        const config = this.launcherConfig.getConfig();
        const activeKey = config.lastUsedKey;

        return Object.entries(config.instances).map(([key, instance]) => {
            const active = activeKey === key;
            const lastUsed = instance.lastUsedAt
                ? new Date(instance.lastUsedAt).toLocaleString()
                : '—';

            return {
                id: `launcher:${key}`,
                name: key,
                description: instance.description || instance.dirName,
                subtitle: `${instance.dirName} · ${I18n.get('launcher.lastActive')}${lastUsed}`,
                status: active ? 'active' : 'inactive',
                domain: 'github',
                source: 'internal',
                actions: [
                    { id: 'launch', label: I18n.get('launcher.switch'), iconId: 'arrow-swap' },
                    { id: 'delete', label: I18n.get('opencodeAuth.delete'), iconId: 'trash', danger: true }
                ]
            };
        });
    }

    private buildAuthRows(): AccountCenterRow[] {
        const credentials = [...this.authConfig.getCredentials()].sort((a, b) => {
            const providerCompare = a.provider.localeCompare(b.provider);
            if (providerCompare !== 0) {
                return providerCompare;
            }
            return a.name.localeCompare(b.name);
        });
        const activeMap = this.authConfig.getActiveByProviderMap();

        return credentials.map((cred) => {
            const isActive = activeMap[cred.provider] === cred.id;
            const expires = formatExpires(cred.expires);
            const access = maskToken(cred.access);
            return {
                id: `auth:${cred.id}`,
                name: cred.name,
                description: cred.provider,
                subtitle: `${I18n.get('opencodeAuth.token')}${access} · ${I18n.get('opencodeAuth.expires')}${expires}`,
                status: isActive ? 'active' : 'inactive',
                domain: 'opencode',
                source: 'internal',
                actions: [
                    { id: 'apply', label: I18n.get('opencodeAuth.apply'), iconId: 'check' },
                    { id: 'unapply', label: I18n.get('opencodeAuth.unapply'), iconId: 'circle-slash', disabled: !isActive },
                    { id: 'rename', label: I18n.get('opencodeAuth.rename'), iconId: 'edit' },
                    { id: 'delete', label: I18n.get('opencodeAuth.delete'), iconId: 'trash', danger: true }
                ]
            };
        });
    }

    private buildOhMyRows(): AccountCenterRow[] {
        const profiles = this.authConfig.getOhMyProfiles();
        const activeId = this.ohMyManager.resolveCurrentProfileId();

        return [...profiles]
            .sort((a, b) => b.importedAt - a.importedAt)
            .map((profile) => {
                const active = profile.id === activeId;
                return {
                    id: `ohmy:${profile.id}`,
                    name: profile.name,
                    description: `${I18n.get('accountCenter.hash')} ${profile.contentHash.slice(0, 12)}`,
                    subtitle: `${I18n.get('accountCenter.importedAt')} ${new Date(profile.importedAt).toLocaleString()}`,
                    status: active ? 'active' : 'inactive',
                    domain: 'opencode',
                    source: 'internal',
                    actions: [
                        { id: 'apply', label: I18n.get('opencodeAuth.apply'), iconId: 'check' }
                    ]
                };
            });
    }

    private async buildSessionRows(): Promise<AccountCenterRow[]> {
        this.lastSessionViews = await this.sessionManager.getSessionViews();
        return this.mapSessionViewsToRows(this.lastSessionViews);
    }

    private mapSessionViewsToRows(views: OpencodeSessionView[]): AccountCenterRow[] {
        return views.map((session) => {
            const startedAt = session.startedAt ? new Date(session.startedAt).toLocaleString() : '—';
            const rowId = `session:managed:${session.managedSessionId || session.id}`;
            const providers = session.activeProvidersSnapshot && session.activeProvidersSnapshot.length > 0
                ? session.activeProvidersSnapshot.join(', ')
                : '-';
            const ohMy = session.activeOhMyNameSnapshot || '-';
            const workspace = session.workspace || '-';
            const command = session.command || '-';

            const actions = [];
            if (session.source === 'managed' && session.managedSessionId) {
                if (session.launchMode === 'externalTerminal' && session.openable) {
                    actions.push({ id: 'open', label: I18n.get('accountCenter.openTerminal'), iconId: 'terminal' });
                }
            }
            if (session.status === 'running') {
                actions.push({ id: 'kill', label: I18n.get('accountCenter.killSession'), iconId: 'debug-stop', danger: true });
            }

            const badges = [
                I18n.get('accountCenter.sourceManaged'),
                I18n.get('accountCenter.sessionModeExternal')
            ];

            return {
                id: rowId,
                name: session.name,
                description: session.pid > 0 ? `PID ${session.pid}` : 'PID —',
                subtitle: `${I18n.get('accountCenter.sessionStartedAt')}${startedAt}`,
                metaItems: [
                    { label: I18n.get('accountCenter.sessionProvidersLabel'), value: providers },
                    { label: I18n.get('accountCenter.sessionOhMyLabel'), value: ohMy },
                    { label: I18n.get('accountCenter.sessionWorkspace'), value: workspace },
                    { label: I18n.get('accountCenter.sessionCommand'), value: command, mono: true, full: true }
                ],
                status: session.status,
                badges,
                domain: 'opencode',
                source: session.source,
                launchMode: session.launchMode,
                pid: session.pid,
                actions
            };
        });
    }

    private async executeLauncherAction(actionId: string, rowId?: string): Promise<void> {
        if (actionId === 'openConfig') {
            await vscode.commands.executeCommand('ampify.launcher.editConfig');
            return;
        }

        if (actionId === 'refresh') {
            return;
        }

        if (actionId === 'addLauncher' || actionId === 'add') {
            await vscode.commands.executeCommand('ampify.launcher.add');
            return;
        }

        if (!rowId || !rowId.startsWith('launcher:')) {
            return;
        }

        const key = rowId.slice('launcher:'.length);
        const config = this.launcherConfig.getConfig();
        const instance = config.instances[key];
        if (!instance) {
            return;
        }

        if (actionId === 'launch') {
            await vscode.commands.executeCommand('ampify.launcher.launch', {
                label: instance.description || key,
                description: instance.dirName,
                instanceConfig: instance,
                key
            });
            return;
        }

        if (actionId === 'delete') {
            await vscode.commands.executeCommand('ampify.launcher.delete', {
                label: instance.description || key,
                description: instance.dirName,
                instanceConfig: instance,
                key
            });
        }
    }

    private async executeAuthAction(actionId: string, rowId?: string): Promise<void> {
        if (actionId === 'openConfig') {
            await vscode.commands.executeCommand('ampify.opencodeAuth.openAuthJson');
            return;
        }

        if (actionId === 'zeroConfig') {
            await vscode.commands.executeCommand('ampify.opencodeAuth.zeroConfig');
            return;
        }

        if (actionId === 'refresh') {
            return;
        }

        if (actionId === 'addCredential') {
            await vscode.commands.executeCommand('ampify.opencodeAuth.add');
            return;
        }

        if (actionId === 'importCredentials') {
            await vscode.commands.executeCommand('ampify.opencodeAuth.import');
            return;
        }

        if (!rowId || !rowId.startsWith('auth:')) {
            return;
        }

        const id = rowId.slice('auth:'.length);
        const credential = this.authConfig.getCredentialById(id);
        if (!credential) {
            return;
        }

        if (actionId === 'apply') {
            await vscode.commands.executeCommand('ampify.opencodeAuth.apply', id);
            return;
        }

        if (actionId === 'unapply') {
            await vscode.commands.executeCommand('ampify.opencodeAuth.clear', credential.provider);
            return;
        }

        if (actionId === 'rename') {
            await vscode.commands.executeCommand('ampify.opencodeAuth.rename', id);
            return;
        }

        if (actionId === 'delete') {
            await vscode.commands.executeCommand('ampify.opencodeAuth.delete', id);
        }
    }

    private async executeOhMyAction(actionId: string, rowId?: string): Promise<void> {
        if (actionId === 'openConfig') {
            await vscode.commands.executeCommand('ampify.opencode.ohmy.openConfig');
            return;
        }

        if (actionId === 'refresh') {
            return;
        }

        if (actionId === 'importOhMy') {
            await vscode.commands.executeCommand('ampify.opencode.ohmy.import');
            return;
        }

        if (!rowId || !rowId.startsWith('ohmy:')) {
            return;
        }

        const id = rowId.slice('ohmy:'.length);
        if (actionId === 'apply') {
            await vscode.commands.executeCommand('ampify.opencode.ohmy.apply', id);
        }
    }

    private async executeSessionAction(actionId: string, rowId?: string): Promise<void> {
        if (actionId === 'openConfig') {
            await vscode.commands.executeCommand('ampify.opencode.session.openConfig');
            return;
        }

        if (actionId === 'startSession') {
            await vscode.commands.executeCommand('ampify.opencode.session.start');
            return;
        }

        if (actionId === 'refreshSessions' || actionId === 'refresh') {
            await vscode.commands.executeCommand('ampify.opencode.session.refresh');
            return;
        }

        if (!rowId || !rowId.startsWith('session:')) {
            return;
        }

        const view = this.resolveSessionByRowId(rowId);
        if (!view) {
            return;
        }

        if (actionId === 'open' && view.managedSessionId) {
            await vscode.commands.executeCommand('ampify.opencode.session.open', view.managedSessionId);
            return;
        }

        if (actionId === 'kill') {
            if (view.managedSessionId) {
                await vscode.commands.executeCommand('ampify.opencode.session.kill', { sessionId: view.managedSessionId });
                return;
            }
        }
    }

    private resolveSessionByRowId(rowId: string): OpencodeSessionView | undefined {
        if (rowId.startsWith('session:managed:')) {
            const managedId = rowId.slice('session:managed:'.length);
            return this.lastSessionViews.find((item) => item.managedSessionId === managedId);
        }

        return undefined;
    }
}

function maskToken(value: string): string {
    const trimmed = (value || '').trim();
    if (!trimmed) {
        return '—';
    }
    if (trimmed.length <= 12) {
        return trimmed;
    }
    return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function formatExpires(value: number): string {
    if (!value) {
        return '—';
    }
    const timestamp = value < 1e11 ? value * 1000 : value;
    return new Date(timestamp).toLocaleString();
}
