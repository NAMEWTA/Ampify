/**
 * Dashboard 数据桥接
 * 从各模块收集统计信息并组装仪表盘数据
 */
import { DashboardData, DashboardStat, QuickAction } from '../protocol';
import { I18n } from '../../../common/i18n';

export class DashboardBridge {
    async getData(): Promise<DashboardData> {
        const stats = await this.collectStats();
        const quickActions = this.getQuickActions();
        return { stats, quickActions };
    }

    private async collectStats(): Promise<DashboardStat[]> {
        const stats: DashboardStat[] = [];

        // Launcher 实例数
        try {
            const { ConfigManager } = await import('../../launcher/core/configManager');
            const configManager = new ConfigManager();
            const config = configManager.getConfig();
            const count = Object.keys(config.instances).length;
            stats.push({
                label: I18n.get('dashboard.launcherInstances'),
                value: count,
                iconId: 'rocket',
                color: '#6a9bcc'
            });
        } catch {
            stats.push({ label: I18n.get('dashboard.launcherInstances'), value: 0, iconId: 'rocket', color: '#6a9bcc' });
        }

        // Skills 数量
        try {
            const { SkillConfigManager } = await import('../../skills/core/skillConfigManager');
            const configManager = SkillConfigManager.getInstance();
            const skills = configManager.loadAllSkills();
            stats.push({
                label: I18n.get('dashboard.skillsCount'),
                value: skills.length,
                iconId: 'library',
                color: '#788c5d'
            });
        } catch {
            stats.push({ label: I18n.get('dashboard.skillsCount'), value: 0, iconId: 'library', color: '#788c5d' });
        }

        // Commands 数量
        try {
            const { CommandConfigManager } = await import('../../commands/core/commandConfigManager');
            const configManager = CommandConfigManager.getInstance();
            const commands = configManager.loadAllCommands();
            stats.push({
                label: I18n.get('dashboard.commandsCount'),
                value: commands.length,
                iconId: 'terminal',
                color: '#d97757'
            });
        } catch {
            stats.push({ label: I18n.get('dashboard.commandsCount'), value: 0, iconId: 'terminal', color: '#d97757' });
        }

        // Git 状态
        try {
            const { GitManager } = await import('../../../common/git');
            const gitManager = new GitManager();
            const status = await gitManager.getStatus();
            const statusText = status.initialized
                ? (status.hasUncommittedChanges ? I18n.get('dashboard.gitHasChanges') : I18n.get('dashboard.gitClean'))
                : I18n.get('dashboard.gitNotInit');
            stats.push({
                label: I18n.get('dashboard.gitStatus'),
                value: statusText,
                iconId: 'git-merge',
                color: status.hasUncommittedChanges ? '#d97757' : '#788c5d'
            });
        } catch {
            stats.push({ label: I18n.get('dashboard.gitStatus'), value: '-', iconId: 'git-merge' });
        }

        return stats;
    }

    private getQuickActions(): QuickAction[] {
        return [
            { id: 'launch', label: I18n.get('dashboard.quickLaunch'), iconId: 'rocket', command: 'ampify.launcher.add' },
            { id: 'createSkill', label: I18n.get('dashboard.quickCreateSkill'), iconId: 'add', command: 'ampify.skills.create' },
            { id: 'createCommand', label: I18n.get('dashboard.quickCreateCommand'), iconId: 'add', command: 'ampify.commands.create' },
            { id: 'gitSync', label: I18n.get('dashboard.quickGitSync'), iconId: 'sync', command: 'ampify.gitShare.sync' }
        ];
    }
}
