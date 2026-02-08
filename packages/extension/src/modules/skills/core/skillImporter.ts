import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { SkillConfigManager } from './skillConfigManager';
import { SkillMeta } from '../../../common/types';
import { I18n } from '../../../common/i18n';
import { copyDir } from '../../../common/paths';

export class SkillImporter {
    constructor(private configManager: SkillConfigManager) {}

    /**
     * 验证源目录是否为有效的 Skill 目录
     */
    public validateSkillDir(sourcePath: string): { valid: boolean; error?: string; meta?: SkillMeta } {
        const skillMdPath = path.join(sourcePath, 'SKILL.md');

        // 检查 SKILL.md
        if (!fs.existsSync(skillMdPath)) {
            return { valid: false, error: 'SKILL.md not found' };
        }

        // 解析 SKILL.md frontmatter
        const meta = this.configManager.parseSkillMetaFromMarkdown(skillMdPath, path.basename(sourcePath));
        if (!meta) {
            return { valid: false, error: 'Invalid SKILL.md frontmatter' };
        }

        // 验证必填字段
        if (!meta.name || typeof meta.name !== 'string') {
            return { valid: false, error: 'Invalid SKILL.md: missing or invalid name' };
        }
        if (!meta.description || typeof meta.description !== 'string') {
            return { valid: false, error: 'Invalid SKILL.md: missing or invalid description' };
        }

        // 验证 name 格式
        if (!/^[a-z0-9-]+$/.test(meta.name)) {
            return { valid: false, error: 'Invalid skill name: must be lowercase letters, numbers, and hyphens only' };
        }
        if (meta.name.length > 64) {
            return { valid: false, error: 'Invalid skill name: max 64 characters' };
        }

        // 验证目录名一致性
        const dirName = path.basename(sourcePath);
        if (meta.name !== dirName) {
            return { valid: false, error: 'Skill name must match directory name' };
        }

        return { valid: true, meta };
    }

    /**
     * 导入 Skill 到全局管理目录
     */
    public async import(sourcePath: string): Promise<{ success: boolean; skillName?: string; error?: string }> {
        // 验证源目录
        const validation = this.validateSkillDir(sourcePath);
        if (!validation.valid || !validation.meta) {
            return { success: false, error: validation.error };
        }

        const skillName = validation.meta.name;

        // 检查是否已存在
        if (this.configManager.skillExists(skillName)) {
            // 询问是否覆盖
            const choice = await vscode.window.showWarningMessage(
                I18n.get('skills.skillExists', skillName),
                I18n.get('skills.yes'),
                I18n.get('skills.cancel')
            );

            if (choice !== I18n.get('skills.yes')) {
                return { success: false, error: 'User cancelled' };
            }

            // 删除已存在的
            this.configManager.deleteSkill(skillName);
        }

        try {
            // 复制到全局目录
            const targetPath = this.configManager.getSkillPath(skillName);
            copyDir(sourcePath, targetPath);

            return { success: true, skillName };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            return { success: false, error: message };
        }
    }

    /**
     * 从 URI 列表导入（用于拖拽）
     */
    public async importFromUris(uris: vscode.Uri[]): Promise<{ success: number; failed: number; errors: string[] }> {
        const result = { success: 0, failed: 0, errors: [] as string[] };

        for (const uri of uris) {
            const sourcePath = uri.fsPath;

            // Check existence
            if (!fs.existsSync(sourcePath)) {
                result.failed++;
                result.errors.push(`${path.basename(sourcePath)}: File not found`);
                continue;
            }

            // Check if it's a directory
            const stat = fs.statSync(sourcePath);
            if (!stat.isDirectory()) {
                result.failed++;
                result.errors.push(`${path.basename(sourcePath)}: Skills must be imported as folders containing SKILL.md`);
                continue;
            }

            const importResult = await this.import(sourcePath);
            if (importResult.success) {
                result.success++;
            } else {
                result.failed++;
                if (importResult.error) {
                    result.errors.push(`${path.basename(sourcePath)}: ${importResult.error}`);
                }
            }
        }

        // Show summary for multi-drop
        if (uris.length > 0) {
            if (result.success > 0 && result.failed === 0) {
                vscode.window.showInformationMessage(
                    `Successfully imported ${result.success} skill${result.success > 1 ? 's' : ''}.`
                );
            } else if (result.failed > 0 && result.success === 0) {
                vscode.window.showErrorMessage(
                    `Import failed: ${result.errors.join('; ')}`
                );
            } else if (result.success > 0 && result.failed > 0) {
                vscode.window.showWarningMessage(
                    `Imported ${result.success}, failed ${result.failed}: ${result.errors.join('; ')}`
                );
            }
        }

        return result;
    }

    /**
     * 让用户选择目录导入
     */
    public async importFromDialog(): Promise<{ success: boolean; skillName?: string; error?: string }> {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Import Skill',
            title: 'Select Skill Directory to Import'
        });

        if (!uris || uris.length === 0) {
            return { success: false, error: 'No directory selected' };
        }

        return this.import(uris[0].fsPath);
    }
}
