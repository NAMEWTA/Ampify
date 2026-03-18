import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { GitManager } from '../../../common/git';
import { getDefaultInjectTargetValue, normalizeInjectTargetValue } from '../../../common/injectTarget';
import {
    SettingsData,
    SettingsSection,
    SettingsScope
} from '../shared/contracts';

export class SettingsBridge {
    private gitManager: GitManager;

    constructor() {
        this.gitManager = new GitManager();
        this.gitManager.ensureInit();
    }

    public getSettingsData(): SettingsData {
        const config = vscode.workspace.getConfiguration('ampify');
        const gitConfig = this.gitManager.getConfig().gitConfig || {};
        const remoteUrls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
            ? gitConfig.remoteUrls
            : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

        const sections: SettingsSection[] = [
            {
                id: 'general',
                title: I18n.get('settings.section.general'),
                fields: [
                    {
                        key: 'rootDir',
                        label: I18n.get('settings.rootDir.label'),
                        description: I18n.get('settings.rootDir.desc'),
                        value: config.get<string>('rootDir') || '',
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: '~/.vscode-ampify/',
                        action: {
                            label: I18n.get('settings.applyReload'),
                            iconId: 'sync',
                            command: 'reloadWindow'
                        }
                    },
                    {
                        key: 'language',
                        label: I18n.get('settings.language.label'),
                        description: I18n.get('settings.language.desc'),
                        value: config.get<string>('language') || 'zh-cn',
                        kind: 'select',
                        scope: 'vscode',
                        options: [
                            { label: I18n.get('settings.language.en'), value: 'en' },
                            { label: I18n.get('settings.language.zh'), value: 'zh-cn' }
                        ]
                    }
                ]
            },
            {
                id: 'paths',
                title: I18n.get('settings.section.paths'),
                fields: [
                    {
                        key: 'skills.injectTarget',
                        label: I18n.get('settings.skillsInject.label'),
                        description: I18n.get('settings.skillsInject.desc'),
                        value: config.get<string>('skills.injectTarget') || getDefaultInjectTargetValue('skills'),
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: getDefaultInjectTargetValue('skills')
                    },
                    {
                        key: 'commands.injectTarget',
                        label: I18n.get('settings.commandsInject.label'),
                        description: I18n.get('settings.commandsInject.desc'),
                        value: config.get<string>('commands.injectTarget') || getDefaultInjectTargetValue('commands'),
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: getDefaultInjectTargetValue('commands')
                    },
                    {
                        key: 'agents.injectTarget',
                        label: I18n.get('settings.agentsInject.label'),
                        description: I18n.get('settings.agentsInject.desc'),
                        value: config.get<string>('agents.injectTarget') || getDefaultInjectTargetValue('agents'),
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: getDefaultInjectTargetValue('agents')
                    },
                    {
                        key: 'rules.injectTarget',
                        label: I18n.get('settings.rulesInject.label'),
                        description: I18n.get('settings.rulesInject.desc'),
                        value: config.get<string>('rules.injectTarget') || getDefaultInjectTargetValue('rules'),
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: getDefaultInjectTargetValue('rules')
                    }
                ]
            },
            {
                id: 'git',
                title: I18n.get('settings.section.git'),
                fields: [
                    {
                        key: 'userName',
                        label: I18n.get('settings.gitUserName.label'),
                        description: I18n.get('settings.gitUserName.desc'),
                        value: gitConfig.userName || '',
                        kind: 'text',
                        scope: 'git'
                    },
                    {
                        key: 'userEmail',
                        label: I18n.get('settings.gitUserEmail.label'),
                        description: I18n.get('settings.gitUserEmail.desc'),
                        value: gitConfig.userEmail || '',
                        kind: 'text',
                        scope: 'git'
                    },
                    {
                        key: 'remoteUrls',
                        label: I18n.get('settings.gitRemoteUrls.label'),
                        description: I18n.get('settings.gitRemoteUrls.desc'),
                        value: remoteUrls.join('\n'),
                        kind: 'textarea',
                        scope: 'git',
                        placeholder: 'https://github.com/user/repo.git'
                    }
                ]
            }
        ];

        return { sections };
    }

    public async updateSetting(scope: SettingsScope, key: string, value: string): Promise<void> {
        if (scope === 'vscode') {
            const config = vscode.workspace.getConfiguration('ampify');
            const trimmed = value.trim();
            const injectTargetKeyToKind = {
                'skills.injectTarget': 'skills',
                'commands.injectTarget': 'commands',
                'agents.injectTarget': 'agents',
                'rules.injectTarget': 'rules'
            } as const;
            const injectTargetKind = injectTargetKeyToKind[key as keyof typeof injectTargetKeyToKind];
            const finalValue = injectTargetKind
                ? normalizeInjectTargetValue(trimmed, injectTargetKind)
                : (trimmed.length > 0 ? trimmed : undefined);
            await config.update(key, finalValue, vscode.ConfigurationTarget.Global);
            return;
        }

        const config = this.gitManager.getConfig();
        const gitConfig = config.gitConfig || {};
        const trimmed = value.trim();

        switch (key) {
            case 'userName':
                gitConfig.userName = trimmed || undefined;
                break;
            case 'userEmail':
                gitConfig.userEmail = trimmed || undefined;
                break;
            case 'remoteUrls': {
                const urls = trimmed
                    .split(/[\n,]/)
                    .map(s => s.trim())
                    .filter(Boolean);
                gitConfig.remoteUrls = urls;
                gitConfig.remoteUrl = urls.length === 1 ? urls[0] : undefined;
                break;
            }
        }

        config.gitConfig = gitConfig;
        this.gitManager.saveConfig(config);

        if (gitConfig.userName && gitConfig.userEmail) {
            await this.gitManager.configureUser(gitConfig.userName, gitConfig.userEmail);
        }
        if (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0) {
            await this.gitManager.setRemotes(gitConfig.remoteUrls);
        }
    }
}
