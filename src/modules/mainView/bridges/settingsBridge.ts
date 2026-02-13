import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import * as path from 'path';
import { GitManager } from '../../../common/git';
import { getModuleDir, getRootDir } from '../../../common/paths';
import { SkillConfigManager } from '../../skills/core/skillConfigManager';
import { CommandConfigManager } from '../../commands/core/commandConfigManager';
import { AiTaggingConfig } from '../../../common/types';
import { parseTagLibraryText, stringifyTagLibraryText } from '../../../common/tagLibrary';
import {
    SettingsData,
    SettingsSection,
    SettingsScope
} from '../protocol';

export class SettingsBridge {
    private gitManager: GitManager;
    private skillConfigManager: SkillConfigManager;
    private commandConfigManager: CommandConfigManager;

    constructor() {
        this.gitManager = new GitManager();
        this.gitManager.ensureInit();
        this.skillConfigManager = SkillConfigManager.getInstance();
        this.commandConfigManager = CommandConfigManager.getInstance();
        this.skillConfigManager.ensureInit();
        this.commandConfigManager.ensureInit();
    }

    public getSettingsData(): SettingsData {
        const config = vscode.workspace.getConfiguration('ampify');
        const gitConfig = this.gitManager.getConfig().gitConfig || {};
        const remoteUrls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
            ? gitConfig.remoteUrls
            : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

        const rootDir = getRootDir();
        const opencodeAuthDir = getModuleDir('opencode-copilot-auth');
        const opencodeAuthRelative = path.relative(rootDir, opencodeAuthDir).replace(/\\/g, '/');
        const skillAi = this.skillConfigManager.getAiTaggingConfig();
        const commandAi = this.commandConfigManager.getAiTaggingConfig();

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
                        key: 'opencodeAuth.configDir',
                        label: I18n.get('settings.opencodeAuth.configDir.label'),
                        description: I18n.get('settings.opencodeAuth.configDir.desc'),
                        value: opencodeAuthRelative,
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: opencodeAuthRelative,
                        readOnly: true
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
                        value: config.get<string>('skills.injectTarget') || '.agents/skills/',
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: '.agents/skills/'
                    },
                    {
                        key: 'commands.injectTarget',
                        label: I18n.get('settings.commandsInject.label'),
                        description: I18n.get('settings.commandsInject.desc'),
                        value: config.get<string>('commands.injectTarget') || '.agents/commands/',
                        kind: 'text',
                        scope: 'vscode',
                        placeholder: '.agents/commands/'
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
            },
            {
                id: 'aiTagging',
                title: I18n.get('settings.section.aiTagging'),
                fields: [
                    {
                        key: 'aiTagging.provider',
                        label: I18n.get('settings.skillsAi.provider.label'),
                        description: I18n.get('settings.skillsAi.provider.desc'),
                        value: skillAi.provider,
                        kind: 'select',
                        scope: 'skills',
                        options: [
                            { label: I18n.get('aiTagging.provider.vscodeChat'), value: 'vscode-chat' },
                            { label: I18n.get('aiTagging.provider.openaiCompatible'), value: 'openai-compatible' }
                        ]
                    },
                    {
                        key: 'aiTagging.vscodeModelId',
                        label: I18n.get('settings.skillsAi.vscodeModelId.label'),
                        description: I18n.get('settings.skillsAi.vscodeModelId.desc'),
                        value: skillAi.vscodeModelId || '',
                        kind: 'text',
                        scope: 'skills'
                    },
                    {
                        key: 'aiTagging.openaiBaseUrl',
                        label: I18n.get('settings.skillsAi.openaiBaseUrl.label'),
                        description: I18n.get('settings.skillsAi.openaiBaseUrl.desc'),
                        value: skillAi.openaiBaseUrl || '',
                        kind: 'text',
                        scope: 'skills',
                        placeholder: 'https://api.openai.com/v1'
                    },
                    {
                        key: 'aiTagging.openaiApiKey',
                        label: I18n.get('settings.skillsAi.openaiApiKey.label'),
                        description: I18n.get('settings.skillsAi.openaiApiKey.desc'),
                        value: skillAi.openaiApiKey || '',
                        kind: 'text',
                        scope: 'skills'
                    },
                    {
                        key: 'aiTagging.openaiModel',
                        label: I18n.get('settings.skillsAi.openaiModel.label'),
                        description: I18n.get('settings.skillsAi.openaiModel.desc'),
                        value: skillAi.openaiModel || '',
                        kind: 'text',
                        scope: 'skills'
                    },
                    {
                        key: 'aiTagging.tagLibrary',
                        label: I18n.get('settings.skillsAi.tagLibrary.label'),
                        description: I18n.get('settings.skillsAi.tagLibrary.desc'),
                        value: stringifyTagLibraryText(skillAi.tagLibrary || []),
                        kind: 'textarea',
                        scope: 'skills'
                    },
                    {
                        key: 'aiTagging.provider',
                        label: I18n.get('settings.commandsAi.provider.label'),
                        description: I18n.get('settings.commandsAi.provider.desc'),
                        value: commandAi.provider,
                        kind: 'select',
                        scope: 'commands',
                        options: [
                            { label: I18n.get('aiTagging.provider.vscodeChat'), value: 'vscode-chat' },
                            { label: I18n.get('aiTagging.provider.openaiCompatible'), value: 'openai-compatible' }
                        ]
                    },
                    {
                        key: 'aiTagging.vscodeModelId',
                        label: I18n.get('settings.commandsAi.vscodeModelId.label'),
                        description: I18n.get('settings.commandsAi.vscodeModelId.desc'),
                        value: commandAi.vscodeModelId || '',
                        kind: 'text',
                        scope: 'commands'
                    },
                    {
                        key: 'aiTagging.openaiBaseUrl',
                        label: I18n.get('settings.commandsAi.openaiBaseUrl.label'),
                        description: I18n.get('settings.commandsAi.openaiBaseUrl.desc'),
                        value: commandAi.openaiBaseUrl || '',
                        kind: 'text',
                        scope: 'commands',
                        placeholder: 'https://api.openai.com/v1'
                    },
                    {
                        key: 'aiTagging.openaiApiKey',
                        label: I18n.get('settings.commandsAi.openaiApiKey.label'),
                        description: I18n.get('settings.commandsAi.openaiApiKey.desc'),
                        value: commandAi.openaiApiKey || '',
                        kind: 'text',
                        scope: 'commands'
                    },
                    {
                        key: 'aiTagging.openaiModel',
                        label: I18n.get('settings.commandsAi.openaiModel.label'),
                        description: I18n.get('settings.commandsAi.openaiModel.desc'),
                        value: commandAi.openaiModel || '',
                        kind: 'text',
                        scope: 'commands'
                    },
                    {
                        key: 'aiTagging.tagLibrary',
                        label: I18n.get('settings.commandsAi.tagLibrary.label'),
                        description: I18n.get('settings.commandsAi.tagLibrary.desc'),
                        value: stringifyTagLibraryText(commandAi.tagLibrary || []),
                        kind: 'textarea',
                        scope: 'commands'
                    }
                ]
            }
        ];

        return { sections };
    }

    public async updateSetting(scope: SettingsScope, key: string, value: string): Promise<void> {
        if (scope === 'vscode') {
            if (key === 'opencodeAuth.configDir') {
                return;
            }
            const config = vscode.workspace.getConfiguration('ampify');
            const trimmed = value.trim();
            const finalValue = trimmed.length > 0 ? trimmed : undefined;
            await config.update(key, finalValue, vscode.ConfigurationTarget.Global);
            return;
        }

        if (scope === 'skills' || scope === 'commands') {
            const trimmed = value.trim();
            const patch: Partial<AiTaggingConfig> = {};
            if (key === 'aiTagging.tagLibrary') {
                patch.tagLibrary = parseTagLibraryText(trimmed);
            } else if (key === 'aiTagging.provider') {
                patch.provider = trimmed === 'openai-compatible' ? 'openai-compatible' : 'vscode-chat';
            } else if (key === 'aiTagging.vscodeModelId') {
                patch.vscodeModelId = trimmed;
            } else if (key === 'aiTagging.openaiBaseUrl') {
                patch.openaiBaseUrl = trimmed;
            } else if (key === 'aiTagging.openaiApiKey') {
                patch.openaiApiKey = trimmed;
            } else if (key === 'aiTagging.openaiModel') {
                patch.openaiModel = trimmed;
            }

            if (scope === 'skills') {
                this.skillConfigManager.updateAiTaggingConfig(patch);
            } else {
                this.commandConfigManager.updateAiTaggingConfig(patch);
            }
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
