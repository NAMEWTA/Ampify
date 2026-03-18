import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { AgentMeta } from '../../../common/types';
import { AgentConfigManager } from './agentConfigManager';
import { generateAgentMd } from '../templates/agentMdTemplate';

const PREDEFINED_TAGS = [
    'analysis',
    'backend',
    'coding',
    'debugging',
    'frontend',
    'planning',
    'review',
    'testing',
    'workflow'
];

export class AgentCreator {
    private static instance: AgentCreator;
    private configManager: AgentConfigManager;

    private constructor() {
        this.configManager = AgentConfigManager.getInstance();
    }

    public static getInstance(): AgentCreator {
        if (!AgentCreator.instance) {
            AgentCreator.instance = new AgentCreator();
        }
        return AgentCreator.instance;
    }

    public async create(): Promise<boolean> {
        const name = await this.inputName();
        if (!name) {
            return false;
        }

        const description = await this.inputDescription();
        if (!description) {
            return false;
        }

        const tags = await this.selectTags();
        if (tags === undefined) {
            return false;
        }

        const meta: AgentMeta = {
            agent: name,
            description,
            tags
        };

        const content = generateAgentMd(meta);
        this.configManager.saveAgentMd(name, content);

        vscode.window.showInformationMessage(I18n.get('agents.agentCreated', name));

        const filePath = vscode.Uri.file(`${this.configManager.getAgentsDir()}/${name}.md`);
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);

        return true;
    }

    private async inputName(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: I18n.get('agents.inputAgentName'),
            placeHolder: 'my-agent',
            validateInput: (value) => {
                if (!value) {
                    return I18n.get('agents.nameValidation');
                }
                if (!AgentConfigManager.validateAgentName(value)) {
                    return I18n.get('agents.nameValidation');
                }
                if (this.configManager.agentExists(value)) {
                    return I18n.get('agents.agentExists', value);
                }
                return undefined;
            }
        });
    }

    private async inputDescription(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: I18n.get('agents.inputAgentDesc'),
            placeHolder: 'An agent that...',
            validateInput: (value) => {
                if (!value) {
                    return I18n.get('agents.descValidation');
                }
                if (value.length > 1024) {
                    return I18n.get('agents.descValidation');
                }
                return undefined;
            }
        });
    }

    private async selectTags(): Promise<string[] | undefined> {
        const existingTags = this.configManager.getAllTags();
        const allTags = [...new Set([...PREDEFINED_TAGS, ...existingTags])].sort();

        const items: vscode.QuickPickItem[] = [
            {
                label: I18n.get('agents.addCustomTag'),
                description: '',
                alwaysShow: true
            },
            ...allTags.map(tag => ({
                label: tag,
                picked: false
            }))
        ];

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: I18n.get('agents.selectTags')
        });

        if (selected === undefined) {
            return undefined;
        }

        const tags: string[] = [];
        let needCustomTag = false;

        for (const item of selected) {
            if (item.label === I18n.get('agents.addCustomTag')) {
                needCustomTag = true;
            } else {
                tags.push(item.label);
            }
        }

        if (needCustomTag) {
            const customTag = await vscode.window.showInputBox({
                prompt: I18n.get('agents.inputCustomTag'),
                placeHolder: 'custom-tag'
            });
            if (customTag) {
                tags.push(customTag);
            }
        }

        return tags;
    }
}
