import * as vscode from 'vscode';
import * as path from 'path';
import { GitManager } from '../../../common/git';
import { GitStatus } from '../../../common/types';
import { I18n } from '../../../common/i18n';
import { getGitShareDir } from '../../../common/paths';

interface SyncedModule {
    name: string;
    displayName: string;
    relativePath: string;
    description: string;
}

function getSyncedModules(): SyncedModule[] {
    return [
        {
            name: 'vscodeskillsmanager',
            displayName: 'Skills',
            relativePath: 'vscodeskillsmanager/skills',
            description: 'AI Skills 技能库'
        },
        {
            name: 'vscodecmdmanager',
            displayName: 'Commands',
            relativePath: 'vscodecmdmanager/commands',
            description: '自定义命令库'
        }
    ];
}

type TreeItemType =
    | 'group'
    | 'configItem'
    | 'gitConfigItem'
    | 'gitStatusItem'
    | 'syncedModuleItem';

export class GitShareTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: TreeItemType,
        public readonly data?: unknown
    ) {
        super(label, collapsibleState);
        this.contextValue = itemType;
    }
}

export class GitShareTreeProvider implements vscode.TreeDataProvider<GitShareTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<GitShareTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private cachedGitStatus: GitStatus | null = null;
    private gitManager: GitManager;

    constructor() {
        this.gitManager = new GitManager();
    }

    public getGitManager(): GitManager {
        return this.gitManager;
    }

    refresh(): void {
        this.cachedGitStatus = null;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GitShareTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: GitShareTreeItem): Promise<GitShareTreeItem[]> {
        if (!element) {
            return this.getRootChildren();
        }

        switch (element.itemType) {
            case 'group':
                if (element.label === I18n.get('gitShare.gitSettings')) {
                    return this.getGitSettingsChildren();
                } else if (element.label === I18n.get('gitShare.syncedModules')) {
                    return this.getSyncedModulesChildren();
                }
                break;
        }

        return [];
    }

    private async getRootChildren(): Promise<GitShareTreeItem[]> {
        const items: GitShareTreeItem[] = [];

        const repoPathItem = new GitShareTreeItem(
            I18n.get('gitShare.repoPath'),
            vscode.TreeItemCollapsibleState.None,
            'configItem'
        );
        repoPathItem.description = getGitShareDir();
        repoPathItem.iconPath = new vscode.ThemeIcon('folder-library');
        repoPathItem.tooltip = `Git 仓库路径: ${getGitShareDir()}`;
        repoPathItem.command = {
            command: 'ampify.gitShare.openFolder',
            title: 'Open Folder'
        };
        items.push(repoPathItem);

        const gitSettingsItem = new GitShareTreeItem(
            I18n.get('gitShare.gitSettings'),
            vscode.TreeItemCollapsibleState.Expanded,
            'group'
        );
        gitSettingsItem.iconPath = new vscode.ThemeIcon('git-branch');
        items.push(gitSettingsItem);

        const syncedModulesItem = new GitShareTreeItem(
            I18n.get('gitShare.syncedModules'),
            vscode.TreeItemCollapsibleState.Expanded,
            'group'
        );
        syncedModulesItem.iconPath = new vscode.ThemeIcon('folder-library');
        items.push(syncedModulesItem);

        return items;
    }

    private async getGitSettingsChildren(): Promise<GitShareTreeItem[]> {
        const items: GitShareTreeItem[] = [];
        const config = this.gitManager.getConfig();
        const gitConfig = config.gitConfig || {};
        const remoteUrls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
            ? gitConfig.remoteUrls
            : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

        if (!this.cachedGitStatus) {
            this.cachedGitStatus = await this.gitManager.getStatus();
        }
        const status = this.cachedGitStatus;

        const configItem = new GitShareTreeItem(
            I18n.get('gitShare.config'),
            vscode.TreeItemCollapsibleState.None,
            'configItem'
        );
        configItem.iconPath = new vscode.ThemeIcon('settings-gear');
        configItem.command = {
            command: 'ampify.gitShare.openConfigWizard',
            title: 'Configure'
        };
        configItem.description = I18n.get('gitShare.clickToConfigure');
        items.push(configItem);

        const userNameItem = new GitShareTreeItem(
            I18n.get('gitShare.userName'),
            vscode.TreeItemCollapsibleState.None,
            'gitConfigItem',
            { field: 'userName', value: gitConfig.userName }
        );
        userNameItem.description = gitConfig.userName || I18n.get('gitShare.notConfigured');
        userNameItem.iconPath = new vscode.ThemeIcon('person');
        userNameItem.command = {
            command: 'ampify.gitShare.editConfig',
            title: 'Edit',
            arguments: ['userName']
        };
        items.push(userNameItem);

        const userEmailItem = new GitShareTreeItem(
            I18n.get('gitShare.userEmail'),
            vscode.TreeItemCollapsibleState.None,
            'gitConfigItem',
            { field: 'userEmail', value: gitConfig.userEmail }
        );
        userEmailItem.description = gitConfig.userEmail || I18n.get('gitShare.notConfigured');
        userEmailItem.iconPath = new vscode.ThemeIcon('mail');
        userEmailItem.command = {
            command: 'ampify.gitShare.editConfig',
            title: 'Edit',
            arguments: ['userEmail']
        };
        items.push(userEmailItem);

        const remoteUrlItem = new GitShareTreeItem(
            I18n.get('gitShare.remoteUrl'),
            vscode.TreeItemCollapsibleState.None,
            'gitConfigItem',
            { field: 'remoteUrl', value: gitConfig.remoteUrl }
        );
        if (remoteUrls.length === 0) {
            remoteUrlItem.description = I18n.get('gitShare.notConfigured');
        } else if (remoteUrls.length === 1) {
            remoteUrlItem.description = remoteUrls[0];
        } else {
            remoteUrlItem.description = `${remoteUrls.length} remotes`;
        }
        remoteUrlItem.iconPath = new vscode.ThemeIcon('cloud');
        remoteUrlItem.command = {
            command: 'ampify.gitShare.editConfig',
            title: 'Edit',
            arguments: ['remoteUrl']
        };
        if (remoteUrls.length > 1) {
            remoteUrlItem.tooltip = remoteUrls.join('\n');
        }
        items.push(remoteUrlItem);

        const statusItem = new GitShareTreeItem(
            I18n.get('gitShare.gitStatus'),
            vscode.TreeItemCollapsibleState.None,
            'gitStatusItem'
        );
        statusItem.description = this.getGitStatusDescription(status);
        statusItem.iconPath = this.getGitStatusIcon(status);
        statusItem.tooltip = this.getGitStatusTooltip(status);
        items.push(statusItem);

        return items;
    }

    private getSyncedModulesChildren(): GitShareTreeItem[] {
        const items: GitShareTreeItem[] = [];
        const modules = getSyncedModules();

        for (const mod of modules) {
            const item = new GitShareTreeItem(
                mod.displayName,
                vscode.TreeItemCollapsibleState.None,
                'syncedModuleItem',
                mod
            );
            item.description = mod.relativePath;
            item.tooltip = `${mod.description}\n路径: ${path.join(getGitShareDir(), mod.relativePath)}`;
            item.iconPath = new vscode.ThemeIcon(mod.name === 'vscodeskillsmanager' ? 'book' : 'terminal');
            items.push(item);
        }

        return items;
    }

    private getGitStatusDescription(status: GitStatus): string {
        if (!status.initialized) {
            return I18n.get('gitShare.notInitialized');
        }

        const parts: string[] = [];
        if (status.branch) {
            parts.push(status.branch);
        }
        if (status.changedFiles > 0) {
            parts.push(`${status.changedFiles} changed`);
        }
        if (status.unpushedCommitCount > 0) {
            parts.push(`↑${status.unpushedCommitCount}`);
        }

        return parts.length > 0 ? parts.join(' | ') : 'Clean';
    }

    private getGitStatusIcon(status: GitStatus): vscode.ThemeIcon {
        if (!status.initialized) {
            return new vscode.ThemeIcon('circle-outline');
        }
        if (status.hasUncommittedChanges) {
            return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
        }
        if (status.unpushedCommitCount > 0) {
            return new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
        }
        return new vscode.ThemeIcon('check', new vscode.ThemeColor('gitDecoration.untrackedResourceForeground'));
    }

    private getGitStatusTooltip(status: GitStatus): string {
        const lines: string[] = [];

        lines.push(`Initialized: ${status.initialized ? 'Yes' : 'No'}`);
        if (status.branch) {
            lines.push(`Branch: ${status.branch}`);
        }
        lines.push(`Remote: ${status.hasRemote ? (status.remoteUrl || 'Yes') : 'No'}`);
        lines.push(`Changed Files: ${status.changedFiles}`);
        lines.push(`Uncommitted: ${status.hasUncommittedChanges ? 'Yes' : 'No'}`);
        lines.push(`Unpushed: ${status.unpushedCommitCount}`);

        return lines.join('\n');
    }
}