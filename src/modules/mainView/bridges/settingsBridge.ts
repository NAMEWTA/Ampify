import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { GitManager } from '../../../common/git';
import {
    SettingsData,
    SettingsSection,
    SettingsScope
} from '../protocol';

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
                        value: config.get<string>('skills.injectTarget') || '.claude/skills/',
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: '.claude/skills/'
                    },
                    {
                        key: 'commands.injectTarget',
                        label: I18n.get('settings.commandsInject.label'),
                        description: I18n.get('settings.commandsInject.desc'),
                        value: config.get<string>('commands.injectTarget') || '.claude/commands/',
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: '.claude/commands/'
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
            },
            {
                id: 'modelProxy',
                title: I18n.get('settings.section.modelProxy'),
                fields: [
                    {
                        key: 'modelProxy.port',
                        label: I18n.get('settings.modelProxy.port.label'),
                        description: I18n.get('settings.modelProxy.port.desc'),
                        value: String(config.get<number>('modelProxy.port') || 18080),
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: '18080'
                    },
                    {
                        key: 'modelProxy.bindAddress',
                        label: I18n.get('settings.modelProxy.bindAddress.label'),
                        description: I18n.get('settings.modelProxy.bindAddress.desc'),
                        value: config.get<string>('modelProxy.bindAddress') || '127.0.0.1',
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: '127.0.0.1'
                    },

                ]
            }
        ];

        return { sections };
    }

    public async updateSetting(scope: SettingsScope, key: string, value: string): Promise<void> {
        if (scope === 'vscode') {
            const config = vscode.workspace.getConfiguration('ampify');
            const trimmed = value.trim();
            const finalValue = trimmed.length > 0 ? trimmed : undefined;
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
