import * as vscode from 'vscode';
import { SkillConfigManager } from './skillConfigManager';
import { SkillMeta, Prerequisite, PrerequisiteType } from '../../../common/types';
import { I18n } from '../../../common/i18n';
import { generateSkillMdContent } from '../templates/skillMdTemplate';

// 预定义标签列表
const PREDEFINED_TAGS = [
    'ai', 'backend', 'frontend',
    'git', 'ci-cd',
    'vue', 'react'
];

export class SkillCreator {
    constructor(private configManager: SkillConfigManager) {}

    /**
     * 验证 Skill 名称
     */
    private validateName(name: string): string | null {
        if (!name) {
            return 'Name is required';
        }
        if (!/^[a-z0-9-]+$/.test(name)) {
            return I18n.get('skills.nameValidation');
        }
        if (name.length > 64) {
            return I18n.get('skills.nameValidation');
        }
        if (this.configManager.skillExists(name)) {
            return `Skill "${name}" already exists`;
        }
        return null;
    }

    /**
     * 验证描述
     */
    private validateDescription(desc: string): string | null {
        if (!desc) {
            return 'Description is required';
        }
        if (desc.length > 1024) {
            return I18n.get('skills.descValidation');
        }
        return null;
    }

    /**
     * Skill Writer 向导 - 创建新 Skill
     */
    public async create(): Promise<{ success: boolean; skillName?: string; error?: string }> {
        // Step 1: 输入名称
        const name = await vscode.window.showInputBox({
            prompt: I18n.get('skills.inputSkillName'),
            placeHolder: 'my-awesome-skill',
            validateInput: (value) => this.validateName(value)
        });

        if (!name) {
            return { success: false, error: 'Cancelled' };
        }

        // Step 2: 输入描述
        const description = await vscode.window.showInputBox({
            prompt: I18n.get('skills.inputSkillDesc'),
            placeHolder: 'What this skill does. Use when...',
            validateInput: (value) => this.validateDescription(value)
        });

        if (!description) {
            return { success: false, error: 'Cancelled' };
        }

        // Step 3: 选择标签
        const tags = await this.selectTags();

        // Step 4: 添加前置依赖
        const prerequisites = await this.addPrerequisites();

        // 创建 SkillMeta
        const meta: SkillMeta = {
            name,
            description,
            tags: tags.length > 0 ? tags : undefined,
            prerequisites: prerequisites.length > 0 ? prerequisites : undefined
        };

        try {
            // 生成并保存 SKILL.md
            const skillMdContent = generateSkillMdContent(meta);
            this.configManager.saveSkillMd(name, skillMdContent);

            // 打开 SKILL.md 供用户编辑
            const skillMdPath = this.configManager.getSkillPath(name) + '/SKILL.md';
            const doc = await vscode.workspace.openTextDocument(skillMdPath);
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(I18n.get('skills.skillCreated', name));

            return { success: true, skillName: name };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            return { success: false, error: message };
        }
    }

    /**
     * 选择标签
     */
    private async selectTags(): Promise<string[]> {
        // 获取现有标签
        const existingTags = this.configManager.getAllTags();
        const allTags = [...new Set([...PREDEFINED_TAGS, ...existingTags])].sort();

        const items: vscode.QuickPickItem[] = allTags.map(tag => ({
            label: tag,
            picked: false
        }));

        // 添加自定义选项
        items.push({
            label: `$(add) ${I18n.get('skills.addCustomTag')}`,
            description: '',
            alwaysShow: true
        });

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: I18n.get('skills.selectTags')
        });

        if (!selected) {
            return [];
        }

        const tags: string[] = [];

        for (const item of selected) {
            if (item.label.includes(I18n.get('skills.addCustomTag'))) {
                // 添加自定义标签
                const customTag = await vscode.window.showInputBox({
                    prompt: I18n.get('skills.inputCustomTag'),
                    placeHolder: 'my-custom-tag'
                });
                if (customTag) {
                    tags.push(customTag.toLowerCase().replace(/\s+/g, '-'));
                }
            } else {
                tags.push(item.label);
            }
        }

        return tags;
    }

    /**
     * 添加前置依赖
     */
    private async addPrerequisites(): Promise<Prerequisite[]> {
        const prerequisites: Prerequisite[] = [];

        const addMore = await vscode.window.showQuickPick(
            [I18n.get('skills.yes'), I18n.get('skills.no')],
            { placeHolder: I18n.get('skills.addPrerequisite') }
        );

        if (addMore !== I18n.get('skills.yes')) {
            return prerequisites;
        }

        let continueAdding = true;

        while (continueAdding) {
            const prereq = await this.addSinglePrerequisite();
            if (prereq) {
                prerequisites.push(prereq);

                const more = await vscode.window.showQuickPick(
                    [I18n.get('skills.yes'), I18n.get('skills.no')],
                    { placeHolder: I18n.get('skills.addMorePrereq') }
                );

                continueAdding = more === I18n.get('skills.yes');
            } else {
                continueAdding = false;
            }
        }

        return prerequisites;
    }

    /**
     * 添加单个前置依赖
     */
    private async addSinglePrerequisite(): Promise<Prerequisite | null> {
        // 选择类型
        const typeItems: vscode.QuickPickItem[] = [
            { label: 'runtime', description: I18n.get('skills.runtime') },
            { label: 'tool', description: I18n.get('skills.tool') },
            { label: 'extension', description: I18n.get('skills.extension') },
            { label: 'manual', description: I18n.get('skills.manual') }
        ];

        const typeChoice = await vscode.window.showQuickPick(typeItems, {
            placeHolder: I18n.get('skills.selectPrereqType')
        });

        if (!typeChoice) {
            return null;
        }

        const type = typeChoice.label as PrerequisiteType;

        // 输入名称
        const name = await vscode.window.showInputBox({
            prompt: I18n.get('skills.inputPrereqName'),
            placeHolder: 'Node.js 18+'
        });

        if (!name) {
            return null;
        }

        // 输入检测命令（可选）
        const checkCommand = await vscode.window.showInputBox({
            prompt: I18n.get('skills.inputCheckCommand'),
            placeHolder: 'node -v'
        });

        // 输入安装提示（可选）
        const installHint = await vscode.window.showInputBox({
            prompt: I18n.get('skills.inputInstallHint'),
            placeHolder: 'brew install node'
        });

        const prereq: Prerequisite = {
            type,
            name,
            checkCommand: checkCommand || undefined,
            installHint: installHint || undefined
        };

        return prereq;
    }
}
