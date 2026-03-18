import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { RuleMeta } from '../../../common/types';
import { RuleConfigManager } from './ruleConfigManager';
import { parseRuleMd } from '../templates/ruleMdTemplate';

export class RuleImporter {
    private static instance: RuleImporter;
    private configManager: RuleConfigManager;

    private constructor() {
        this.configManager = RuleConfigManager.getInstance();
    }

    public static getInstance(): RuleImporter {
        if (!RuleImporter.instance) {
            RuleImporter.instance = new RuleImporter();
        }
        return RuleImporter.instance;
    }

    public validateRuleFile(filePath: string): { valid: boolean; meta?: RuleMeta; error?: string } {
        if (!fs.existsSync(filePath)) {
            return { valid: false, error: 'File not found' };
        }

        if (!filePath.endsWith('.md')) {
            return { valid: false, error: 'File must be .md' };
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const { meta } = parseRuleMd(content);

            if (!meta) {
                return { valid: false, error: I18n.get('rules.invalidRuleFile') };
            }

            if (!meta.rule || !meta.description) {
                return { valid: false, error: I18n.get('rules.invalidRuleFile') };
            }

            if (!RuleConfigManager.validateRuleName(meta.rule)) {
                return { valid: false, error: I18n.get('rules.nameValidation') };
            }

            const fileName = path.basename(filePath, '.md');
            if (fileName !== meta.rule) {
                return { valid: false, error: I18n.get('rules.fileNameMismatch', meta.rule) };
            }

            return { valid: true, meta };
        } catch (error) {
            return { valid: false, error: String(error) };
        }
    }

    public async importFromFile(filePath: string): Promise<boolean> {
        const validation = this.validateRuleFile(filePath);

        if (!validation.valid || !validation.meta) {
            vscode.window.showErrorMessage(I18n.get('rules.importFailed', validation.error || 'Unknown error'));
            return false;
        }

        const ruleName = validation.meta.rule;

        if (this.configManager.ruleExists(ruleName)) {
            const overwrite = await vscode.window.showWarningMessage(
                I18n.get('rules.ruleExists', ruleName),
                I18n.get('skills.yes'),
                I18n.get('skills.no')
            );
            if (overwrite !== I18n.get('skills.yes')) {
                return false;
            }
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            this.configManager.saveRuleMd(ruleName, content);

            vscode.window.showInformationMessage(I18n.get('rules.importSuccess', ruleName));
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(I18n.get('rules.importFailed', String(error)));
            return false;
        }
    }

    public async importFromDialog(): Promise<boolean> {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                Markdown: ['md']
            },
            title: 'Import Rule'
        });

        if (!uris || uris.length === 0) {
            return false;
        }

        return this.importFromFile(uris[0].fsPath);
    }

    public async importFromUris(uris: vscode.Uri[]): Promise<boolean> {
        let success = false;
        for (const uri of uris) {
            if (uri.fsPath.endsWith('.md')) {
                const result = await this.importFromFile(uri.fsPath);
                success = success || result;
            }
        }
        return success;
    }
}
