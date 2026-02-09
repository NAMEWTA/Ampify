/**
 * Ampify 统一视图 Provider
 * 单一 WebviewView 渲染所有模块
 */
import * as vscode from 'vscode';
import { getVueHtml } from './templates/vueHtmlTemplate';
import type {
    SectionId,
    WebviewMessage,
    ExtensionMessage,
    TreeNode,
    ToolbarAction,
    OverlayData,
    OverlayField,
    ConfirmData
} from '@ampify/shared';
import { DashboardBridge } from './bridges/dashboardBridge';
import { LauncherBridge } from './bridges/launcherBridge';
import { SkillsBridge } from './bridges/skillsBridge';
import { CommandsBridge } from './bridges/commandsBridge';
import { GitShareBridge } from './bridges/gitShareBridge';
import { ModelProxyBridge } from './bridges/modelProxyBridge';
import { SettingsBridge } from './bridges/settingsBridge';
import { OpenCodeAuthBridge } from './bridges/opencodeAuthBridge';
import { GitManager } from '../../common/git';
import { I18n } from '../../common/i18n';
import { SkillConfigManager } from '../skills/core/skillConfigManager';
import { CommandConfigManager } from '../commands/core/commandConfigManager';
import { instanceKey } from '../../extension';

export class AmpifyViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ampify-main-view';

    private _view?: vscode.WebviewView;
    private _activeSection: SectionId = 'dashboard';

    private dashboardBridge: DashboardBridge;
    private launcherBridge: LauncherBridge;
    private skillsBridge: SkillsBridge;
    private commandsBridge: CommandsBridge;
    private gitShareBridge: GitShareBridge;
    private modelProxyBridge: ModelProxyBridge;
    private settingsBridge: SettingsBridge;
    private opencodeAuthBridge: OpenCodeAuthBridge;
    private gitManager: GitManager;
    private lastAutoSyncAt = 0;
    private autoSyncInFlight?: Promise<void>;

    /** Pending overlay/confirm callbacks keyed by overlayId/confirmId */
    private pendingCallbacks = new Map<string, (values?: Record<string, string>) => Promise<void>>();

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.dashboardBridge = new DashboardBridge();
        this.launcherBridge = new LauncherBridge();
        this.skillsBridge = new SkillsBridge();
        this.commandsBridge = new CommandsBridge();
        this.gitShareBridge = new GitShareBridge();
        this.modelProxyBridge = new ModelProxyBridge();
        this.settingsBridge = new SettingsBridge();
        this.opencodeAuthBridge = new OpenCodeAuthBridge();
        this.gitManager = new GitManager();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.joinPath(this._extensionUri, 'out', 'webview'),
                vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons')
            ]
        };

        webviewView.webview.html = getVueHtml(
            webviewView.webview,
            this._extensionUri,
            this._activeSection,
            instanceKey
        );

        webviewView.webview.onDidReceiveMessage(
            (message: WebviewMessage) => this.handleMessage(message)
        );

        this.triggerAutoSync();
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.triggerAutoSync();
            }
        });
    }

    /**
     * 刷新当前活跃 section，或指定 section
     */
    public async refresh(section?: SectionId): Promise<void> {
        const target = section || this._activeSection;
        if (target === 'dashboard') {
            await this.sendDashboard();
        } else {
            await this.sendSectionData(target);
        }
    }

    // ==================== 消息处理 ====================

    private async handleMessage(msg: WebviewMessage): Promise<void> {
        switch (msg.type) {
            case 'ready':
                // 发送初始数据
                await this.sendDashboard();
                break;

            case 'switchSection':
                this._activeSection = msg.section;
                if (msg.section === 'dashboard') {
                    await this.sendDashboard();
                } else {
                    await this.sendSectionData(msg.section);
                }
                break;

            case 'executeCommand':
                if (msg.command) {
                    try {
                        if (msg.args) {
                            await vscode.commands.executeCommand(msg.command, JSON.parse(msg.args));
                        } else {
                            await vscode.commands.executeCommand(msg.command);
                        }
                        // 刷新当前 section
                        await this.refresh();
                    } catch (error) {
                        console.error('Command execution failed:', error);
                    }
                }
                break;

            case 'treeItemClick':
                await this.handleTreeItemClick(msg.section, msg.nodeId);
                break;

            case 'treeItemAction':
                await this.handleTreeItemAction(msg.section, msg.nodeId, msg.actionId);
                break;

            case 'toolbarAction':
                await this.handleToolbarAction(msg.section, msg.actionId);
                break;

            case 'dropFiles':
                await this.handleDrop(msg.section, msg.uris);
                break;

            case 'dropEmpty':
                await this.handleDropEmpty(msg.section);
                break;
            case 'changeSetting':
                await this.settingsBridge.updateSetting(msg.scope, msg.key, msg.value);
                break;

            case 'settingsAction':
                await this.handleSettingsAction(msg.command);
                break;

            // --- Quick Actions from Dashboard ---
            case 'quickAction':
                await this.handleQuickAction(msg.actionId, msg.section);
                break;

            // --- Overlay / Confirm ---
            case 'overlaySubmit':
                await this.handleOverlaySubmit(msg.overlayId, msg.values);
                break;

            case 'overlayCancel':
                this.pendingCallbacks.delete(msg.overlayId);
                break;

            case 'confirmResult':
                await this.handleConfirmResult(msg.confirmId, msg.confirmed);
                break;

            // --- Filter (fix: route through provider so bridge state is updated) ---
            case 'filterByKeyword':
                if (msg.section === 'skills') {
                    this.skillsBridge.setFilter(msg.keyword || undefined);
                } else if (msg.section === 'commands') {
                    this.commandsBridge.setFilter(msg.keyword || undefined);
                }
                await this.sendSectionData(msg.section);
                break;

            case 'filterByTags':
                if (msg.section === 'skills') {
                    this.skillsBridge.setFilter(undefined, msg.tags);
                } else if (msg.section === 'commands') {
                    this.commandsBridge.setFilter(undefined, msg.tags);
                }
                await this.sendSectionData(msg.section);
                break;

            case 'clearFilter':
                if (msg.section === 'skills') {
                    this.skillsBridge.clearFilter();
                } else if (msg.section === 'commands') {
                    this.commandsBridge.clearFilter();
                }
                await this.sendSectionData(msg.section);
                break;

            case 'toggleTag': {
                const bridge = msg.section === 'skills' ? this.skillsBridge
                    : msg.section === 'commands' ? this.commandsBridge : null;
                if (bridge) {
                    const current = bridge.getFilterState();
                    const currentTags = current.tags || [];
                    const tag = msg.tag;
                    const newTags = currentTags.includes(tag)
                        ? currentTags.filter(t => t !== tag)
                        : [...currentTags, tag];
                    if (newTags.length > 0) {
                        bridge.setFilter(current.keyword, newTags);
                    } else {
                        bridge.setFilter(current.keyword || undefined);
                    }
                    await this.sendSectionData(msg.section);
                }
                break;
            }

            // --- Model Proxy custom messages ---
            case 'selectProxyModel': {
                // Legacy: now handled via addBinding command
                await vscode.commands.executeCommand('ampify.modelProxy.addBinding');
                await this.sendModelProxyData();
                break;
            }

            case 'addProxyBinding': {
                await vscode.commands.executeCommand('ampify.modelProxy.addBinding');
                await this.sendModelProxyData();
                break;
            }

            case 'removeProxyBinding': {
                await this.modelProxyBridge.removeBinding(msg.bindingId);
                await this.sendModelProxyData();
                break;
            }

            case 'copyProxyBindingKey': {
                await this.modelProxyBridge.copyBindingKey(msg.bindingId);
                break;
            }

            case 'proxyAction': {
                await this.handleProxyAction(msg.actionId);
                break;
            }

            case 'requestLogFiles': {
                const files = this.modelProxyBridge.getLogFiles();
                this.postMessage({ type: 'updateLogFiles', files });
                break;
            }

            case 'queryLogs': {
                const result = this.modelProxyBridge.queryLogs(
                    msg.date, msg.page, msg.pageSize, msg.statusFilter, msg.keyword
                );
                this.postMessage({
                    type: 'updateLogQuery',
                    result,
                    date: msg.date,
                    statusFilter: msg.statusFilter,
                    keyword: msg.keyword
                });
                break;
            }

            // --- Card interactions ---
            case 'cardClick': {
                // Open primary file in editor
                const cards = msg.section === 'skills'
                    ? this.skillsBridge.getCardData()
                    : msg.section === 'commands'
                        ? this.commandsBridge.getCardData()
                        : msg.section === 'opencodeAuth'
                            ? this.opencodeAuthBridge.getCardData()
                            : [];
                const card = cards.find(c => c.id === msg.cardId);
                if (card?.primaryFilePath) {
                    try {
                        const uri = vscode.Uri.file(card.primaryFilePath);
                        await vscode.window.showTextDocument(uri, { preview: true });
                    } catch (error) {
                        console.error('Failed to open file:', error);
                    }
                }
                break;
            }

            case 'cardAction': {
                if (msg.section === 'skills') {
                    await this.skillsBridge.executeAction(msg.actionId, msg.cardId);
                    await this.sendSectionData('skills');
                } else if (msg.section === 'commands') {
                    await this.commandsBridge.executeAction(msg.actionId, msg.cardId);
                    await this.sendSectionData('commands');
                } else if (msg.section === 'opencodeAuth') {
                    await this.opencodeAuthBridge.executeAction(msg.actionId, msg.cardId);
                    await this.sendSectionData('opencodeAuth');
                }
                break;
            }

            case 'cardFileClick': {
                if (msg.filePath) {
                    try {
                        const uri = vscode.Uri.file(msg.filePath);
                        await vscode.window.showTextDocument(uri, { preview: true });
                    } catch (error) {
                        console.error('Failed to open file:', error);
                    }
                }
                break;
            }

        }
    }

    // ==================== 数据发送 ====================

    private async sendDashboard(): Promise<void> {
        const data = await this.dashboardBridge.getData();
        this.postMessage({ type: 'updateDashboard', data });
    }

    private async sendSectionData(section: SectionId): Promise<void> {
        let tree: TreeNode[] = [];
        let toolbar: ToolbarAction[] = [];

        switch (section) {
            case 'launcher':
                tree = this.launcherBridge.getTreeData();
                toolbar = this.launcherBridge.getToolbar();
                break;
            case 'skills': {
                tree = this.skillsBridge.getTreeData();
                toolbar = this.skillsBridge.getToolbar();
                const skillCards = this.skillsBridge.getCardData();
                const skillTags = this.skillsBridge.getAllTags();
                const skillActiveTags = this.skillsBridge.getActiveTags();
                this.postMessage({ type: 'updateSection', section, tree, toolbar, tags: skillTags, activeTags: skillActiveTags, cards: skillCards });
                return;
            }
            case 'commands': {
                tree = this.commandsBridge.getTreeData();
                toolbar = this.commandsBridge.getToolbar();
                const cmdCards = this.commandsBridge.getCardData();
                const cmdTags = this.commandsBridge.getAllTags();
                const cmdActiveTags = this.commandsBridge.getActiveTags();
                this.postMessage({ type: 'updateSection', section, tree, toolbar, tags: cmdTags, activeTags: cmdActiveTags, cards: cmdCards });
                return;
            }
            case 'gitshare':
                tree = await this.gitShareBridge.getTreeData();
                toolbar = this.gitShareBridge.getToolbar();
                break;
            case 'modelProxy':
                await this.sendModelProxyData();
                return;
            case 'opencodeAuth': {
                tree = this.opencodeAuthBridge.getTreeData();
                toolbar = this.opencodeAuthBridge.getToolbar();
                const authCards = this.opencodeAuthBridge.getCardData();
                this.postMessage({ type: 'updateSection', section, tree, toolbar, cards: authCards });
                return;
            }
            case 'settings':
                await this.sendSettings();
                return;
        }

        this.postMessage({ type: 'updateSection', section, tree, toolbar });
    }

    private async sendSettings(): Promise<void> {
        const data = this.settingsBridge.getSettingsData();
        this.postMessage({ type: 'updateSettings', data });
    }

    // ==================== 事件处理 ====================

    private async handleTreeItemClick(section: SectionId, nodeId: string): Promise<void> {
        // Find the node in current tree data to use nodeType
        const node = this.findNodeInTree(section, nodeId);

        switch (section) {
            case 'launcher': {
                await this.launcherBridge.executeAction('launch', nodeId);
                break;
            }
            case 'skills': {
                if (node?.nodeType === 'skillItem') {
                    await this.skillsBridge.executeAction('preview', nodeId);
                } else if (node?.nodeType === 'filterInfo') {
                    // Clear filter
                    this.skillsBridge.clearFilter();
                    await this.sendSectionData('skills');
                } else if (node?.nodeType === 'file') {
                    await this.skillsBridge.executeAction('openFile', nodeId);
                }
                break;
            }
            case 'commands': {
                if (node?.nodeType === 'commandItem') {
                    await this.commandsBridge.executeAction('open', nodeId);
                } else if (node?.nodeType === 'filterInfo') {
                    this.commandsBridge.clearFilter();
                    await this.sendSectionData('commands');
                }
                break;
            }
            case 'gitshare': {
                if (nodeId === 'gitshare-repopath') {
                    await vscode.commands.executeCommand('ampify.gitShare.openFolder');
                } else if (nodeId === 'gitshare-config-wizard') {
                    await this.showGitConfigOverlay();
                } else if (nodeId.startsWith('gitshare-')) {
                    const field = nodeId.replace('gitshare-', '');
                    if (['username', 'email', 'remote'].includes(field)) {
                        const fieldMap: Record<string, string> = {
                            'username': 'userName',
                            'email': 'userEmail',
                            'remote': 'remoteUrl'
                        };
                        await vscode.commands.executeCommand('ampify.gitShare.editConfig', fieldMap[field]);
                    }
                }
                break;
            }
            case 'modelProxy': {
                // Custom rendering handles clicks via proxyAction messages
                break;
            }
            case 'opencodeAuth': {
                if (node?.nodeType === 'credentialItem') {
                    await this.opencodeAuthBridge.executeAction('switch', nodeId);
                    await this.sendSectionData('opencodeAuth');
                }
                break;
            }
        }
    }

    /**
     * Find a node by ID in the current tree data for a section
     */
    private findNodeInTree(section: SectionId, nodeId: string): TreeNode | undefined {
        let tree: TreeNode[] = [];
        switch (section) {
            case 'skills': tree = this.skillsBridge.getTreeData(); break;
            case 'commands': tree = this.commandsBridge.getTreeData(); break;
            case 'launcher': tree = this.launcherBridge.getTreeData(); break;
            case 'opencodeAuth': tree = this.opencodeAuthBridge.getTreeData(); break;
        }
        return this.findNodeRecursive(tree, nodeId);
    }

    private findNodeRecursive(nodes: TreeNode[], nodeId: string): TreeNode | undefined {
        for (const node of nodes) {
            if (node.id === nodeId) { return node; }
            if (node.children) {
                const found = this.findNodeRecursive(node.children, nodeId);
                if (found) { return found; }
            }
        }
        return undefined;
    }

    private async handleTreeItemAction(section: SectionId, nodeId: string, actionId: string): Promise<void> {
        // Intercept delete actions → show confirm in WebView
        if (actionId === 'delete') {
            await this.handleDeleteWithConfirm(section, nodeId);
            return;
        }

        // Intercept clearFilter actions → clear bridge filter directly
        if (actionId === 'clearFilter') {
            if (section === 'skills') {
                this.skillsBridge.clearFilter();
                await this.sendSectionData('skills');
            } else if (section === 'commands') {
                this.commandsBridge.clearFilter();
                await this.sendSectionData('commands');
            }
            return;
        }

        switch (section) {
            case 'launcher':
                if (actionId === 'delete') {
                    await this.handleDeleteWithConfirm(section, nodeId);
                } else {
                    await this.launcherBridge.executeAction(actionId, nodeId);
                }
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
            case 'modelProxy':
                await this.modelProxyBridge.executeAction(actionId, nodeId);
                break;
            case 'opencodeAuth':
                await this.opencodeAuthBridge.executeAction(actionId, nodeId);
                break;
        }
        await this.refresh();
    }

    /**
     * Toolbar action handler — routes overlay triggers
     */
    private async handleToolbarAction(section: SectionId, actionId: string): Promise<void> {
        // Generic refresh — applies to all sections
        if (actionId === 'refresh') {
            await this.sendSectionData(section);
            return;
        }

        switch (section) {
            case 'skills':
                await this.handleSkillsToolbarAction(actionId);
                break;
            case 'commands':
                await this.handleCommandsToolbarAction(actionId);
                break;
            case 'launcher':
                await this.handleLauncherToolbarAction(actionId);
                break;
            case 'gitshare':
                await this.handleGitShareToolbarAction(actionId);
                break;
            case 'modelProxy':
                await this.handleModelProxyToolbarAction(actionId);
                break;
            case 'opencodeAuth':
                await this.handleOpenCodeAuthToolbarAction(actionId);
                break;
        }
    }

    private async handleSettingsAction(command: string): Promise<void> {
        switch (command) {
            case 'reloadWindow':
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
                break;
            case 'restartProxy':
                try {
                    // Stop if running
                    const { getProxyServer } = await import('../modelProxy/index');
                    const server = getProxyServer();
                    if (server?.running) {
                        await vscode.commands.executeCommand('ampify.modelProxy.stop');
                        // Small delay to ensure port is released
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                    await vscode.commands.executeCommand('ampify.modelProxy.start');
                    vscode.window.showInformationMessage(I18n.get('modelProxy.restartSuccess'));
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(I18n.get('modelProxy.restartFailed', msg));
                }
                await this.sendModelProxyData();
                break;
        }
    }

    private async handleQuickAction(actionId: string, section: SectionId): Promise<void> {
        this._activeSection = section;
        this.postMessage({ type: 'setActiveSection', section });
        await this.sendSectionData(section);

        setTimeout(() => {
            void this.handleToolbarAction(section, actionId);
        }, 150);
    }

    private async handleDrop(section: SectionId, uris: string[]): Promise<void> {
        if (!uris || uris.length === 0) {
            return;
        }

        // Filter to valid file:// URIs and deduplicate
        const validUris: vscode.Uri[] = [];
        for (const u of uris) {
            try {
                const parsed = vscode.Uri.parse(u);
                // Accept file:// scheme or bare paths
                if (parsed.scheme === 'file' || parsed.scheme === '' || parsed.scheme === 'untitled') {
                    validUris.push(parsed);
                }
            } catch {
                // Skip unparseable URIs
            }
        }

        if (validUris.length === 0) {
            vscode.window.showWarningMessage('No valid file paths found in the dropped items.');
            return;
        }

        try {
            if (section === 'skills') {
                await vscode.commands.executeCommand('ampify.skills.importFromUris', validUris);
            } else if (section === 'commands') {
                await vscode.commands.executeCommand('ampify.commands.importFromUris', validUris);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Import failed: ${msg}`);
        }
        await this.refresh();
    }

    private async handleDropEmpty(section: SectionId): Promise<void> {
        // When a drop event fires but no URIs could be extracted (iframe sandbox limitation),
        // fall back to opening the import dialog so the user's intent isn't lost.
        if (section === 'skills') {
            await vscode.commands.executeCommand('ampify.skills.import');
        } else if (section === 'commands') {
            await vscode.commands.executeCommand('ampify.commands.import');
        }
    }

    // ==================== Overlay / Confirm 管理 ====================

    private showOverlay(data: OverlayData, callback: (values?: Record<string, string>) => Promise<void>): void {
        this.pendingCallbacks.set(data.overlayId, callback);
        this.postMessage({ type: 'showOverlay', data });
    }

    private showConfirm(data: ConfirmData, callback: (values?: Record<string, string>) => Promise<void>): void {
        this.pendingCallbacks.set(data.confirmId, callback);
        this.postMessage({ type: 'showConfirm', data });
    }

    private async handleOverlaySubmit(overlayId: string, values: Record<string, string>): Promise<void> {
        const callback = this.pendingCallbacks.get(overlayId);
        this.pendingCallbacks.delete(overlayId);
        if (callback) {
            try {
                await callback(values);
            } catch (error) {
                console.error('Overlay submit handler error:', error);
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(msg);
            }
        }
        await this.refresh();
    }

    private async handleConfirmResult(confirmId: string, confirmed: boolean): Promise<void> {
        const callback = this.pendingCallbacks.get(confirmId);
        this.pendingCallbacks.delete(confirmId);
        if (confirmed && callback) {
            try {
                await callback();
            } catch (error) {
                console.error('Confirm handler error:', error);
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(msg);
            }
        }
        await this.refresh();
    }

    // ==================== Skills Toolbar Actions ====================

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
                    title: 'Search Skills',
                    fields,
                    submitLabel: 'Search',
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
            case 'import':
                await vscode.commands.executeCommand('ampify.skills.import');
                break;
            case 'openFolder':
                await vscode.commands.executeCommand('ampify.skills.openFolder');
                break;
            case 'syncAgentMd':
                await vscode.commands.executeCommand('ampify.skills.syncToAgentMd');
                break;
        }
    }

    private async showSkillCreateOverlay(): Promise<void> {
        const allTags = SkillConfigManager.getInstance().getAllTags();
        const predefinedTags = ['ai', 'backend', 'frontend', 'git', 'ci-cd', 'vue', 'react'];
        const tagOptions = [...new Set([...predefinedTags, ...allTags])].sort().map(t => ({ label: t, value: t }));

        const fields: OverlayField[] = [
            { key: 'name', label: I18n.get('skills.inputSkillName'), kind: 'text', required: true, placeholder: 'my-awesome-skill' },
            { key: 'description', label: I18n.get('skills.inputSkillDesc'), kind: 'textarea', required: true, placeholder: 'What this skill does. Use when...' },
            { key: 'tags', label: I18n.get('skills.selectTags'), kind: 'tags', options: tagOptions, placeholder: 'Type and press Enter...' }
        ];

        this.showOverlay({
            overlayId: 'skills-create',
            title: I18n.get('dashboard.quickCreateSkill'),
            fields,
            submitLabel: 'Create',
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) { return; }
            const name = values.name?.trim();
            const description = values.description?.trim();
            if (!name || !description) { return; }

            // Validate name
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

            // Use creator logic directly
            const { generateSkillMdContent } = await import('../skills/templates/skillMdTemplate');

            const meta = {
                name,
                description,
                tags: tags.length > 0 ? tags : undefined
            };

            const skillMdContent = generateSkillMdContent(meta);
            configManager.saveSkillMd(name, skillMdContent);

            // Open SKILL.md for editing
            const skillMdPath = configManager.getSkillPath(name) + '/SKILL.md';
            const doc = await vscode.workspace.openTextDocument(skillMdPath);
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(I18n.get('skills.skillCreated', name));
        });
    }

    // ==================== Commands Toolbar Actions ====================

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
                    title: 'Search Commands',
                    fields,
                    submitLabel: 'Search',
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
            case 'import':
                await vscode.commands.executeCommand('ampify.commands.import');
                break;
            case 'openFolder':
                await vscode.commands.executeCommand('ampify.commands.openFolder');
                break;
        }
    }

    private async showCommandCreateOverlay(): Promise<void> {
        const cmdConfigManager = CommandConfigManager.getInstance();
        const allTags = cmdConfigManager.getAllTags();
        const predefinedTags = ['code-generation', 'refactor', 'documentation', 'testing', 'debugging', 'analysis', 'review', 'database', 'api', 'frontend', 'backend', 'devops', 'workflow'];
        const tagOptions = [...new Set([...predefinedTags, ...allTags])].sort().map(t => ({ label: t, value: t }));

        const fields: OverlayField[] = [
            { key: 'name', label: I18n.get('commands.inputCommandName'), kind: 'text', required: true, placeholder: 'my-command' },
            { key: 'description', label: I18n.get('commands.inputCommandDesc'), kind: 'textarea', required: true, placeholder: 'A command that...' },
            { key: 'tags', label: I18n.get('commands.selectTags'), kind: 'tags', options: tagOptions, placeholder: 'Type and press Enter...' }
        ];

        this.showOverlay({
            overlayId: 'commands-create',
            title: I18n.get('dashboard.quickCreateCommand'),
            fields,
            submitLabel: 'Create',
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) { return; }
            const name = values.name?.trim();
            const description = values.description?.trim();
            if (!name || !description) { return; }

            // Validate
            if (!/^[a-z0-9-]+$/.test(name) || name.length > 64) {
                vscode.window.showErrorMessage(I18n.get('commands.nameValidation'));
                return;
            }
            const configMgr = CommandConfigManager.getInstance();
            if (configMgr.commandExists(name)) {
                vscode.window.showErrorMessage(I18n.get('commands.commandExists', name));
                return;
            }

            const tags = (values.tags || '').split(',').filter(Boolean);

            const { generateCommandMd } = await import('../commands/templates/commandMdTemplate');
            const content = generateCommandMd({ command: name, description, tags });
            configMgr.saveCommandMd(name, content);

            vscode.window.showInformationMessage(I18n.get('commands.commandCreated', name));

            // Open for editing
            const filePath = vscode.Uri.file(`${configMgr.getCommandsDir()}/${name}.md`);
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);
        });
    }

    // ==================== Launcher Toolbar Actions ====================

    private async handleLauncherToolbarAction(actionId: string): Promise<void> {
        switch (actionId) {
            case 'add':
                await this.showLauncherAddOverlay();
                break;
        }
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
            submitLabel: 'Add',
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) { return; }
            const name = values.name?.trim();
            const dirName = values.dirName?.trim();
            const desc = values.description?.trim();
            if (!name || !dirName) { return; }

            const { ConfigManager } = await import('../launcher/core/configManager');
            const configManager = new ConfigManager();
            const config = configManager.getConfig();
            config.instances[name] = {
                dirName,
                description: desc || `${name} Account`,
                vscodeArgs: ['--new-window']
            };
            configManager.saveConfig(config);
        });
    }

    // ==================== OpenCode Auth Toolbar Actions ====================

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
            submitLabel: 'Add',
            cancelLabel: I18n.get('skills.cancel')
        }, async (values) => {
            if (!values) { return; }
            const name = values.name?.trim();
            const accessToken = values.accessToken?.trim();
            if (!name || !accessToken) { return; }

            const { OpenCodeCopilotAuthConfigManager } = await import('../opencode-copilot-auth/core/configManager');
            const configManager = new OpenCodeCopilotAuthConfigManager();

            const expires = values.expiresAt ? new Date(values.expiresAt).getTime() : 0;
            configManager.addCredential(
                name,
                'github-copilot',
                accessToken,
                values.refreshToken?.trim() || '',
                expires
            );

            vscode.window.showInformationMessage(I18n.get('opencodeAuth.addSuccess', name));
        });
    }

    // ==================== Model Proxy Data ====================

    private async sendModelProxyData(): Promise<void> {
        const data = await this.modelProxyBridge.getDashboardData();
        const toolbar = await this.modelProxyBridge.getToolbar();
        // Send toolbar via standard updateSection (for toolbar buttons)
        this.postMessage({ type: 'updateSection', section: 'modelProxy', tree: [], toolbar });
        // Then send custom dashboard data
        this.postMessage({ type: 'updateModelProxy', data });
    }

    private async handleProxyAction(actionId: string): Promise<void> {
        switch (actionId) {
            case 'toggle':
                await vscode.commands.executeCommand('ampify.modelProxy.toggle');
                break;
            case 'copyUrl':
                await vscode.commands.executeCommand('ampify.modelProxy.copyBaseUrl');
                break;
            case 'copyKey':
                await vscode.commands.executeCommand('ampify.modelProxy.copyKey');
                break;
            case 'regenerateKey':
                await vscode.commands.executeCommand('ampify.modelProxy.regenerateKey');
                break;
            case 'addBinding':
                await vscode.commands.executeCommand('ampify.modelProxy.addBinding');
                break;
            case 'removeBinding':
                await vscode.commands.executeCommand('ampify.modelProxy.removeBinding');
                break;
            case 'openLogs':
                await vscode.commands.executeCommand('ampify.modelProxy.viewLogs');
                break;
        }
        await this.sendModelProxyData();
    }

    // ==================== Model Proxy Toolbar Actions ====================

    private async handleModelProxyToolbarAction(actionId: string): Promise<void> {
        switch (actionId) {
            case 'toggle':
                await vscode.commands.executeCommand('ampify.modelProxy.toggle');
                await this.sendModelProxyData();
                break;
            case 'refresh':
                await vscode.commands.executeCommand('ampify.modelProxy.refresh');
                await this.sendModelProxyData();
                break;
            case 'openLogs':
                await vscode.commands.executeCommand('ampify.modelProxy.viewLogs');
                break;
        }
    }

    // ==================== Git Share Toolbar Actions ====================

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
            if (!values) { return; }
            const userName = values.userName?.trim() || undefined;
            const userEmail = values.userEmail?.trim() || undefined;
            const parsedRemoteUrls = (values.remoteUrls || '')
                .split(/[\n,]/)
                .map((s: string) => s.trim())
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

    // ==================== Delete with WebView Confirm ====================

    private async handleDeleteWithConfirm(section: SectionId, nodeId: string): Promise<void> {
        switch (section) {
            case 'launcher': {
                const key = nodeId.replace('launcher-', '');
                const { ConfigManager } = await import('../launcher/core/configManager');
                const configManager = new ConfigManager();
                const config = configManager.getConfig();
                const instance = config.instances[key];
                if (!instance) { return; }

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
                const skill = skills.find(s => s.meta.name === skillName);
                if (!skill) { return; }

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
                const cmdName = nodeId.replace('cmd-', '').replace(/-children$/, '');
                const commands = CommandConfigManager.getInstance().loadAllCommands();
                const cmd = commands.find(c => c.meta.command === cmdName);
                if (!cmd) { return; }

                this.showConfirm({
                    confirmId: `delete-command-${cmdName}`,
                    title: I18n.get('commands.confirmDelete', cmdName),
                    message: I18n.get('commands.confirmDelete', cmdName),
                    confirmLabel: I18n.get('skills.yes'),
                    cancelLabel: I18n.get('skills.no'),
                    danger: true
                }, async () => {
                    CommandConfigManager.getInstance().deleteCommand(cmdName);
                    vscode.window.showInformationMessage(I18n.get('commands.deleted', cmdName));
                });
                break;
            }
            case 'opencodeAuth': {
                const credId = nodeId.replace('opencode-', '');
                const cred = this.opencodeAuthBridge['configManager'].getCredentialById(credId);
                if (!cred) { return; }

                this.showConfirm({
                    confirmId: `delete-opencode-${credId}`,
                    title: I18n.get('opencodeAuth.confirmDelete', cred.name),
                    message: I18n.get('opencodeAuth.confirmDelete', cred.name),
                    confirmLabel: I18n.get('skills.yes'),
                    cancelLabel: I18n.get('skills.no'),
                    danger: true
                }, async () => {
                    await vscode.commands.executeCommand('ampify.opencodeAuth.delete', credId);
                });
                break;
            }
        }
    }

    // ==================== 工具 ====================

    private postMessage(msg: ExtensionMessage): void {
        if (this._view) {
            this._view.webview.postMessage(msg);
        }
    }

    private async triggerAutoSync(): Promise<void> {
        const now = Date.now();
        if (now - this.lastAutoSyncAt < 30000) {
            return;
        }
        if (this.autoSyncInFlight) {
            return;
        }

        this.lastAutoSyncAt = now;

        const doSync = async (): Promise<void> => {
            try {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: I18n.get('gitShare.syncing'),
                        cancellable: false
                    },
                    async () => {
                        const result = await this.gitManager.sync();
                        if (!result.success) {
                            if (result.conflict) {
                                vscode.window.showErrorMessage(I18n.get('gitShare.mergeConflict'));
                            } else if (result.authError) {
                                vscode.window.showErrorMessage(I18n.get('gitShare.configureAuth'));
                            } else if (result.error) {
                                vscode.window.showErrorMessage(I18n.get('gitShare.syncFailed', result.error));
                            }
                        }
                        await this.refresh();
                    }
                );
            } finally {
                this.autoSyncInFlight = undefined;
            }
        };

        this.autoSyncInFlight = doSync();
        await this.autoSyncInFlight;
    }
}
