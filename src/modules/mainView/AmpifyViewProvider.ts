/**
 * Ampify 统一视图 Provider
 * 单一 WebviewView 渲染所有模块
 */
import * as vscode from 'vscode';
import { getHtml } from './templates/htmlTemplate';
import {
    SectionId,
    WebviewMessage,
    ExtensionMessage,
    TreeNode,
    ToolbarAction
} from './protocol';
import { DashboardBridge } from './bridges/dashboardBridge';
import { LauncherBridge } from './bridges/launcherBridge';
import { SkillsBridge } from './bridges/skillsBridge';
import { CommandsBridge } from './bridges/commandsBridge';
import { GitShareBridge } from './bridges/gitShareBridge';
import { SettingsBridge } from './bridges/settingsBridge';
import { GitManager } from '../../common/git';
import { I18n } from '../../common/i18n';

export class AmpifyViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ampify-main-view';

    private _view?: vscode.WebviewView;
    private _activeSection: SectionId = 'dashboard';

    private dashboardBridge: DashboardBridge;
    private launcherBridge: LauncherBridge;
    private skillsBridge: SkillsBridge;
    private commandsBridge: CommandsBridge;
    private gitShareBridge: GitShareBridge;
    private settingsBridge: SettingsBridge;
    private gitManager: GitManager;
    private lastAutoSyncAt = 0;
    private autoSyncInFlight?: Promise<void>;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.dashboardBridge = new DashboardBridge();
        this.launcherBridge = new LauncherBridge();
        this.skillsBridge = new SkillsBridge();
        this.commandsBridge = new CommandsBridge();
        this.gitShareBridge = new GitShareBridge();
        this.settingsBridge = new SettingsBridge();
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
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = getHtml(
            webviewView.webview,
            this._extensionUri,
            this._activeSection
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
            case 'changeSetting':
                await this.settingsBridge.updateSetting(msg.scope, msg.key, msg.value);
                await this.sendSettings();
                break;
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
            case 'skills':
                tree = this.skillsBridge.getTreeData();
                toolbar = this.skillsBridge.getToolbar();
                break;
            case 'commands':
                tree = this.commandsBridge.getTreeData();
                toolbar = this.commandsBridge.getToolbar();
                break;
            case 'gitshare':
                tree = await this.gitShareBridge.getTreeData();
                toolbar = this.gitShareBridge.getToolbar();
                break;
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
        switch (section) {
            case 'launcher': {
                await this.launcherBridge.executeAction('launch', nodeId);
                break;
            }
            case 'skills': {
                if (nodeId.startsWith('skill-') && !nodeId.includes('-tags') && !nodeId.includes('-prereqs') && !nodeId.includes('-files')) {
                    await this.skillsBridge.executeAction('preview', nodeId);
                } else if (!nodeId.startsWith('skill-')) {
                    // 可能是文件路径
                    await this.skillsBridge.executeAction('openFile', nodeId);
                }
                break;
            }
            case 'commands': {
                if (nodeId.startsWith('cmd-') && !nodeId.includes('-desc') && !nodeId.includes('-tags')) {
                    await this.commandsBridge.executeAction('open', nodeId);
                }
                break;
            }
            case 'gitshare': {
                if (nodeId === 'gitshare-repopath') {
                    await vscode.commands.executeCommand('ampify.gitShare.openFolder');
                } else if (nodeId === 'gitshare-config-wizard') {
                    await vscode.commands.executeCommand('ampify.gitShare.openConfigWizard');
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
        }
    }

    private async handleTreeItemAction(section: SectionId, nodeId: string, actionId: string): Promise<void> {
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
        }
        // 操作后刷新
        await this.refresh();
    }

    private async handleToolbarAction(_section: SectionId, _actionId: string): Promise<void> {
        // toolbar 操作通过 executeCommand 处理
        await this.refresh();
    }

    private async handleDrop(section: SectionId, uris: string[]): Promise<void> {
        if (section === 'skills') {
            const vscodeUris = uris.map(u => vscode.Uri.parse(u));
            await vscode.commands.executeCommand('ampify.skills.importFromUris', vscodeUris);
        } else if (section === 'commands') {
            await this.commandsBridge.handleDrop(uris);
        }
        await this.refresh();
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
