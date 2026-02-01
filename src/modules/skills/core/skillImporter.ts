import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { SkillConfigManager } from './skillConfigManager';
import { SkillMeta } from '../../../common/types';
import { I18n } from '../../../common/i18n';

export class SkillImporter {
    constructor(private configManager: SkillConfigManager) {}

    /**
     * 验证源目录是否为有效的 Skill 目录
     */
    public validateSkillDir(sourcePath: string): { valid: boolean; error?: string; meta?: SkillMeta } {
        const skillJsonPath = path.join(sourcePath, 'skill.json');
        const skillMdPath = path.join(sourcePath, 'SKILL.md');

        // 检查 skill.json
        if (!fs.existsSync(skillJsonPath)) {
            return { valid: false, error: 'skill.json not found' };
        }

        // 检查 SKILL.md
        if (!fs.existsSync(skillMdPath)) {
            return { valid: false, error: 'SKILL.md not found' };
        }

        // 尝试解析 skill.json
        try {
            const content = fs.readFileSync(skillJsonPath, 'utf8');
            const meta: SkillMeta = JSON.parse(content);

            // 验证必填字段
            if (!meta.name || typeof meta.name !== 'string') {
                return { valid: false, error: 'Invalid skill.json: missing or invalid name' };
            }
            if (!meta.description || typeof meta.description !== 'string') {
                return { valid: false, error: 'Invalid skill.json: missing or invalid description' };
            }
            if (!meta.version || typeof meta.version !== 'string') {
                return { valid: false, error: 'Invalid skill.json: missing or invalid version' };
            }

            // 验证 name 格式
            if (!/^[a-z0-9-]+$/.test(meta.name)) {
                return { valid: false, error: 'Invalid skill name: must be lowercase letters, numbers, and hyphens only' };
            }
            if (meta.name.length > 64) {
                return { valid: false, error: 'Invalid skill name: max 64 characters' };
            }

            return { valid: true, meta };
        } catch {
            return { valid: false, error: 'Failed to parse skill.json' };
        }
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
            this.configManager.copyDir(sourcePath, targetPath);

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
            
            // 检查是否是目录
            const stat = fs.statSync(sourcePath);
            if (!stat.isDirectory()) {
                result.failed++;
                result.errors.push(`${path.basename(sourcePath)}: Not a directory`);
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
