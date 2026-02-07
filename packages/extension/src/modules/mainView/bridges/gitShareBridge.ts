/**
 * Git Share 数据桥接
 * 将 GitShare 模块数据适配为 TreeNode[]
 */
import * as vscode from 'vscode';
import * as path from 'path';
import type { TreeNode, ToolbarAction } from '@ampify/shared';
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

export class GitShareBridge {
    private gitManager: GitManager;

    constructor() {
        this.gitManager = new GitManager();
    }

    async getTreeData(): Promise<TreeNode[]> {
        const nodes: TreeNode[] = [];

        // 仓库路径
        nodes.push({
            id: 'gitshare-repopath',
            label: I18n.get('gitShare.repoPath'),
            description: getGitShareDir(),
            iconId: 'folder-library',
            nodeType: 'configItem',
            command: 'ampify.gitShare.openFolder',
            tooltip: `Git 仓库路径: ${getGitShareDir()}`
        });

        // Git 设置
        const gitSettingsChildren = await this.getGitSettingsNodes();
        nodes.push({
            id: 'gitshare-settings',
            label: I18n.get('gitShare.gitSettings'),
            iconId: 'git-branch',
            collapsible: true,
            expanded: true,
            children: gitSettingsChildren,
            nodeType: 'group'
        });

        // 同步模块
        const syncedModulesChildren = this.getSyncedModulesNodes();
        nodes.push({
            id: 'gitshare-modules',
            label: I18n.get('gitShare.syncedModules'),
            iconId: 'folder-library',
            collapsible: true,
            expanded: true,
            children: syncedModulesChildren,
            nodeType: 'group'
        });

        return nodes;
    }

    getToolbar(): ToolbarAction[] {
        return [
            { id: 'sync', label: 'Sync', iconId: 'sync', command: 'ampify.gitShare.sync' },
            { id: 'pull', label: 'Pull', iconId: 'cloud-download', command: 'ampify.gitShare.pull' },
            { id: 'push', label: 'Push', iconId: 'cloud-upload', command: 'ampify.gitShare.push' },
            { id: 'commit', label: 'Commit', iconId: 'git-commit', command: '', action: 'overlay' },
            { id: 'showDiff', label: 'Show Changes', iconId: 'diff', command: 'ampify.gitShare.showDiff' },
            { id: 'refresh', label: 'Refresh', iconId: 'refresh', command: 'ampify.gitShare.refresh' },
            { id: 'openFolder', label: 'Open Folder', iconId: 'folder-opened', command: 'ampify.gitShare.openFolder' }
        ];
    }

    async executeAction(actionId: string, _nodeId: string): Promise<void> {
        switch (actionId) {
            case 'configure':
                await vscode.commands.executeCommand('ampify.gitShare.openConfigWizard');
                break;
            case 'editConfig':
                await vscode.commands.executeCommand('ampify.gitShare.editConfig');
                break;
        }
    }

    private async getGitSettingsNodes(): Promise<TreeNode[]> {
        const nodes: TreeNode[] = [];
        const config = this.gitManager.getConfig();
        const gitConfig = config.gitConfig || {};
        const remoteUrls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
            ? gitConfig.remoteUrls
            : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

        const status = await this.gitManager.getStatus();

        // 配置向导
        nodes.push({
            id: 'gitshare-config-wizard',
            label: I18n.get('gitShare.config'),
            description: I18n.get('gitShare.clickToConfigure'),
            iconId: 'settings-gear',
            nodeType: 'configItem',
            command: 'ampify.gitShare.openConfigWizard'
        });

        // 用户名
        nodes.push({
            id: 'gitshare-username',
            label: I18n.get('gitShare.userName'),
            description: gitConfig.userName || I18n.get('gitShare.notConfigured'),
            iconId: 'person',
            nodeType: 'gitConfigItem',
            command: 'ampify.gitShare.editConfig',
            commandArgs: JSON.stringify('userName')
        });

        // 邮箱
        nodes.push({
            id: 'gitshare-email',
            label: I18n.get('gitShare.userEmail'),
            description: gitConfig.userEmail || I18n.get('gitShare.notConfigured'),
            iconId: 'mail',
            nodeType: 'gitConfigItem',
            command: 'ampify.gitShare.editConfig',
            commandArgs: JSON.stringify('userEmail')
        });

        // 远程仓库
        let remoteDesc: string;
        if (remoteUrls.length === 0) {
            remoteDesc = I18n.get('gitShare.notConfigured');
        } else if (remoteUrls.length === 1) {
            remoteDesc = remoteUrls[0];
        } else {
            remoteDesc = `${remoteUrls.length} remotes`;
        }
        nodes.push({
            id: 'gitshare-remote',
            label: I18n.get('gitShare.remoteUrl'),
            description: remoteDesc,
            iconId: 'cloud',
            nodeType: 'gitConfigItem',
            command: 'ampify.gitShare.editConfig',
            commandArgs: JSON.stringify('remoteUrl'),
            tooltip: remoteUrls.length > 1 ? remoteUrls.join('\n') : undefined
        });

        // Git 状态
        nodes.push({
            id: 'gitshare-status',
            label: I18n.get('gitShare.gitStatus'),
            description: this.getGitStatusDescription(status),
            iconId: this.getGitStatusIconId(status),
            iconColor: this.getGitStatusColor(status),
            nodeType: 'gitStatusItem',
            tooltip: this.getGitStatusTooltip(status)
        });

        return nodes;
    }

    private getSyncedModulesNodes(): TreeNode[] {
        const modules = getSyncedModules();
        return modules.map(mod => ({
            id: `gitshare-module-${mod.name}`,
            label: mod.displayName,
            description: mod.relativePath,
            iconId: mod.name === 'vscodeskillsmanager' ? 'book' : 'terminal',
            nodeType: 'syncedModuleItem',
            tooltip: `${mod.description}\n路径: ${path.join(getGitShareDir(), mod.relativePath)}`
        }));
    }

    private getGitStatusDescription(status: GitStatus): string {
        if (!status.initialized) { return I18n.get('gitShare.notInitialized'); }
        const parts: string[] = [];
        if (status.branch) { parts.push(status.branch); }
        if (status.changedFiles > 0) { parts.push(`${status.changedFiles} changed`); }
        if (status.unpushedCommitCount > 0) { parts.push(`↑${status.unpushedCommitCount}`); }
        return parts.length > 0 ? parts.join(' | ') : 'Clean';
    }

    private getGitStatusIconId(status: GitStatus): string {
        if (!status.initialized) { return 'circle-outline'; }
        if (status.hasUncommittedChanges) { return 'circle-filled'; }
        if (status.unpushedCommitCount > 0) { return 'arrow-up'; }
        return 'check';
    }

    private getGitStatusColor(status: GitStatus): string | undefined {
        if (!status.initialized) { return undefined; }
        if (status.hasUncommittedChanges) { return 'var(--vscode-gitDecoration-modifiedResourceForeground)'; }
        if (status.unpushedCommitCount > 0) { return 'var(--vscode-gitDecoration-addedResourceForeground)'; }
        return 'var(--vscode-gitDecoration-untrackedResourceForeground)';
    }

    private getGitStatusTooltip(status: GitStatus): string {
        const lines: string[] = [];
        lines.push(`Initialized: ${status.initialized ? 'Yes' : 'No'}`);
        if (status.branch) { lines.push(`Branch: ${status.branch}`); }
        lines.push(`Remote: ${status.hasRemote ? (status.remoteUrl || 'Yes') : 'No'}`);
        lines.push(`Changed Files: ${status.changedFiles}`);
        lines.push(`Uncommitted: ${status.hasUncommittedChanges ? 'Yes' : 'No'}`);
        lines.push(`Unpushed: ${status.unpushedCommitCount}`);
        return lines.join('\n');
    }
}
