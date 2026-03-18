import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { RuleMeta } from '../../../common/types';
import { RuleConfigManager } from './ruleConfigManager';
import { generateRuleMd } from '../templates/ruleMdTemplate';

const PREDEFINED_TAGS = [
    'compliance',
    'documentation',
    'process',
    'quality',
    'review',
    'security',
    'style',
    'workflow'
];

export class RuleCreator {
    private static instance: RuleCreator;
    private configManager: RuleConfigManager;

    private constructor() {
        this.configManager = RuleConfigManager.getInstance();
    }

    public static getInstance(): RuleCreator {
        if (!RuleCreator.instance) {
            RuleCreator.instance = new RuleCreator();
        }
        return RuleCreator.instance;
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

        const meta: RuleMeta = {
            rule: name,
            description,
            tags
        };

        const content = generateRuleMd(meta);
        this.configManager.saveRuleMd(name, content);

        vscode.window.showInformationMessage(I18n.get('rules.ruleCreated', name));

        const filePath = vscode.Uri.file(`${this.configManager.getRulesDir()}/${name}.md`);
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);

        return true;
    }

    private async inputName(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: I18n.get('rules.inputRuleName'),
            placeHolder: 'my-rule',
            validateInput: (value) => {
                if (!value) {
                    return I18n.get('rules.nameValidation');
                }
                if (!RuleConfigManager.validateRuleName(value)) {
                    return I18n.get('rules.nameValidation');
                }
                if (this.configManager.ruleExists(value)) {
                    return I18n.get('rules.ruleExists', value);
                }
                return undefined;
            }
        });
    }

    private async inputDescription(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: I18n.get('rules.inputRuleDesc'),
            placeHolder: 'A rule that...',
            validateInput: (value) => {
                if (!value) {
                    return I18n.get('rules.descValidation');
                }
                if (value.length > 1024) {
                    return I18n.get('rules.descValidation');
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
                label: I18n.get('rules.addCustomTag'),
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
            placeHolder: I18n.get('rules.selectTags')
        });

        if (selected === undefined) {
            return undefined;
        }

        const tags: string[] = [];
        let needCustomTag = false;

        for (const item of selected) {
            if (item.label === I18n.get('rules.addCustomTag')) {
                needCustomTag = true;
            } else {
                tags.push(item.label);
            }
        }

        if (needCustomTag) {
            const customTag = await vscode.window.showInputBox({
                prompt: I18n.get('rules.inputCustomTag'),
                placeHolder: 'custom-tag'
            });
            if (customTag) {
                tags.push(customTag);
            }
        }

        return tags;
    }
}
