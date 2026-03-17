import * as vscode from 'vscode';
import { getHtml } from '../templates/htmlTemplate';
import {
    AccountCenterTabId,
    AiTaggingProgressData,
    BootstrapPayload,
    CommandsViewModel,
    ConfirmData,
    DashboardViewModel,
    ExtensionMessage,
    GitShareViewModel,
    LauncherViewModel,
    OpenCodeAuthViewModel,
    OverlayData,
    OverlayField,
    SectionActionPayload,
    SectionId,
    SectionViewModel,
    SettingsScope,
    SettingsViewModel,
    SkillsViewModel,
    TreeNode,
    VisibleSectionId
} from '../shared/contracts';
import { DashboardBridge } from '../bridges/dashboardBridge';
import { LauncherBridge } from '../bridges/launcherBridge';
import { SkillsBridge } from '../bridges/skillsBridge';
import { CommandsBridge } from '../bridges/commandsBridge';
import { GitShareBridge } from '../bridges/gitShareBridge';
import { SettingsBridge } from '../bridges/settingsBridge';
import { OpenCodeAuthBridge } from '../bridges/opencodeAuthBridge';
import { AccountCenterBridge } from '../bridges/accountCenterBridge';
import { GitManager } from '../../../common/git';
import { I18n } from '../../../common/i18n';
import { SkillConfigManager } from '../../skills/core/skillConfigManager';
import { CommandConfigManager } from '../../commands/core/commandConfigManager';
import { SkillAiTagger } from '../../skills/core/skillAiTagger';
import { CommandAiTagger } from '../../commands/core/commandAiTagger';
import { parseTagLibraryText, stringifyTagLibraryText } from '../../../common/tagLibrary';
import { instanceKey } from '../../../extension';
import { MessageRouter } from './MessageRouter';
import { SectionHandlerRegistry } from './SectionHandlerRegistry';

export class MainViewController {
    private view?: vscode.WebviewView;
    private activeSection: VisibleSectionId = 'dashboard';
    private readonly pendingCallbacks = new Map<string, (values?: Record<string, string>) => Promise<void>>();
    private readonly aiTaggingProgress = new Map<'skills' | 'commands', AiTaggingProgressData>();

    private readonly dashboardBridge = new DashboardBridge();
    private readonly launcherBridge = new LauncherBridge();
    private readonly skillsBridge = new SkillsBridge();
    private readonly commandsBridge = new CommandsBridge();
    private readonly gitShareBridge = new GitShareBridge();
    private readonly settingsBridge = new SettingsBridge();
    private readonly opencodeAuthBridge = new OpenCodeAuthBridge();
    private readonly accountCenterBridge = new AccountCenterBridge();
    private readonly gitManager = new GitManager();
    private readonly router = new MessageRouter(this);
    private readonly registry = new SectionHandlerRegistry(this);

    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.extensionUri,
                vscode.Uri.joinPath(this.extensionUri, 'webview-dist'),
                vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode', 'codicons')
            ]
        };

        webviewView.webview.html = getHtml(webviewView.webview, this.extensionUri);

        webviewView.webview.onDidReceiveMessage((message) => {
            void this.router.route(message).catch((error) => {
                const text = error instanceof Error ? error.message : String(error);
                console.error('MainView router error:', text);
                this.sendNotification(text, 'error');
            });
        });
    }

    async refresh(section?: SectionId): Promise<void> {
        const target = this.normalizeSection(section || this.activeSection);
        await this.sendSectionData(target);
    }

    async handleAppReady(): Promise<void> {
        this.postMessage({ type: 'bootstrap', data: this.getBootstrapPayload() });
        this.postAppState();
        await this.sendSectionData(this.activeSection);
        this.postProgressState('skills');
        this.postProgressState('commands');
    }

    async handleNavigate(section: SectionId): Promise<void> {
        const normalized = this.normalizeSection(section);
        if (normalized === 'accountCenter') {
            const tab = this.getAccountCenterTabBySection(section);
            if (tab) {
                this.accountCenterBridge.setActiveTab(tab);
            }
        }
        this.activeSection = normalized;
        this.postAppState();
        await this.sendSectionData(normalized);
    }

    async handleSectionAction(section: SectionId, action: SectionActionPayload): Promise<void> {
        const normalized = this.normalizeSection(section);
        await this.registry.get(normalized).handleAction(action);
    }

    handleOverlayCancel(overlayId: string): void {
        this.pendingCallbacks.delete(overlayId);
        this.postMessage({ type: 'overlayState', data: null });
    }

    async handleOverlaySubmit(overlayId: string, values: Record<string, string>): Promise<void> {
        const callback = this.pendingCallbacks.get(overlayId);
        this.pendingCallbacks.delete(overlayId);
        this.postMessage({ type: 'overlayState', data: null });
        if (callback) {
            try {
                await callback(values);
            } catch (error) {
                const text = error instanceof Error ? error.message : String(error);
                console.error('Overlay submit handler error:', text);
                vscode.window.showErrorMessage(text);
            }
        }
        await this.refresh();
    }

    async handleConfirmResult(confirmId: string, confirmed: boolean): Promise<void> {
        const callback = this.pendingCallbacks.get(confirmId);
        this.pendingCallbacks.delete(confirmId);
        this.postMessage({ type: 'confirmState', data: null });
        if (confirmed && callback) {
            try {
                await callback();
            } catch (error) {
                const text = error instanceof Error ? error.message : String(error);
                console.error('Confirm handler error:', text);
                vscode.window.showErrorMessage(text);
            }
        }
        await this.refresh();
    }

    async handleSettingChange(scope: SettingsScope, key: string, value: string): Promise<void> {
        await this.settingsBridge.updateSetting(scope, key, value);
        if (this.activeSection === 'settings') {
            await this.sendSectionData('settings');
        }
        await this.postDependentSectionsAfterSettingChange();
    }

    buildDashboardViewModel = async (): Promise<DashboardViewModel> => ({
        section: 'dashboard',
        title: I18n.get('nav.dashboard'),
        subtitle: vscode.workspace.workspaceFolders?.[0]?.name,
        data: await this.dashboardBridge.getData()
    });

    buildAccountCenterViewModel = async (): Promise<SectionViewModel> => {
        const data = await this.accountCenterBridge.getData();
        return {
            section: 'accountCenter',
            title: data.title,
            toolbar: data.toolbar,
            data
        };
    };

    buildSettingsViewModel = async (): Promise<SettingsViewModel> => ({
        section: 'settings',
        title: I18n.get('nav.settings'),
        data: this.settingsBridge.getSettingsData()
    });

    buildResourceViewModel = async (section: SectionId): Promise<SectionViewModel> => {
        switch (section) {
            case 'launcher':
                return this.buildLauncherViewModel();
            case 'skills':
                return this.buildSkillsViewModel();
            case 'commands':
                return this.buildCommandsViewModel();
            case 'gitshare':
                return this.buildGitShareViewModel();
            case 'opencodeAuth':
                return this.buildOpenCodeAuthViewModel();
            default:
                throw new Error(`Unsupported resource section "${section}"`);
        }
    };

    async handleToolbarAction(section: SectionId, actionId: string): Promise<void> {
        if (actionId === 'refresh') {
            await this.sendSectionData(this.normalizeSection(section));
            return;
        }

        switch (section) {
            case 'accountCenter':
                await this.accountCenterBridge.executeAction(actionId);
                await this.sendSectionData('accountCenter');
                return;
            case 'skills':
                await this.handleSkillsToolbarAction(actionId);
                return;
            case 'commands':
                await this.handleCommandsToolbarAction(actionId);
                return;
            case 'launcher':
                await this.handleLauncherToolbarAction(actionId);
                return;
            case 'gitshare':
                await this.handleGitShareToolbarAction(actionId);
                return;
            case 'opencodeAuth':
                await this.handleOpenCodeAuthToolbarAction(actionId);
                return;
            default:
                return;
        }
    }

    async handleTreeItemClick(section: SectionId, nodeId: string): Promise<void> {
        const node = this.findNodeInTree(section, nodeId);

        switch (section) {
            case 'launcher':
                await this.launcherBridge.executeAction('switch', nodeId);
                break;
            case 'skills':
                if (node?.nodeType === 'skillItem') {
                    await this.skillsBridge.executeAction('preview', nodeId);
                } else if (node?.nodeType === 'filterInfo') {
                    this.skillsBridge.clearFilter();
                    await this.sendSectionData('skills');
                } else if (node?.nodeType === 'file') {
                    await this.skillsBridge.executeAction('openFile', nodeId);
                }
                break;
            case 'commands':
                if (node?.nodeType === 'commandItem') {
                    await this.commandsBridge.executeAction('open', nodeId);
                } else if (node?.nodeType === 'filterInfo') {
                    this.commandsBridge.clearFilter();
                    await this.sendSectionData('commands');
                }
                break;
            case 'gitshare':
                if (nodeId === 'gitshare-repopath') {
                    await vscode.commands.executeCommand('ampify.gitShare.openFolder');
                } else if (nodeId === 'gitshare-config-wizard') {
                    await this.showGitConfigOverlay();
                } else if (nodeId.startsWith('gitshare-')) {
                    const field = nodeId.replace('gitshare-', '');
                    const fieldMap: Record<string, string> = {
                        username: 'userName',
                        email: 'userEmail',
                        remote: 'remoteUrl'
                    };
                    if (fieldMap[field]) {
                        await vscode.commands.executeCommand('ampify.gitShare.editConfig', fieldMap[field]);
                    }
                }
                break;
            case 'opencodeAuth':
                if (node?.nodeType === 'credentialItem') {
                    await this.opencodeAuthBridge.executeAction('switch', nodeId);
                    await this.sendSectionData('opencodeAuth');
                }
                break;
        }
    }

    async handleTreeItemAction(section: SectionId, nodeId: string, actionId: string): Promise<void> {
        if (actionId === 'delete') {
            await this.handleDeleteWithConfirm(section, nodeId);
            return;
        }

        if (actionId === 'clearFilter') {
            await this.handleClearFilter(section);
            return;
        }

        switch (section) {
            case 'launcher':
                await this.launcherBridge.executeAction(actionId, nodeId);
                break;
            case 'skills':
                await this.skillsBridge.executeAction(actionId, nodeId);
                break;
            case 'commands':
                await this.commandsBridge.executeAction(actionId, nodeId);
                break;
            case 'gitshare':
                await this.gitShareBridge.executeAction(actionId, nodeId);
                break;
            case 'opencodeAuth':
                await this.opencodeAuthBridge.executeAction(actionId, nodeId);
                break;
        }

        await this.refresh();
    }

    async handleCardClick(section: SectionId, cardId: string): Promise<void> {
        const cards = this.getCardsForSection(section);
        const card = cards.find((item) => item.id === cardId);
        if (card?.primaryFilePath) {
            await this.handleCardFileClick(card.primaryFilePath);
        }
    }

    async handleCardAction(section: SectionId, cardId: string, actionId: string): Promise<void> {
        if (section === 'skills') {
            if (actionId === 'delete') {
                await this.handleDeleteWithConfirm(section, cardId);
                return;
            }
            await this.skillsBridge.executeAction(actionId, cardId);
            await this.sendSectionData('skills');
            return;
        }

        if (section === 'commands') {
            if (actionId === 'delete') {
                await this.handleDeleteWithConfirm(section, cardId);
                return;
            }
            await this.commandsBridge.executeAction(actionId, cardId);
            await this.sendSectionData('commands');
            return;
        }

        if (section === 'opencodeAuth') {
            if (actionId === 'delete') {
                await this.handleDeleteWithConfirm(section, cardId);
                return;
            }
            await this.opencodeAuthBridge.executeAction(actionId, cardId);
            await this.sendSectionData('opencodeAuth');
        }
    }

    async handleCardFileClick(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.window.showTextDocument(uri, { preview: true });
        } catch (error) {
            console.error('Failed to open file:', error);
        }
    }

    async handleFilterKeyword(section: SectionId, keyword: string): Promise<void> {
        if (section === 'skills') {
            const current = this.skillsBridge.getFilterState();
            this.skillsBridge.setFilter(keyword || undefined, current.tags);
            await this.sendSectionData('skills');
        } else if (section === 'commands') {
            const current = this.commandsBridge.getFilterState();
            this.commandsBridge.setFilter(keyword || undefined, current.tags);
            await this.sendSectionData('commands');
        }
    }

    async handleFilterTags(section: SectionId, tags: string[]): Promise<void> {
        if (section === 'skills') {
            const current = this.skillsBridge.getFilterState();
            this.skillsBridge.setFilter(current.keyword, tags);
            await this.sendSectionData('skills');
        } else if (section === 'commands') {
            const current = this.commandsBridge.getFilterState();
            this.commandsBridge.setFilter(current.keyword, tags);
            await this.sendSectionData('commands');
        }
    }

    async handleClearFilter(section: SectionId): Promise<void> {
        if (section === 'skills') {
            this.skillsBridge.clearFilter();
            await this.sendSectionData('skills');
        } else if (section === 'commands') {
            this.commandsBridge.clearFilter();
            await this.sendSectionData('commands');
        }
    }

    async handleToggleTag(section: SectionId, tag: string): Promise<void> {
        const bridge = section === 'skills'
            ? this.skillsBridge
            : section === 'commands'
                ? this.commandsBridge
                : null;

        if (!bridge) {
            return;
        }

        const current = bridge.getFilterState();
        const currentTags = current.tags || [];
        const nextTags = currentTags.includes(tag)
            ? currentTags.filter((item) => item !== tag)
            : [...currentTags, tag];

        if (nextTags.length > 0) {
            bridge.setFilter(current.keyword, nextTags);
        } else {
            bridge.setFilter(current.keyword || undefined);
        }

        await this.sendSectionData(section);
    }

    async handleDrop(section: SectionId, uris: string[]): Promise<void> {
        if (!uris || uris.length === 0) {
            return;
        }

        const validUris: vscode.Uri[] = [];
        for (const value of uris) {
            try {
                const parsed = vscode.Uri.parse(value);
                if (parsed.scheme === 'file' || parsed.scheme === '' || parsed.scheme === 'untitled') {
                    validUris.push(parsed);
                }
            } catch {
                // Ignore invalid URIs from drag-and-drop.
            }
        }

        if (validUris.length === 0) {
            vscode.window.showWarningMessage(I18n.get('mainView.drop.invalidUris'));
            return;
        }

        try {
            if (section === 'skills') {
                await vscode.commands.executeCommand('ampify.skills.importFromUris', validUris);
            } else if (section === 'commands') {
                await vscode.commands.executeCommand('ampify.commands.importFromUris', validUris);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(I18n.get('common.importFailed', message));
        }

        await this.refresh(section);
    }

    async handleDropEmpty(section: SectionId): Promise<void> {
        if (section === 'skills') {
            await vscode.commands.executeCommand('ampify.skills.import');
        } else if (section === 'commands') {
            await vscode.commands.executeCommand('ampify.commands.import');
        }
    }

    async handleAccountCenterTabChange(tab: AccountCenterTabId): Promise<void> {
        this.accountCenterBridge.setActiveTab(tab);
        if (this.activeSection === 'accountCenter') {
            this.postAppState();
            await this.sendSectionData('accountCenter');
        }
    }

    async handleAccountCenterAction(tab: AccountCenterTabId, actionId: string, rowId?: string): Promise<void> {
        this.accountCenterBridge.setActiveTab(tab);
        await this.accountCenterBridge.executeAction(actionId, rowId);
        if (this.activeSection === 'accountCenter') {
            this.postAppState();
            await this.sendSectionData('accountCenter');
        }
        await this.sendSectionData('dashboard');
    }

    async handleSettingsAction(command: string): Promise<void> {
        if (command === 'reloadWindow') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }

    async handleQuickAction(actionId: string, section: SectionId): Promise<void> {
        if (section === 'launcher' || section === 'opencodeAuth') {
            await this.handleToolbarAction(section, actionId);
            await this.sendSectionData('dashboard');
            return;
        }

        const normalized = this.normalizeSection(section);
        if (normalized === 'accountCenter') {
            const tab = this.getAccountCenterTabBySection(section);
            if (tab) {
                this.accountCenterBridge.setActiveTab(tab);
            }
        }

        this.activeSection = normalized;
        this.postAppState();
        await this.sendSectionData(normalized);

        setTimeout(() => {
            void this.handleToolbarAction(normalized, actionId);
        }, 150);
    }

    async executeCommand(command: string, args?: string): Promise<void> {
        if (!command) {
            return;
        }
        try {
            if (args) {
                await vscode.commands.executeCommand(command, JSON.parse(args));
            } else {
                await vscode.commands.executeCommand(command);
            }
            await this.refresh();
        } catch (error) {
            const text = error instanceof Error ? error.message : String(error);
            console.error('Command execution failed:', text);
            this.sendNotification(text, 'error');
        }
    }

    private getBootstrapPayload(): BootstrapPayload {
        const configuredLang = vscode.workspace.getConfiguration('ampify').get<'en' | 'zh-cn'>('language') || 'zh-cn';
        return {
            brandName: 'Ampify',
            brandTagline: vscode.workspace.workspaceFolders?.[0]?.name || 'Workspace Command Center',
            locale: configuredLang,
            instanceKey: instanceKey || 'default',
            initialSection: this.activeSection,
            navItems: [
                { id: 'dashboard', label: I18n.get('nav.dashboard'), iconId: 'dashboard' },
                { id: 'skills', label: I18n.get('nav.skills'), iconId: 'library' },
                { id: 'commands', label: I18n.get('nav.commands'), iconId: 'terminal' },
                { id: 'gitshare', label: I18n.get('nav.gitShare'), iconId: 'git-merge' },
                { id: 'settings', label: I18n.get('nav.settings'), iconId: 'settings-gear' }
            ]
        };
    }

    private async sendSectionData(section: SectionId): Promise<void> {
        const normalized = this.normalizeSection(section);
        const viewModel = await this.registry.get(normalized).getViewModel();
        this.postMessage({ type: 'sectionData', section: normalized, data: viewModel });
        if (normalized === 'skills' || normalized === 'commands') {
            this.postProgressState(normalized);
        }
    }

    private postAppState(): void {
        this.postMessage({
            type: 'appState',
            data: {
                activeSection: this.activeSection,
                accountCenterTab: this.accountCenterBridge.getActiveTab()
            }
        });
    }

    private postNotification(message: string, level: 'info' | 'warn' | 'error'): void {
        this.postMessage({
            type: 'notification',
            data: { message, level }
        });
    }

    private sendNotification(message: string, level: 'info' | 'warn' | 'error'): void {
        this.postNotification(message, level);
        if (level === 'error') {
            void vscode.window.showErrorMessage(message);
        } else if (level === 'warn') {
            void vscode.window.showWarningMessage(message);
        } else {
            void vscode.window.showInformationMessage(message);
        }
    }

    private postProgressState(target: 'skills' | 'commands'): void {
        this.postMessage({
            type: 'progressState',
            data: this.aiTaggingProgress.get(target) || null
        });
    }

    private buildLauncherViewModel(): LauncherViewModel {
        return {
            section: 'launcher',
            title: I18n.get('dashboard.launcher'),
            toolbar: this.launcherBridge.getToolbar(),
            tree: this.launcherBridge.getTreeData()
        };
    }

    private buildSkillsViewModel(): SkillsViewModel {
        return {
            section: 'skills',
            title: I18n.get('nav.skills'),
            toolbar: this.skillsBridge.getToolbar(),
            tree: this.skillsBridge.getTreeData(),
            cards: this.skillsBridge.getCardData(),
            tags: this.skillsBridge.getAllTags(),
            activeTags: this.skillsBridge.getActiveTags()
        };
    }

    private buildCommandsViewModel(): CommandsViewModel {
        return {
            section: 'commands',
            title: I18n.get('nav.commands'),
            toolbar: this.commandsBridge.getToolbar(),
            tree: this.commandsBridge.getTreeData(),
            cards: this.commandsBridge.getCardData(),
            tags: this.commandsBridge.getAllTags(),
            activeTags: this.commandsBridge.getActiveTags()
        };
    }

    private async buildGitShareViewModel(): Promise<GitShareViewModel> {
        return {
            section: 'gitshare',
            title: I18n.get('nav.gitShare'),
            toolbar: this.gitShareBridge.getToolbar(),
            tree: await this.gitShareBridge.getTreeData()
        };
    }

    private buildOpenCodeAuthViewModel(): OpenCodeAuthViewModel {
        return {
            section: 'opencodeAuth',
            title: I18n.get('dashboard.opencode'),
            toolbar: this.opencodeAuthBridge.getToolbar(),
            tree: this.opencodeAuthBridge.getTreeData(),
            cards: this.opencodeAuthBridge.getCardData()
        };
    }

    private findNodeInTree(section: SectionId, nodeId: string): TreeNode | undefined {
        let tree: TreeNode[] = [];
        switch (section) {
            case 'skills':
                tree = this.skillsBridge.getTreeData();
                break;
            case 'commands':
                tree = this.commandsBridge.getTreeData();
                break;
            case 'launcher':
                tree = this.launcherBridge.getTreeData();
                break;
            case 'opencodeAuth':
                tree = this.opencodeAuthBridge.getTreeData();
                break;
        }
        return this.findNodeRecursive(tree, nodeId);
    }

    private findNodeRecursive(nodes: TreeNode[], nodeId: string): TreeNode | undefined {
        for (const node of nodes) {
            if (node.id === nodeId) {
                return node;
            }
            if (node.children) {
                const found = this.findNodeRecursive(node.children, nodeId);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    private getCardsForSection(section: SectionId) {
        switch (section) {
            case 'skills':
                return this.skillsBridge.getCardData();
            case 'commands':
                return this.commandsBridge.getCardData();
            case 'opencodeAuth':
                return this.opencodeAuthBridge.getCardData();
            default:
                return [];
        }
    }

    private showOverlay(data: OverlayData, callback: (values?: Record<string, string>) => Promise<void>): void {
        this.pendingCallbacks.set(data.overlayId, callback);
        this.postMessage({ type: 'overlayState', data });
    }

    private showConfirm(data: ConfirmData, callback: (values?: Record<string, string>) => Promise<void>): void {
        this.pendingCallbacks.set(data.confirmId, callback);
        this.postMessage({ type: 'confirmState', data });
    }

    private async handleSkillsToolbarAction(actionId: string): Promise<void> {
        switch (actionId) {
            case 'search': {
                const currentFilter = this.skillsBridge.getFilterState();
                const fields: OverlayField[] = [{
                    key: 'keyword',
                    label: I18n.get('skills.searchPlaceholder'),
                    kind: 'text',
                    value: currentFilter.keyword || '',
                    placeholder: I18n.get('skills.searchPlaceholder')
                }];

                this.showOverlay({
                    overlayId: 'skills-search',
                    title: I18n.get('skills.searchTitle'),
                    fields,
                    submitLabel: I18n.get('common.search'),
                    cancelLabel: I18n.get('skills.cancel')
                }, async (values) => {
                    const keyword = values?.keyword?.trim();
                    if (keyword) {
                        this.skillsBridge.setFilter(keyword);
                    } else {
                        this.skillsBridge.clearFilter();
                    }
                    await this.sendSectionData('skills');
                });
                break;
            }
            case 'create':
                await this.showSkillCreateOverlay();
                break;
            case 'aiTagging':
                await this.showSkillAiTaggingOverlay();
                break;
            case 'import':
                await vscode.commands.executeCommand('ampify.skills.import');
                break;
            case 'openFolder':
                await vscode.commands.executeCommand('ampify.skills.openFolder');
                break;
        }
    }

    private async handleCommandsToolbarAction(actionId: string): Promise<void> {
        switch (actionId) {
            case 'search': {
                const currentFilter = this.commandsBridge.getFilterState();
                const fields: OverlayField[] = [{
                    key: 'keyword',
                    label: I18n.get('commands.searchPlaceholder'),
                    kind: 'text',
                    value: currentFilter.keyword || '',
                    placeholder: I18n.get('commands.searchPlaceholder')
                }];

                this.showOverlay({
                    overlayId: 'commands-search',
                    title: I18n.get('commands.searchTitle'),
                    fields,
                    submitLabel: I18n.get('common.search'),
                    cancelLabel: I18n.get('skills.cancel')
                }, async (values) => {
                    const keyword = values?.keyword?.trim();
                    if (keyword) {
                        this.commandsBridge.setFilter(keyword);
                    } else {
                        this.commandsBridge.clearFilter();
                    }
                    await this.sendSectionData('commands');
                });
                break;
            }
            case 'create':
                await this.showCommandCreateOverlay();
                break;
            case 'aiTagging':
                await this.showCommandAiTaggingOverlay();
                break;
            case 'import':
                await vscode.commands.executeCommand('ampify.commands.import');
                break;
            case 'openFolder':
                await vscode.commands.executeCommand('ampify.commands.openFolder');
                break;
        }
    }

    private async handleLauncherToolbarAction(actionId: string): Promise<void> {
        if (actionId === 'add') {
            await this.showLauncherAddOverlay();
        }
    }

    private async handleOpenCodeAuthToolbarAction(actionId: string): Promise<void> {
        switch (actionId) {
            case 'add':
                await this.showOpenCodeAuthAddOverlay();
                break;
            case 'import':
                await vscode.commands.executeCommand('ampify.opencodeAuth.import');
                await this.sendSectionData('opencodeAuth');
                break;
            case 'switchNext':
                await vscode.commands.executeCommand('ampify.opencodeAuth.switchNext');
                await this.sendSectionData('opencodeAuth');
                break;
            case 'clear':
                await vscode.commands.executeCommand('ampify.opencodeAuth.clear');
                await this.sendSectionData('opencodeAuth');
                break;
        }
    }

    private async handleGitShareToolbarAction(actionId: string): Promise<void> {
        switch (actionId) {
            case 'commit':
                await this.showGitCommitOverlay();
                break;
            case 'configWizard':
                await this.showGitConfigOverlay();
                break;
        }
    }

    private async showSkillCreateOverlay(): Promise<void> {
        const allTags = SkillConfigManager.getInstance().getAllTags();
        const predefinedTags = ['ai', 'backend', 'frontend', 'git', 'ci-cd', 'vue', 'react'];
        const tagOptions = [...new Set([...predefinedTags, ...allTags])].sort().map((tag) => ({ label: tag, value: tag }));

        const fields: OverlayField[] = [
            { key: 'name', label: I18n.get('skills.inputSkillName'), kind: 'text', required: true, placeholder: 'my-awesome-skill' },
            { key: 'description', label: I18n.get('skills.inputSkillDesc'), kind: 'textarea', required: true, placeholder: 'What this skill does. Use when...' },
            { key: 'tags', label: I18n.get('skills.selectTags'), kind: 'tags', options: tagOptions, placeholder: I18n.get('common.typeAndEnter') }
        ];

        this.showOverlay({
            overlayId: 'skills-create',
            title: I18n.get('dashboard.quickCreateSkill'),
            fields,
            submitLabel: I18n.get('common.create'),
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) {
                return;
            }
            const name = values.name?.trim();
            const description = values.description?.trim();
            if (!name || !description) {
                return;
            }
            if (!/^[a-z0-9-]+$/.test(name) || name.length > 64) {
                vscode.window.showErrorMessage(I18n.get('skills.nameValidation'));
                return;
            }

            const configManager = SkillConfigManager.getInstance();
            if (configManager.skillExists(name)) {
                vscode.window.showErrorMessage(I18n.get('skills.skillExists', name));
                return;
            }

            const tags = (values.tags || '').split(',').filter(Boolean);
            const { generateSkillMdContent } = await import('../../skills/templates/skillMdTemplate');
            const skillMdContent = generateSkillMdContent({
                name,
                description,
                tags: tags.length > 0 ? tags : undefined
            });

            configManager.saveSkillMd(name, skillMdContent);
            const skillMdPath = `${configManager.getSkillPath(name)}/SKILL.md`;
            const document = await vscode.workspace.openTextDocument(skillMdPath);
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage(I18n.get('skills.skillCreated', name));
        });
    }

    private async showSkillAiTaggingOverlay(): Promise<void> {
        const configManager = SkillConfigManager.getInstance();
        const skills = configManager.loadAllSkills().filter((skill) => !!skill.skillMdPath);
        if (skills.length === 0) {
            vscode.window.showWarningMessage(I18n.get('skills.noSkills'));
            return;
        }

        const aiConfig = configManager.getAiTaggingConfig();
        const chatModels = await vscode.lm.selectChatModels();
        const modelOptions = chatModels.map((model) => ({ label: model.name, value: model.id }));
        const defaultModelId = aiConfig.vscodeModelId || (chatModels[0]?.id || '');
        const fields: OverlayField[] = [
            {
                key: 'provider',
                label: I18n.get('aiTagging.provider'),
                kind: 'select',
                value: aiConfig.provider,
                options: [
                    { label: I18n.get('aiTagging.provider.vscodeChat'), value: 'vscode-chat' },
                    { label: I18n.get('aiTagging.provider.openaiCompatible'), value: 'openai-compatible' }
                ]
            },
            { key: 'vscodeModelId', label: I18n.get('aiTagging.vscodeModelId'), kind: 'select', value: defaultModelId, options: modelOptions },
            { key: 'openaiBaseUrl', label: I18n.get('aiTagging.openaiBaseUrl'), kind: 'text', value: aiConfig.openaiBaseUrl || '', placeholder: 'https://api.openai.com/v1' },
            { key: 'openaiApiKey', label: I18n.get('aiTagging.openaiApiKey'), kind: 'text', value: aiConfig.openaiApiKey || '' },
            { key: 'openaiModel', label: I18n.get('aiTagging.openaiModel'), kind: 'text', value: aiConfig.openaiModel || '' },
            {
                key: 'tagLibrary',
                label: I18n.get('aiTagging.tagLibrary'),
                kind: 'textarea',
                description: I18n.get('aiTagging.tagLibraryFormatHint'),
                value: stringifyTagLibraryText(aiConfig.tagLibrary || [])
            },
            {
                key: 'targets',
                label: I18n.get('aiTagging.selectTargetsSkills'),
                kind: 'multi-select-dropdown',
                required: true,
                placeholder: I18n.get('aiTagging.selectTargetsSkills'),
                value: skills.map((skill) => skill.meta.name).join(','),
                options: skills.map((skill) => ({ label: skill.meta.name, value: skill.meta.name }))
            }
        ];

        this.showOverlay({
            overlayId: 'skills-ai-tagging',
            title: I18n.get('aiTagging.runSkillsTitle'),
            fields,
            submitLabel: I18n.get('aiTagging.runNow'),
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) {
                return;
            }

            const selected = (values.targets || '').split(',').map((item) => item.trim()).filter(Boolean);
            if (selected.length === 0) {
                vscode.window.showWarningMessage(I18n.get('aiTagging.noTargets'));
                return;
            }

            configManager.updateAiTaggingConfig({
                provider: values.provider === 'openai-compatible' ? 'openai-compatible' : 'vscode-chat',
                vscodeModelId: (values.vscodeModelId || '').trim(),
                openaiBaseUrl: (values.openaiBaseUrl || '').trim(),
                openaiApiKey: (values.openaiApiKey || '').trim(),
                openaiModel: (values.openaiModel || '').trim(),
                tagLibrary: parseTagLibraryText(values.tagLibrary || '')
            });

            this.updateAiTaggingProgress('skills', {
                running: true,
                total: selected.length,
                completed: 0,
                percent: 0,
                items: selected.map((name) => ({ id: name, name, status: 'pending' }))
            });

            const tagger = new SkillAiTagger(configManager);
            try {
                await tagger.run(selected, async (snapshot) => {
                    this.updateAiTaggingProgress('skills', snapshot);
                    if (this.activeSection === 'skills') {
                        await this.sendSectionData('skills');
                    }
                });
                await this.sendSectionData('skills');
                vscode.window.showInformationMessage(I18n.get('aiTagging.completed', String(selected.length)));
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(I18n.get('aiTagging.failed', message));
            }
        });
    }

    private async showCommandCreateOverlay(): Promise<void> {
        const commandConfig = CommandConfigManager.getInstance();
        const allTags = commandConfig.getAllTags();
        const predefinedTags = ['code-generation', 'refactor', 'documentation', 'testing', 'debugging', 'analysis', 'review', 'database', 'api', 'frontend', 'backend', 'devops', 'workflow'];
        const tagOptions = [...new Set([...predefinedTags, ...allTags])].sort().map((tag) => ({ label: tag, value: tag }));

        const fields: OverlayField[] = [
            { key: 'name', label: I18n.get('commands.inputCommandName'), kind: 'text', required: true, placeholder: 'my-command' },
            { key: 'description', label: I18n.get('commands.inputCommandDesc'), kind: 'textarea', required: true, placeholder: 'A command that...' },
            { key: 'tags', label: I18n.get('commands.selectTags'), kind: 'tags', options: tagOptions, placeholder: I18n.get('common.typeAndEnter') }
        ];

        this.showOverlay({
            overlayId: 'commands-create',
            title: I18n.get('dashboard.quickCreateCommand'),
            fields,
            submitLabel: I18n.get('common.create'),
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) {
                return;
            }
            const name = values.name?.trim();
            const description = values.description?.trim();
            if (!name || !description) {
                return;
            }
            if (!/^[a-z0-9-]+$/.test(name) || name.length > 64) {
                vscode.window.showErrorMessage(I18n.get('commands.nameValidation'));
                return;
            }
            if (commandConfig.commandExists(name)) {
                vscode.window.showErrorMessage(I18n.get('commands.commandExists', name));
                return;
            }

            const tags = (values.tags || '').split(',').filter(Boolean);
            const { generateCommandMd } = await import('../../commands/templates/commandMdTemplate');
            commandConfig.saveCommandMd(name, generateCommandMd({ command: name, description, tags }));
            vscode.window.showInformationMessage(I18n.get('commands.commandCreated', name));

            const filePath = vscode.Uri.file(`${commandConfig.getCommandsDir()}/${name}.md`);
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
        });
    }

    private async showCommandAiTaggingOverlay(): Promise<void> {
        const configManager = CommandConfigManager.getInstance();
        const commands = configManager.loadAllCommands();
        if (commands.length === 0) {
            vscode.window.showWarningMessage(I18n.get('commands.noCommands'));
            return;
        }

        const aiConfig = configManager.getAiTaggingConfig();
        const chatModels = await vscode.lm.selectChatModels();
        const modelOptions = chatModels.map((model) => ({ label: model.name, value: model.id }));
        const defaultModelId = aiConfig.vscodeModelId || (chatModels[0]?.id || '');
        const fields: OverlayField[] = [
            {
                key: 'provider',
                label: I18n.get('aiTagging.provider'),
                kind: 'select',
                value: aiConfig.provider,
                options: [
                    { label: I18n.get('aiTagging.provider.vscodeChat'), value: 'vscode-chat' },
                    { label: I18n.get('aiTagging.provider.openaiCompatible'), value: 'openai-compatible' }
                ]
            },
            { key: 'vscodeModelId', label: I18n.get('aiTagging.vscodeModelId'), kind: 'select', value: defaultModelId, options: modelOptions },
            { key: 'openaiBaseUrl', label: I18n.get('aiTagging.openaiBaseUrl'), kind: 'text', value: aiConfig.openaiBaseUrl || '', placeholder: 'https://api.openai.com/v1' },
            { key: 'openaiApiKey', label: I18n.get('aiTagging.openaiApiKey'), kind: 'text', value: aiConfig.openaiApiKey || '' },
            { key: 'openaiModel', label: I18n.get('aiTagging.openaiModel'), kind: 'text', value: aiConfig.openaiModel || '' },
            {
                key: 'tagLibrary',
                label: I18n.get('aiTagging.tagLibrary'),
                kind: 'textarea',
                description: I18n.get('aiTagging.tagLibraryFormatHint'),
                value: stringifyTagLibraryText(aiConfig.tagLibrary || [])
            },
            {
                key: 'targets',
                label: I18n.get('aiTagging.selectTargetsCommands'),
                kind: 'multi-select-dropdown',
                required: true,
                placeholder: I18n.get('aiTagging.selectTargetsCommands'),
                value: commands.map((command) => command.meta.command).join(','),
                options: commands.map((command) => ({ label: command.meta.command, value: command.meta.command }))
            }
        ];

        this.showOverlay({
            overlayId: 'commands-ai-tagging',
            title: I18n.get('aiTagging.runCommandsTitle'),
            fields,
            submitLabel: I18n.get('aiTagging.runNow'),
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) {
                return;
            }

            const selected = (values.targets || '').split(',').map((item) => item.trim()).filter(Boolean);
            if (selected.length === 0) {
                vscode.window.showWarningMessage(I18n.get('aiTagging.noTargets'));
                return;
            }

            configManager.updateAiTaggingConfig({
                provider: values.provider === 'openai-compatible' ? 'openai-compatible' : 'vscode-chat',
                vscodeModelId: (values.vscodeModelId || '').trim(),
                openaiBaseUrl: (values.openaiBaseUrl || '').trim(),
                openaiApiKey: (values.openaiApiKey || '').trim(),
                openaiModel: (values.openaiModel || '').trim(),
                tagLibrary: parseTagLibraryText(values.tagLibrary || '')
            });

            this.updateAiTaggingProgress('commands', {
                running: true,
                total: selected.length,
                completed: 0,
                percent: 0,
                items: selected.map((name) => ({ id: name, name, status: 'pending' }))
            });

            const tagger = new CommandAiTagger(configManager);
            try {
                await tagger.run(selected, async (snapshot) => {
                    this.updateAiTaggingProgress('commands', snapshot);
                    if (this.activeSection === 'commands') {
                        await this.sendSectionData('commands');
                    }
                });
                await this.sendSectionData('commands');
                vscode.window.showInformationMessage(I18n.get('aiTagging.completed', String(selected.length)));
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(I18n.get('aiTagging.failed', message));
            }
        });
    }

    private async showLauncherAddOverlay(): Promise<void> {
        const fields: OverlayField[] = [
            { key: 'name', label: I18n.get('launcher.inputKey'), kind: 'text', required: true, placeholder: 'work' },
            { key: 'dirName', label: I18n.get('launcher.inputDirName'), kind: 'text', required: true, placeholder: 'github-work' },
            { key: 'description', label: I18n.get('launcher.inputDesc'), kind: 'text', placeholder: 'Work Account' }
        ];

        this.showOverlay({
            overlayId: 'launcher-add',
            title: I18n.get('dashboard.quickLaunch'),
            fields,
            submitLabel: I18n.get('common.add'),
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) {
                return;
            }
            const name = values.name?.trim();
            const dirName = values.dirName?.trim();
            const description = values.description?.trim();
            if (!name || !dirName) {
                return;
            }

            const { ConfigManager } = await import('../../launcher/core/configManager');
            const configManager = new ConfigManager();
            const config = configManager.getConfig();
            config.instances[name] = {
                dirName,
                description: description || `${name} Account`,
                vscodeArgs: ['--new-window']
            };
            configManager.saveConfig(config);
        });
    }

    private async showOpenCodeAuthAddOverlay(): Promise<void> {
        const fields: OverlayField[] = [
            { key: 'name', label: I18n.get('opencodeAuth.inputName'), kind: 'text', required: true, placeholder: 'work-account' },
            { key: 'accessToken', label: I18n.get('opencodeAuth.inputAccess'), kind: 'text', required: true, placeholder: 'ghu_...' },
            { key: 'refreshToken', label: I18n.get('opencodeAuth.inputRefresh'), kind: 'text', placeholder: 'ghr_...' },
            { key: 'expiresAt', label: I18n.get('opencodeAuth.inputExpires'), kind: 'text', placeholder: '2026-12-31' }
        ];

        this.showOverlay({
            overlayId: 'opencode-add',
            title: I18n.get('opencodeAuth.add'),
            fields,
            submitLabel: I18n.get('common.add'),
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) {
                return;
            }
            const name = values.name?.trim();
            const accessToken = values.accessToken?.trim();
            if (!name || !accessToken) {
                return;
            }

            const { OpenCodeCopilotAuthConfigManager } = await import('../../opencode-copilot-auth/core/configManager');
            const configManager = new OpenCodeCopilotAuthConfigManager();
            const expires = values.expiresAt ? new Date(values.expiresAt).getTime() : 0;

            configManager.addCredential(
                name,
                'github-copilot',
                'oauth',
                accessToken,
                values.refreshToken?.trim() || '',
                expires
            );

            vscode.window.showInformationMessage(I18n.get('opencodeAuth.addSuccess', name));
        });
    }

    private async showGitCommitOverlay(): Promise<void> {
        const fields: OverlayField[] = [{
            key: 'message',
            label: I18n.get('gitShare.commitPrompt'),
            kind: 'text',
            value: I18n.get('gitShare.commitDefaultMessage'),
            placeholder: I18n.get('gitShare.commitDefaultMessage')
        }];

        this.showOverlay({
            overlayId: 'gitshare-commit',
            title: 'Git Commit',
            fields,
            submitLabel: 'Commit',
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            const message = values?.message?.trim() || I18n.get('gitShare.commitDefaultMessage');
            const committed = await this.gitManager.commit(message);
            if (committed) {
                vscode.window.showInformationMessage(I18n.get('gitShare.commitSuccess'));
            } else {
                vscode.window.showErrorMessage(I18n.get('gitShare.commitFailed', 'Commit failed'));
            }
        });
    }

    private async showGitConfigOverlay(): Promise<void> {
        const gitConfig = this.gitManager.getConfig().gitConfig || {};
        const remoteUrls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
            ? gitConfig.remoteUrls
            : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

        const fields: OverlayField[] = [
            { key: 'userName', label: I18n.get('gitShare.inputUserName'), kind: 'text', value: gitConfig.userName || '', placeholder: 'Your Name' },
            { key: 'userEmail', label: I18n.get('gitShare.inputUserEmail'), kind: 'text', value: gitConfig.userEmail || '', placeholder: 'you@example.com' },
            { key: 'remoteUrls', label: I18n.get('gitShare.inputRemoteUrls'), kind: 'textarea', value: remoteUrls.join(', '), placeholder: 'https://github.com/user/repo.git' }
        ];

        this.showOverlay({
            overlayId: 'gitshare-config',
            title: I18n.get('gitShare.config'),
            fields,
            submitLabel: 'Save',
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) {
                return;
            }
            const userName = values.userName?.trim() || undefined;
            const userEmail = values.userEmail?.trim() || undefined;
            const parsedRemoteUrls = (values.remoteUrls || '')
                .split(/[\n,]/)
                .map((item) => item.trim())
                .filter(Boolean);

            this.gitManager.updateGitConfig({
                userName,
                userEmail,
                remoteUrls: parsedRemoteUrls,
                remoteUrl: parsedRemoteUrls.length === 1 ? parsedRemoteUrls[0] : undefined
            });

            if (userName && userEmail) {
                await this.gitManager.configureUser(userName, userEmail);
            }
            if (parsedRemoteUrls.length > 0) {
                await this.gitManager.setRemotes(parsedRemoteUrls);
            }

            vscode.window.showInformationMessage(I18n.get('gitShare.configUpdated'));
        });
    }

    private async handleDeleteWithConfirm(section: SectionId, nodeId: string): Promise<void> {
        switch (section) {
            case 'launcher': {
                const key = nodeId.replace('launcher-', '');
                const { ConfigManager } = await import('../../launcher/core/configManager');
                const configManager = new ConfigManager();
                const config = configManager.getConfig();
                const instance = config.instances[key];
                if (!instance) {
                    return;
                }

                this.showConfirm({
                    confirmId: `delete-launcher-${key}`,
                    title: I18n.get('launcher.confirmDelete', instance.description || key),
                    message: I18n.get('launcher.confirmDelete', instance.description || key),
                    confirmLabel: I18n.get('skills.yes'),
                    cancelLabel: I18n.get('skills.no'),
                    danger: true
                }, async () => {
                    delete config.instances[key];
                    configManager.saveConfig(config);
                });
                break;
            }
            case 'skills': {
                const skillName = nodeId.replace('skill-', '').replace(/-children$/, '');
                const skills = SkillConfigManager.getInstance().loadAllSkills();
                const skill = skills.find((item) => item.meta.name === skillName);
                if (!skill) {
                    return;
                }

                this.showConfirm({
                    confirmId: `delete-skill-${skillName}`,
                    title: I18n.get('skills.confirmDelete', skillName),
                    message: I18n.get('skills.confirmDelete', skillName),
                    confirmLabel: I18n.get('skills.yes'),
                    cancelLabel: I18n.get('skills.no'),
                    danger: true
                }, async () => {
                    const success = SkillConfigManager.getInstance().deleteSkill(skillName);
                    if (success) {
                        vscode.window.showInformationMessage(I18n.get('skills.deleted', skillName));
                    }
                });
                break;
            }
            case 'commands': {
                const commandName = nodeId.replace('cmd-', '').replace(/-children$/, '');
                const commands = CommandConfigManager.getInstance().loadAllCommands();
                const command = commands.find((item) => item.meta.command === commandName);
                if (!command) {
                    return;
                }

                this.showConfirm({
                    confirmId: `delete-command-${commandName}`,
                    title: I18n.get('commands.confirmDelete', commandName),
                    message: I18n.get('commands.confirmDelete', commandName),
                    confirmLabel: I18n.get('skills.yes'),
                    cancelLabel: I18n.get('skills.no'),
                    danger: true
                }, async () => {
                    CommandConfigManager.getInstance().deleteCommand(commandName);
                    vscode.window.showInformationMessage(I18n.get('commands.deleted', commandName));
                });
                break;
            }
            case 'opencodeAuth': {
                const credentialId = nodeId.replace('opencode-', '');
                const { OpenCodeCopilotAuthConfigManager } = await import('../../opencode-copilot-auth/core/configManager');
                const configManager = new OpenCodeCopilotAuthConfigManager();
                const credential = configManager.getCredentialById(credentialId);
                if (!credential) {
                    return;
                }

                this.showConfirm({
                    confirmId: `delete-opencode-auth-${credential.id}`,
                    title: I18n.get('opencodeAuth.confirmDelete', credential.name),
                    message: I18n.get('opencodeAuth.confirmDelete', credential.name),
                    confirmLabel: I18n.get('skills.yes'),
                    cancelLabel: I18n.get('skills.no'),
                    danger: true
                }, async () => {
                    await vscode.commands.executeCommand('ampify.opencodeAuth.delete', credential.id);
                });
                break;
            }
        }
    }

    private updateAiTaggingProgress(target: 'skills' | 'commands', data: Omit<AiTaggingProgressData, 'target'>): void {
        this.aiTaggingProgress.set(target, {
            target,
            ...data
        });
        this.postProgressState(target);
    }

    private normalizeSection(section: SectionId): VisibleSectionId {
        if (section === 'launcher' || section === 'opencodeAuth') {
            return 'accountCenter';
        }
        return section;
    }

    private getAccountCenterTabBySection(section: SectionId): AccountCenterTabId | undefined {
        if (section === 'launcher') {
            return 'launcher';
        }
        if (section === 'opencodeAuth') {
            return 'auth';
        }
        return undefined;
    }

    private async postDependentSectionsAfterSettingChange(): Promise<void> {
        await this.sendSectionData('dashboard');
        if (this.activeSection !== 'dashboard' && this.activeSection !== 'accountCenter' && this.activeSection !== 'settings') {
            if (this.activeSection === 'skills') {
                await this.sendSectionData('skills');
            } else if (this.activeSection === 'commands') {
                await this.sendSectionData('commands');
            } else if (this.activeSection === 'gitshare') {
                await this.sendSectionData('gitshare');
            }
        }
    }

    private postMessage(message: ExtensionMessage): void {
        if (this.view) {
            void this.view.webview.postMessage(message);
        }
    }
}
