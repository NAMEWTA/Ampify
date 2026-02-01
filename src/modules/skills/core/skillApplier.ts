import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SkillConfigManager } from './skillConfigManager';
import { LoadedSkill, Prerequisite } from '../../../common/types';
import { I18n } from '../../../common/i18n';

const execAsync = promisify(exec);

export interface PrerequisiteCheckResult {
    prerequisite: Prerequisite;
    met: boolean;
    message?: string;
}

export class SkillApplier {
    constructor(private configManager: SkillConfigManager) {}

    /**
     * 获取注入目标路径
     */
    public getInjectTarget(workspaceRoot: string): string {
        const config = vscode.workspace.getConfiguration('ampify');
        const customTarget = config.get<string>('skills.injectTarget') || '.claude/skills/';
        return path.join(workspaceRoot, customTarget);
    }

    /**
     * 检查前置依赖
     */
    public async checkPrerequisites(skill: LoadedSkill): Promise<PrerequisiteCheckResult[]> {
        const results: PrerequisiteCheckResult[] = [];

        if (!skill.meta.prerequisites || skill.meta.prerequisites.length === 0) {
            return results;
        }

        for (const prereq of skill.meta.prerequisites) {
            const result: PrerequisiteCheckResult = {
                prerequisite: prereq,
                met: false
            };

            if (prereq.checkCommand) {
                try {
                    const { stdout } = await execAsync(prereq.checkCommand);
                    result.met = true;
                    result.message = stdout.trim();
                } catch {
                    result.met = false;
                    result.message = prereq.installHint || `${prereq.name} not found`;
                }
            } else if (prereq.type === 'manual') {
                // 手动步骤总是显示
                result.met = false;
                result.message = prereq.installHint || prereq.name;
            } else {
                // 无法检查的依赖，标记为未知
                result.met = true;
                result.message = 'Unable to verify automatically';
            }

            results.push(result);
        }

        return results;
    }

    /**
     * 显示前置依赖检查结果
     */
    public async showPrerequisiteResults(results: PrerequisiteCheckResult[]): Promise<boolean> {
        if (results.length === 0) {
            return true;
        }

        const unmetPrereqs = results.filter(r => !r.met);
        
        if (unmetPrereqs.length === 0) {
            return true;
        }

        // 构建消息
        const messages = unmetPrereqs.map(r => {
            const typeLabel = this.getPrereqTypeLabel(r.prerequisite.type);
            return `• [${typeLabel}] ${r.prerequisite.name}${r.message ? `: ${r.message}` : ''}`;
        });

        const message = `${I18n.get('skills.prerequisitesNotMet')}\n\n${messages.join('\n')}`;

        const choice = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            I18n.get('skills.yes'),
            I18n.get('skills.cancel')
        );

        return choice === I18n.get('skills.yes');
    }

    /**
     * 获取依赖类型标签
     */
    private getPrereqTypeLabel(type: string): string {
        switch (type) {
            case 'runtime': return I18n.get('skills.runtime');
            case 'tool': return I18n.get('skills.tool');
            case 'extension': return I18n.get('skills.extension');
            case 'manual': return I18n.get('skills.manual');
            default: return type;
        }
    }

    /**
     * 应用 Skill 到项目
     */
    public async apply(skill: LoadedSkill, workspaceRoot: string): Promise<{ success: boolean; error?: string }> {
        try {
            // 检查前置依赖
            const prereqResults = await this.checkPrerequisites(skill);
            const shouldContinue = await this.showPrerequisiteResults(prereqResults);
            
            if (!shouldContinue) {
                return { success: false, error: 'User cancelled due to prerequisites' };
            }

            const targetDir = this.getInjectTarget(workspaceRoot);
            const skillTargetPath = path.join(targetDir, skill.meta.name);

            // 确保目标目录存在
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            // 如果目标已存在，先删除
            if (fs.existsSync(skillTargetPath)) {
                fs.rmSync(skillTargetPath, { recursive: true, force: true });
            }

            // 复制 Skill 目录
            this.configManager.copyDir(skill.path, skillTargetPath);

            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            return { success: false, error: message };
        }
    }

    /**
     * 从项目移除 Skill
     */
    public remove(skillName: string, workspaceRoot: string): boolean {
        try {
            const targetDir = this.getInjectTarget(workspaceRoot);
            const skillTargetPath = path.join(targetDir, skillName);

            if (fs.existsSync(skillTargetPath)) {
                fs.rmSync(skillTargetPath, { recursive: true, force: true });
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Failed to remove skill ${skillName}:`, error);
            return false;
        }
    }
}
