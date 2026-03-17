/**
 * Dashboard 数据桥接
 * 从各模块收集统计信息并组装仪表盘数据
 */
import * as vscode from 'vscode';
import type {
    DashboardData,
    DashboardStat,
    QuickAction,
    ModuleHealthItem,
    DashboardGitInfo,
    DashboardWorkspaceInfo,
    DashboardLabels,
    ModuleHealthStatus
} from '../shared/contracts';
import { I18n } from '../../../common/i18n';

export class DashboardBridge {
    async getData(): Promise<DashboardData> {
        const [stats, moduleHealth, gitInfo, workspaceInfo] =
            await Promise.all([
                this.collectStats(),
                this.collectModuleHealth(),
                this.collectGitInfo(),
                this.collectWorkspaceInfo()
            ]);
        const quickActions = this.getQuickActions();
        const labels = this.getLabels();
        return { stats, quickActions, moduleHealth, gitInfo, workspaceInfo, labels };
    }

    private async collectStats(): Promise<DashboardStat[]> {
        const stats: DashboardStat[] = [];

        // Skills 数量
        try {
            const { SkillConfigManager } = await import('../../skills/core/skillConfigManager');
            const configManager = SkillConfigManager.getInstance();
            const skills = configManager.loadAllSkills();
            stats.push({ label: I18n.get('dashboard.skillsCount'), value: skills.length, iconId: 'library', color: '#788c5d', targetSection: 'skills' });
        } catch {
            stats.push({ label: I18n.get('dashboard.skillsCount'), value: 0, iconId: 'library', color: '#788c5d', targetSection: 'skills' });
        }

        // Commands 数量
        try {
            const { CommandConfigManager } = await import('../../commands/core/commandConfigManager');
            const configManager = CommandConfigManager.getInstance();
            const commands = configManager.loadAllCommands();
            stats.push({ label: I18n.get('dashboard.commandsCount'), value: commands.length, iconId: 'terminal', color: '#d97757', targetSection: 'commands' });
        } catch {
            stats.push({ label: I18n.get('dashboard.commandsCount'), value: 0, iconId: 'terminal', color: '#d97757', targetSection: 'commands' });
        }

        // Git 状态
        try {
            const { GitManager } = await import('../../../common/git');
            const gitManager = new GitManager();
            const status = await gitManager.getStatus();
            const statusText = status.initialized
                ? (status.hasUncommittedChanges ? I18n.get('dashboard.gitHasChanges') : I18n.get('dashboard.gitClean'))
                : I18n.get('dashboard.gitNotInit');
            stats.push({ label: I18n.get('dashboard.gitStatus'), value: statusText, iconId: 'git-merge', color: status.hasUncommittedChanges ? '#d97757' : '#788c5d', targetSection: 'gitshare' });
        } catch {
            stats.push({ label: I18n.get('dashboard.gitStatus'), value: '-', iconId: 'git-merge', targetSection: 'gitshare' });
        }

        return stats;
    }

    private async collectModuleHealth(): Promise<ModuleHealthItem[]> {
        const items: ModuleHealthItem[] = [];

        // Skills
        try {
            const { SkillConfigManager } = await import('../../skills/core/skillConfigManager');
            const cm = SkillConfigManager.getInstance();
            const count = cm.loadAllSkills().length;
            items.push({ moduleId: 'skills', label: I18n.get('dashboard.skills'), status: count > 0 ? 'active' : 'inactive', detail: `${count} ${I18n.get('dashboard.skillsCount')}`, iconId: 'library', color: '#788c5d' });
        } catch {
            items.push({ moduleId: 'skills', label: I18n.get('dashboard.skills'), status: 'error', detail: I18n.get('dashboard.error'), iconId: 'library', color: '#f48771' });
        }

        // Commands
        try {
            const { CommandConfigManager } = await import('../../commands/core/commandConfigManager');
            const cm = CommandConfigManager.getInstance();
            const count = cm.loadAllCommands().length;
            items.push({ moduleId: 'commands', label: I18n.get('dashboard.commands'), status: count > 0 ? 'active' : 'inactive', detail: `${count} ${I18n.get('dashboard.commandsCount')}`, iconId: 'terminal', color: '#d97757' });
        } catch {
            items.push({ moduleId: 'commands', label: I18n.get('dashboard.commands'), status: 'error', detail: I18n.get('dashboard.error'), iconId: 'terminal', color: '#f48771' });
        }

        // Git Share
        try {
            const { GitManager } = await import('../../../common/git');
            const gm = new GitManager();
            const status = await gm.getStatus();
            let healthStatus: ModuleHealthStatus = 'inactive';
            let detail = I18n.get('dashboard.gitNotInit');
            if (status.initialized) {
                if (status.hasUncommittedChanges) { healthStatus = 'warning'; detail = I18n.get('dashboard.gitHasChanges'); }
                else { healthStatus = 'active'; detail = I18n.get('dashboard.gitClean'); }
            }
            items.push({ moduleId: 'gitshare', label: I18n.get('dashboard.gitShare'), status: healthStatus, detail, iconId: 'git-merge', color: healthStatus === 'warning' ? '#d97757' : healthStatus === 'active' ? '#788c5d' : '#717171' });
        } catch {
            items.push({ moduleId: 'gitshare', label: I18n.get('dashboard.gitShare'), status: 'error', detail: I18n.get('dashboard.error'), iconId: 'git-merge', color: '#f48771' });
        }

        return items;
    }

    private async collectGitInfo(): Promise<DashboardGitInfo> {
        const defaultInfo: DashboardGitInfo = { initialized: false, branch: '', remoteUrl: '', hasRemote: false, unpushedCount: 0, hasChanges: false, changedFileCount: 0 };
        try {
            const { GitManager } = await import('../../../common/git');
            const gm = new GitManager();
            const status = await gm.getStatus();
            return {
                initialized: status.initialized,
                branch: status.branch || '',
                remoteUrl: status.remoteUrl || '',
                hasRemote: status.hasRemote,
                unpushedCount: status.unpushedCommitCount,
                hasChanges: status.hasUncommittedChanges,
                changedFileCount: status.changedFiles
            };
        } catch {
            return defaultInfo;
        }
    }

    private async collectWorkspaceInfo(): Promise<DashboardWorkspaceInfo> {
        const defaultInfo: DashboardWorkspaceInfo = { workspaceName: I18n.get('dashboard.noWorkspace') };
        try {
            const folders = vscode.workspace.workspaceFolders;
            if (!folders || folders.length === 0) { return defaultInfo; }
            return { workspaceName: folders[0].name };
        } catch {
            return defaultInfo;
        }
    }

    private getLabels(): DashboardLabels {
        return {
            moduleHealth: I18n.get('dashboard.moduleHealth'),
            gitInfo: I18n.get('dashboard.gitInfo'),
            quickActions: I18n.get('dashboard.quickActions'),
            viewDetail: I18n.get('dashboard.viewDetail'),
            gitSync: I18n.get('dashboard.gitSync'),
            gitPull: I18n.get('dashboard.gitPull'),
            gitPush: I18n.get('dashboard.gitPush'),
            nextUp: I18n.get('dashboard.nextUp'),
        };
    }

    private getQuickActions(): QuickAction[] {
        return [
            { id: 'createSkill', label: I18n.get('dashboard.quickCreateSkill'), iconId: 'add', action: 'toolbar', section: 'skills', actionId: 'create' },
            { id: 'createCommand', label: I18n.get('dashboard.quickCreateCommand'), iconId: 'add', action: 'toolbar', section: 'commands', actionId: 'create' },
            { id: 'gitSync', label: I18n.get('dashboard.quickGitSync'), iconId: 'sync', command: 'ampify.gitShare.sync', action: 'command' },
        ];
    }
}
