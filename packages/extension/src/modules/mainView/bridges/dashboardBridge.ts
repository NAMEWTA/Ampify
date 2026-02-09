/**
 * Dashboard 数据桥接
 * 从各模块收集统计信息并组装仪表盘数据
 */
import * as vscode from 'vscode';
import type {
    DashboardData, DashboardStat, QuickAction,
    ModuleHealthItem, DashboardGitInfo, DashboardProxyInfo,
    DashboardWorkspaceInfo, DashboardLabels,
    ModuleHealthStatus, ModelProxyLogInfo,
    DashboardLauncherInfo, DashboardOpenCodeInfo
} from '@ampify/shared';
import { I18n } from '../../../common/i18n';

export class DashboardBridge {
    async getData(): Promise<DashboardData> {
        const [stats, moduleHealth, gitInfo, proxyInfo, workspaceInfo, recentLogs, launcher, opencode] =
            await Promise.all([
                this.collectStats(),
                this.collectModuleHealth(),
                this.collectGitInfo(),
                this.collectProxyInfo(),
                this.collectWorkspaceInfo(),
                this.collectRecentLogs(),
                this.getLauncherInfo(),
                this.getOpenCodeInfo()
            ]);
        const quickActions = this.getQuickActions();
        const labels = this.getLabels();
        return { stats, quickActions, moduleHealth, gitInfo, proxyInfo, workspaceInfo, recentLogs, labels, launcher, opencode };
    }

    private async collectStats(): Promise<DashboardStat[]> {
        const stats: DashboardStat[] = [];

        // Launcher 实例数
        try {
            const { ConfigManager } = await import('../../launcher/core/configManager');
            const configManager = new ConfigManager();
            const config = configManager.getConfig();
            const count = Object.keys(config.instances).length;
            stats.push({ label: I18n.get('dashboard.launcherInstances'), value: count, iconId: 'rocket', color: '#6a9bcc', targetSection: 'launcher' });
        } catch {
            stats.push({ label: I18n.get('dashboard.launcherInstances'), value: 0, iconId: 'rocket', color: '#6a9bcc', targetSection: 'launcher' });
        }

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
        // OpenCode Auth 凭据数
        try {
            const { OpenCodeCopilotAuthConfigManager } = await import('../../opencode-copilot-auth/core/configManager');
            const cm = new OpenCodeCopilotAuthConfigManager();
            const count = cm.getCredentials().length;
            stats.push({ label: I18n.get('dashboard.opencode'), value: count, iconId: 'key', color: '#c586c0', targetSection: 'opencodeAuth' });
        } catch {
            stats.push({ label: I18n.get('dashboard.opencode'), value: 0, iconId: 'key', color: '#c586c0', targetSection: 'opencodeAuth' });
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

        // Proxy 状态
        try {
            const { ProxyConfigManager } = await import('../../modelProxy/core/proxyConfigManager');
            const configManager = ProxyConfigManager.getInstance();
            const port = configManager.getPort();
            let running = false;
            try {
                const { getProxyServer } = await import('../../modelProxy');
                const server = getProxyServer();
                running = server?.running ?? false;
            } catch { /* ignore */ }
            stats.push({
                label: I18n.get('dashboard.proxyStatus'),
                value: running ? `${I18n.get('dashboard.proxyRunning')} :${port}` : I18n.get('dashboard.proxyStopped'),
                iconId: running ? 'radio-tower' : 'debug-disconnect',
                color: running ? '#89d185' : '#f48771',
                targetSection: 'modelProxy'
            });
        } catch {
            stats.push({ label: I18n.get('dashboard.proxyStatus'), value: '-', iconId: 'debug-disconnect', color: '#f48771', targetSection: 'modelProxy' });
        }

        // 今日 Proxy 请求和 Token
        try {
            const { LogManager } = await import('../../modelProxy/core/logManager');
            const logManager = new LogManager();
            const todayStats = logManager.getTodayStats();
            stats.push({ label: I18n.get('dashboard.proxyRequests'), value: todayStats.requests, iconId: 'pulse', color: '#4fc1ff', targetSection: 'modelProxy' });
            stats.push({ label: I18n.get('dashboard.proxyTokens'), value: todayStats.tokens, iconId: 'symbol-key', color: '#dcdcaa', targetSection: 'modelProxy' });
        } catch {
            stats.push({ label: I18n.get('dashboard.proxyRequests'), value: 0, iconId: 'pulse', color: '#4fc1ff', targetSection: 'modelProxy' });
            stats.push({ label: I18n.get('dashboard.proxyTokens'), value: 0, iconId: 'symbol-key', color: '#dcdcaa', targetSection: 'modelProxy' });
        }

        return stats;
    }

    private async collectModuleHealth(): Promise<ModuleHealthItem[]> {
        const items: ModuleHealthItem[] = [];

        // Launcher
        try {
            const { ConfigManager } = await import('../../launcher/core/configManager');
            const cm = new ConfigManager();
            const count = Object.keys(cm.getConfig().instances).length;
            items.push({ moduleId: 'launcher', label: I18n.get('dashboard.launcher'), status: count > 0 ? 'active' : 'inactive', detail: `${count} ${I18n.get('dashboard.launcherInstances')}`, iconId: 'rocket', color: '#6a9bcc' });
        } catch {
            items.push({ moduleId: 'launcher', label: I18n.get('dashboard.launcher'), status: 'error', detail: I18n.get('dashboard.error'), iconId: 'rocket', color: '#f48771' });
        }

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

        // Model Proxy
        try {
            let running = false;
            try {
                const { getProxyServer } = await import('../../modelProxy');
                const server = getProxyServer();
                running = server?.running ?? false;
            } catch { /* ignore */ }
            items.push({ moduleId: 'modelProxy', label: I18n.get('dashboard.modelProxy'), status: running ? 'active' : 'inactive', detail: running ? I18n.get('dashboard.proxyRunning') : I18n.get('dashboard.proxyStopped'), iconId: 'radio-tower', color: running ? '#89d185' : '#717171' });
        } catch {
            items.push({ moduleId: 'modelProxy', label: I18n.get('dashboard.modelProxy'), status: 'error', detail: I18n.get('dashboard.error'), iconId: 'radio-tower', color: '#f48771' });
        }

        // OpenCode Auth
        try {
            const { OpenCodeCopilotAuthConfigManager } = await import('../../opencode-copilot-auth/core/configManager');
            const cm = new OpenCodeCopilotAuthConfigManager();
            const count = cm.getCredentials().length;
            const activeId = cm.getActiveId();
            const detail = activeId
                ? `${count} credentials, active: ${cm.getCredentialById(activeId)?.name || activeId}`
                : `${count} credentials`;
            items.push({ moduleId: 'opencodeAuth', label: I18n.get('dashboard.opencode'), status: count > 0 ? 'active' : 'inactive', detail, iconId: 'key', color: '#c586c0' });
        } catch {
            items.push({ moduleId: 'opencodeAuth', label: I18n.get('dashboard.opencode'), status: 'inactive', detail: '0 credentials', iconId: 'key', color: '#717171' });
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

    private async collectProxyInfo(): Promise<DashboardProxyInfo> {
        const defaultInfo: DashboardProxyInfo = { running: false, port: 0, baseUrl: '', todayRequests: 0, todayTokens: 0, todayErrors: 0, avgLatencyMs: 0, bindingCount: 0 };
        try {
            const { ProxyConfigManager } = await import('../../modelProxy/core/proxyConfigManager');
            const configManager = ProxyConfigManager.getInstance();
            const port = configManager.getPort();
            const bindAddress = configManager.getBindAddress();
            const config = configManager.getConfig();

            let running = false;
            try {
                const { getProxyServer } = await import('../../modelProxy');
                const server = getProxyServer();
                running = server?.running ?? false;
            } catch { /* ignore */ }

            const { LogManager } = await import('../../modelProxy/core/logManager');
            const logManager = new LogManager();
            const todayStats = logManager.getTodayStats();

            return {
                running,
                port,
                baseUrl: `http://${bindAddress}:${port}`,
                todayRequests: todayStats.requests,
                todayTokens: todayStats.tokens,
                todayErrors: todayStats.errors,
                avgLatencyMs: todayStats.avgLatencyMs,
                bindingCount: config.apiKeyBindings?.length || 0
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

    private async collectRecentLogs(): Promise<ModelProxyLogInfo[]> {
        try {
            const { LogManager } = await import('../../modelProxy/core/logManager');
            const logManager = new LogManager();
            return logManager.getRecentLogs(10).map(log => ({
                timestamp: log.timestamp,
                requestId: log.requestId || '',
                format: log.format,
                model: log.model || '?',
                durationMs: log.durationMs,
                inputTokens: log.inputTokens,
                outputTokens: log.outputTokens,
                status: log.status,
                error: log.error
            }));
        } catch {
            return [];
        }
    }

    private async getLauncherInfo(): Promise<DashboardLauncherInfo | undefined> {
        try {
            const { ConfigManager } = await import('../../launcher/core/configManager');
            const configManager = new ConfigManager();
            const config = configManager.getConfig();
            const keys = Object.keys(config.instances);
            if (keys.length === 0) return undefined;

            const { instanceKey } = await import('../../../extension');
            const lastKey = configManager.getLastUsedKey();
            const lastAt = configManager.getLastUsedAt();
            const lastIndex = lastKey ? keys.indexOf(lastKey) : -1;
            const nextIndex = (lastIndex + 1) % keys.length;
            const nextKey = keys[nextIndex];
            const nextInstance = config.instances[nextKey];
            const activeKey = instanceKey || lastKey;
            const activeInstance = activeKey ? config.instances[activeKey] : undefined;

            return {
                total: keys.length,
                lastKey,
                lastLabel: activeKey ? (activeInstance?.description || activeKey) : undefined,
                lastAt: lastAt,
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
            const cm = new OpenCodeCopilotAuthConfigManager();
            const credentials = cm.getCredentials();
            if (credentials.length === 0) return undefined;

            const activeId = cm.getActiveId();
            const activeCred = activeId ? cm.getCredentialById(activeId) : undefined;
            const lastSwitchedAt = cm.getLastSwitchedAt();

            // Compute next credential (round-robin)
            const ids = credentials.map(c => c.id);
            const lastSwitchedId = cm.getLastSwitchedId();
            const lastIdx = lastSwitchedId ? ids.indexOf(lastSwitchedId) : -1;
            const nextIdx = (lastIdx + 1) % ids.length;
            const nextCred = credentials[nextIdx];

            return {
                total: credentials.length,
                lastId: activeId || undefined,
                lastLabel: activeCred?.name,
                lastAt: lastSwitchedAt || undefined,
                nextId: nextCred?.id,
                nextLabel: nextCred?.name
            };
        } catch {
            return undefined;
        }
    }

    private getLabels(): DashboardLabels {
        return {
            moduleHealth: I18n.get('dashboard.moduleHealth'),
            gitInfo: I18n.get('dashboard.gitInfo'),
            proxyPanel: I18n.get('dashboard.proxyPanel'),
            proxyRunning: I18n.get('dashboard.proxyRunning'),
            quickActions: I18n.get('dashboard.quickActions'),
            viewDetail: I18n.get('dashboard.viewDetail'),
            copyBaseUrl: I18n.get('dashboard.copyBaseUrl'),
            gitSync: I18n.get('dashboard.gitSync'),
            gitPull: I18n.get('dashboard.gitPull'),
            gitPush: I18n.get('dashboard.gitPush'),
            recentLogs: I18n.get('modelProxy.recentLogs'),
            viewAllLogs: I18n.get('modelProxy.viewAllLogs'),
            noLogs: I18n.get('modelProxy.noLogs'),
            logTime: I18n.get('modelProxy.logTime'),
            nextUp: I18n.get('dashboard.nextUp'),
            launcher: I18n.get('dashboard.launcher'),
            opencode: I18n.get('dashboard.opencode'),
            switchNow: I18n.get('dashboard.switchNow'),
            lastSwitched: I18n.get('dashboard.lastSwitched'),
            nextAccount: I18n.get('dashboard.nextAccount'),
            activeAccount: I18n.get('dashboard.activeAccount'),
        };
    }

    private getQuickActions(): QuickAction[] {
        return [
            { id: 'launch', label: I18n.get('dashboard.quickLaunch'), iconId: 'rocket', action: 'toolbar', section: 'launcher', actionId: 'add' },
            { id: 'createSkill', label: I18n.get('dashboard.quickCreateSkill'), iconId: 'add', action: 'toolbar', section: 'skills', actionId: 'create' },
            { id: 'createCommand', label: I18n.get('dashboard.quickCreateCommand'), iconId: 'add', action: 'toolbar', section: 'commands', actionId: 'create' },
            { id: 'gitSync', label: I18n.get('dashboard.quickGitSync'), iconId: 'sync', command: 'ampify.gitShare.sync', action: 'command' },
            { id: 'toggleProxy', label: I18n.get('dashboard.quickToggleProxy'), iconId: 'radio-tower', command: 'ampify.modelProxy.toggle', action: 'command' },
        ];
    }
}
