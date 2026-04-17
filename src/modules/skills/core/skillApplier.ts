import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { SkillConfigManager } from './skillConfigManager';
import { LoadedSkill, Prerequisite } from '../../../common/types';
import { I18n } from '../../../common/i18n';
import { getDefaultInjectTargetValue, parseInjectTargets } from '../../../common/injectTarget';
import { evaluatePrerequisite, resolveSafeSkillPath } from './skillSecurity';

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
    public getInjectTargets(workspaceRoot: string): string[] {
        const config = vscode.workspace.getConfiguration('ampify');
        const configuredTargets = config.get<string>('skills.injectTarget') || getDefaultInjectTargetValue('skills');
        return parseInjectTargets(configuredTargets, 'skills')
            .map((target) => path.join(workspaceRoot, target));
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
            const evaluated = evaluatePrerequisite(prereq);
            const result: PrerequisiteCheckResult = {
                prerequisite: prereq,
                met: evaluated.met,
                message: evaluated.message
            };

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

            if (!SkillConfigManager.validateSkillName(skill.meta.name)) {
                return { success: false, error: `Invalid skill name: ${skill.meta.name}` };
            }

            const targetDirs = this.getInjectTargets(workspaceRoot);
            for (const targetDir of targetDirs) {
                const skillTargetPath = resolveSafeSkillPath(targetDir, skill.meta.name);

                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                this.copySkill(skill.path, skillTargetPath);
            }

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
            if (!SkillConfigManager.validateSkillName(skillName)) {
                return false;
            }

            let removed = false;
            for (const targetDir of this.getInjectTargets(workspaceRoot)) {
                const skillTargetPath = resolveSafeSkillPath(targetDir, skillName);

                if (fs.existsSync(skillTargetPath)) {
                    fs.rmSync(skillTargetPath, { recursive: true, force: true });
                    removed = true;
                }
            }
            return removed;
        } catch (error) {
            console.error(`Failed to remove skill ${skillName}:`, error);
            return false;
        }
    }

    private copySkill(sourcePath: string, targetPath: string): void {
        if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
            throw new Error(`Skill source directory not found: ${sourcePath}`);
        }

        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        }

        fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    }
}
