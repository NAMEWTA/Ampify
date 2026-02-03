import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { CommandMeta } from '../../../common/types';
import { CommandConfigManager } from './commandConfigManager';
import { generateCommandMd } from '../templates/commandMdTemplate';

/**
 * 预定义标签
 */
const PREDEFINED_TAGS = [
    'code-generation',
    'refactor',
    'documentation',
    'testing',
    'debugging',
    'analysis',
    'review',
    'database',
    'api',
    'frontend',
    'backend',
    'devops',
    'workflow'
];

/**
 * 命令创建器
 * 提供交互式向导创建新命令
 */
export class CommandCreator {
    private static instance: CommandCreator;
    private configManager: CommandConfigManager;

    private constructor() {
        this.configManager = CommandConfigManager.getInstance();
    }

    public static getInstance(): CommandCreator {
        if (!CommandCreator.instance) {
            CommandCreator.instance = new CommandCreator();
        }
        return CommandCreator.instance;
    }

    /**
     * 创建新命令向导
     */
    public async create(): Promise<boolean> {
        // 1. 输入命令名称
        const name = await this.inputName();
        if (!name) {
            return false;
        }

        // 2. 输入描述
        const description = await this.inputDescription();
        if (!description) {
            return false;
        }

        // 3. 选择标签
        const tags = await this.selectTags();
        if (tags === undefined) {
            return false;
        }

        // 4. 生成并保存
        const meta: CommandMeta = {
            command: name,
            description,
            tags
        };

        const content = generateCommandMd(meta);
        this.configManager.saveCommandMd(name, content);

        vscode.window.showInformationMessage(
            I18n.get('commands.commandCreated', name)
        );

        // 5. 打开编辑
        const filePath = vscode.Uri.file(
            `${this.configManager.getCommandsDir()}/${name}.md`
        );
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);

        return true;
    }

    /**
     * 输入命令名称
     */
    private async inputName(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: I18n.get('commands.inputCommandName'),
            placeHolder: 'my-command',
            validateInput: (value) => {
                if (!value) {
                    return I18n.get('commands.nameValidation');
                }
                if (!CommandConfigManager.validateCommandName(value)) {
                    return I18n.get('commands.nameValidation');
                }
                if (this.configManager.commandExists(value)) {
                    return I18n.get('commands.commandExists', value);
                }
                return undefined;
            }
        });
    }

    /**
     * 输入描述
     */
    private async inputDescription(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: I18n.get('commands.inputCommandDesc'),
            placeHolder: 'A command that...',
            validateInput: (value) => {
                if (!value) {
                    return I18n.get('commands.descValidation');
                }
                if (value.length > 1024) {
                    return I18n.get('commands.descValidation');
                }
                return undefined;
            }
        });
    }

    /**
     * 选择标签
     */
    private async selectTags(): Promise<string[] | undefined> {
        // 获取已有标签
        const existingTags = this.configManager.getAllTags();
        const allTags = [...new Set([...PREDEFINED_TAGS, ...existingTags])].sort();

        // 构建选项
        const items: vscode.QuickPickItem[] = [
            {
                label: I18n.get('commands.addCustomTag'),
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
            placeHolder: I18n.get('commands.selectTags')
        });

        if (selected === undefined) {
            return undefined;
        }

        const tags: string[] = [];
        let needCustomTag = false;

        for (const item of selected) {
            if (item.label === I18n.get('commands.addCustomTag')) {
                needCustomTag = true;
            } else {
                tags.push(item.label);
            }
        }

        // 添加自定义标签
        if (needCustomTag) {
            const customTag = await vscode.window.showInputBox({
                prompt: I18n.get('commands.inputCustomTag'),
                placeHolder: 'custom-tag'
            });
            if (customTag) {
                tags.push(customTag);
            }
        }

        return tags;
    }
}
