import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ensureDir } from '../../../common/paths';
import { LoadedRule } from '../../../common/types';
import { I18n } from '../../../common/i18n';
import { getDefaultInjectTargetValue, parseInjectTargets } from '../../../common/injectTarget';

export class RuleApplier {
    private static instance: RuleApplier;

    private constructor() {}

    public static getInstance(): RuleApplier {
        if (!RuleApplier.instance) {
            RuleApplier.instance = new RuleApplier();
        }
        return RuleApplier.instance;
    }

    public getInjectTargets(workspaceRoot: string): string[] {
        const config = vscode.workspace.getConfiguration('ampify');
        const configuredTargets = config.get<string>('rules.injectTarget') || getDefaultInjectTargetValue('rules');
        return parseInjectTargets(configuredTargets, 'rules')
            .map((target) => path.join(workspaceRoot, target));
    }

    public async apply(rule: LoadedRule, workspaceRoot: string): Promise<boolean> {
        try {
            for (const targetDir of this.getInjectTargets(workspaceRoot)) {
                ensureDir(targetDir);
                const targetPath = path.join(targetDir, `${rule.meta.rule}.md`);
                this.copyRule(rule.path, targetPath);
            }

            vscode.window.showInformationMessage(I18n.get('rules.applied', rule.meta.rule));
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(I18n.get('rules.applyFailed', errorMessage));
            return false;
        }
    }

    public async remove(ruleName: string, workspaceRoot: string): Promise<boolean> {
        try {
            let removed = false;
            for (const targetDir of this.getInjectTargets(workspaceRoot)) {
                const targetPath = path.join(targetDir, `${ruleName}.md`);
                if (fs.existsSync(targetPath)) {
                    fs.rmSync(targetPath, { force: true });
                    removed = true;
                }
            }

            if (removed) {
                vscode.window.showInformationMessage(I18n.get('rules.removed', ruleName));
                return true;
            }
            return false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(I18n.get('rules.applyFailed', errorMessage));
            return false;
        }
    }

    private copyRule(sourcePath: string, targetPath: string): void {
        if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
            throw new Error(`Rule source file not found: ${sourcePath}`);
        }

        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { force: true });
        }

        fs.copyFileSync(sourcePath, targetPath);
    }
}
