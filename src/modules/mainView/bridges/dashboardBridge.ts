/**
 * Dashboard 数据桥接
 * 从各模块收集统计信息并组装仪表盘数据
 */
import * as fs from 'fs';
import { DashboardActivityItem, DashboardData, DashboardLabels, DashboardLauncherInfo, DashboardModelProxyInfo, DashboardOpenCodeInfo, DashboardStat, QuickAction } from '../protocol';
import { I18n } from '../../../common/i18n';

export class DashboardBridge {
    async getData(): Promise<DashboardData> {
        const stats = await this.collectStats();
        const quickActions = this.getQuickActions();
        const launcher = await this.getLauncherInfo();
        const opencode = await this.getOpenCodeInfo();
        const activity = await this.getRecentActivity();
        const modelProxy = await this.getModelProxyInfo();
        return { stats, quickActions, launcher, opencode, activity, modelProxy, labels: this.getLabels() };
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
            { id: 'launch', label: I18n.get('dashboard.quickLaunch'), iconId: 'rocket', action: 'toolbar', section: 'launcher', actionId: 'add' },
            { id: 'createSkill', label: I18n.get('dashboard.quickCreateSkill'), iconId: 'add', action: 'toolbar', section: 'skills', actionId: 'create' },
            { id: 'createCommand', label: I18n.get('dashboard.quickCreateCommand'), iconId: 'add', action: 'toolbar', section: 'commands', actionId: 'create' },
            { id: 'gitSync', label: I18n.get('dashboard.quickGitSync'), iconId: 'sync', command: 'ampify.gitShare.sync', action: 'command' }
        ];
    }

    private async getLauncherInfo(): Promise<DashboardLauncherInfo | undefined> {
        try {
            const { ConfigManager } = await import('../../launcher/core/configManager');
            const configManager = new ConfigManager();
            const config = configManager.getConfig();
            const keys = Object.keys(config.instances);
            const lastKey = config.lastUsedKey;
            const lastInstance = lastKey ? config.instances[lastKey] : undefined;
            const nextKey = this.getNextKey(keys, lastKey);
            const nextInstance = nextKey ? config.instances[nextKey] : undefined;
            return {
                total: keys.length,
                lastKey,
                lastLabel: lastInstance?.description || lastKey,
                lastAt: config.lastUsedAt,
                nextKey,
                nextLabel: nextInstance?.description || nextKey
            };
        } catch {
            return undefined;
        }
    }

    private async getOpenCodeInfo(): Promise<DashboardOpenCodeInfo | undefined> {
        try {
            const { OpenCodeCopilotAuthConfigManager } = await import('../../opencode-copilot-auth/core/configManager');
            const configManager = new OpenCodeCopilotAuthConfigManager();
            const credentials = configManager.getCredentials();
            const lastId = configManager.getLastSwitchedId() || configManager.getActiveId();
            const lastCredential = lastId ? credentials.find((cred) => cred.id === lastId) : undefined;
            const nextId = this.getNextId(credentials.map((cred) => cred.id), lastId);
            const nextCredential = nextId ? credentials.find((cred) => cred.id === nextId) : undefined;
            return {
                total: credentials.length,
                lastId,
                lastLabel: lastCredential?.name,
                lastAt: configManager.getLastSwitchedAt(),
                nextId,
                nextLabel: nextCredential?.name
            };
        } catch {
            return undefined;
        }
    }

    private async getRecentActivity(): Promise<DashboardActivityItem[]> {
        const items: DashboardActivityItem[] = [];

        try {
            const { SkillConfigManager } = await import('../../skills/core/skillConfigManager');
            const configManager = SkillConfigManager.getInstance();
            const skills = configManager.loadAllSkills();
            for (const skill of skills) {
                const skillPath = skill.skillMdPath || skill.path;
                const timestamp = this.getFileMtime(skillPath);
                if (!timestamp) {
                    continue;
                }
                items.push({
                    id: `skill:${skill.meta.name}`,
                    type: 'skill',
                    label: skill.meta.name,
                    description: skill.meta.description,
                    timestamp
                });
            }
        } catch {
            // ignore
        }

        try {
            const { CommandConfigManager } = await import('../../commands/core/commandConfigManager');
            const configManager = CommandConfigManager.getInstance();
            const commands = configManager.loadAllCommands();
            for (const command of commands) {
                const timestamp = this.getFileMtime(command.path);
                if (!timestamp) {
                    continue;
                }
                items.push({
                    id: `command:${command.meta.command}`,
                    type: 'command',
                    label: command.meta.command,
                    description: command.meta.description,
                    timestamp
                });
            }
        } catch {
            // ignore
        }

        return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
    }

    private async getModelProxyInfo(): Promise<DashboardModelProxyInfo | undefined> {
        try {
            const { ProxyConfigManager } = await import('../../modelProxy/core/proxyConfigManager');
            const { LogManager } = await import('../../modelProxy/core/logManager');
            const configManager = ProxyConfigManager.getInstance();
            const logManager = new LogManager();
            let running = false;
            try {
                const { getProxyServer } = require('../../modelProxy/index');
                const server = getProxyServer();
                running = server?.running ?? false;
            } catch {
                running = false;
            }
            const bindAddress = configManager.getBindAddress();
            const port = configManager.getPort();
            const baseUrl = `http://${bindAddress}:${port}`;
            const recent = logManager.getRecentLogs(20);
            const lastError = recent.find((entry) => entry.status === 'error');
            const parsedErrorAt = lastError ? Date.parse(lastError.timestamp) : undefined;
            return {
                running,
                baseUrl,
                lastError: lastError?.error || lastError?.requestId,
                lastErrorAt: parsedErrorAt && !Number.isNaN(parsedErrorAt) ? parsedErrorAt : undefined
            };
        } catch {
            return undefined;
        }
    }

    private getLabels(): DashboardLabels {
        return {
            nextUp: I18n.get('dashboard.nextUp'),
            launcher: I18n.get('dashboard.launcherSection'),
            opencode: I18n.get('dashboard.opencodeSection'),
            switchNow: I18n.get('dashboard.switchNow'),
            lastSwitched: I18n.get('dashboard.lastSwitched'),
            nextAccount: I18n.get('dashboard.nextAccount'),
            activeAccount: I18n.get('dashboard.activeAccount'),
            recentUpdates: I18n.get('dashboard.recentUpdates'),
            noRecentUpdates: I18n.get('dashboard.noRecentUpdates'),
            statsTitle: I18n.get('dashboard.statsTitle'),
            quickActionsTitle: I18n.get('dashboard.quickActionsTitle'),
            urlLabel: I18n.get('dashboard.urlLabel'),
            statusOk: I18n.get('dashboard.statusOk'),
            modelProxy: I18n.get('dashboard.modelProxy'),
            modelProxyRunning: I18n.get('dashboard.modelProxyRunning'),
            modelProxyStopped: I18n.get('dashboard.modelProxyStopped'),
            modelProxyLastError: I18n.get('dashboard.modelProxyLastError'),
            modelProxyHealthy: I18n.get('dashboard.modelProxyHealthy'),
            viewLauncher: I18n.get('dashboard.viewLauncher'),
            viewOpenCode: I18n.get('dashboard.viewOpenCode')
        };
    }

    private getNextKey(keys: string[], lastKey?: string): string | undefined {
        if (keys.length === 0) {
            return undefined;
        }
        const lastIndex = lastKey ? keys.indexOf(lastKey) : -1;
        const nextIndex = (lastIndex + 1) % keys.length;
        return keys[nextIndex];
    }

    private getNextId(ids: string[], lastId?: string): string | undefined {
        if (ids.length === 0) {
            return undefined;
        }
        const lastIndex = lastId ? ids.indexOf(lastId) : -1;
        const nextIndex = (lastIndex + 1) % ids.length;
        return ids[nextIndex];
    }

    private getFileMtime(filePath?: string): number | undefined {
        if (!filePath) {
            return undefined;
        }
        try {
            const stat = fs.statSync(filePath);
            return stat.mtimeMs;
        } catch {
            return undefined;
        }
    }
}
