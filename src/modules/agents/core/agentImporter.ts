import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { AgentMeta } from '../../../common/types';
import { AgentConfigManager } from './agentConfigManager';
import { parseAgentMd } from '../templates/agentMdTemplate';

export class AgentImporter {
    private static instance: AgentImporter;
    private configManager: AgentConfigManager;

    private constructor() {
        this.configManager = AgentConfigManager.getInstance();
    }

    public static getInstance(): AgentImporter {
        if (!AgentImporter.instance) {
            AgentImporter.instance = new AgentImporter();
        }
        return AgentImporter.instance;
    }

    public validateAgentFile(filePath: string): { valid: boolean; meta?: AgentMeta; error?: string } {
        if (!fs.existsSync(filePath)) {
            return { valid: false, error: 'File not found' };
        }

        if (!filePath.endsWith('.md')) {
            return { valid: false, error: 'File must be .md' };
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const { meta } = parseAgentMd(content);

            if (!meta) {
                return { valid: false, error: I18n.get('agents.invalidAgentFile') };
            }

            if (!meta.agent || !meta.description) {
                return { valid: false, error: I18n.get('agents.invalidAgentFile') };
            }

            if (!AgentConfigManager.validateAgentName(meta.agent)) {
                return { valid: false, error: I18n.get('agents.nameValidation') };
            }

            const fileName = path.basename(filePath, '.md');
            if (fileName !== meta.agent) {
                return { valid: false, error: I18n.get('agents.fileNameMismatch', meta.agent) };
            }

            return { valid: true, meta };
        } catch (error) {
            return { valid: false, error: String(error) };
        }
    }

    public async importFromFile(filePath: string): Promise<boolean> {
        const validation = this.validateAgentFile(filePath);

        if (!validation.valid || !validation.meta) {
            vscode.window.showErrorMessage(I18n.get('agents.importFailed', validation.error || 'Unknown error'));
            return false;
        }

        const agentName = validation.meta.agent;

        if (this.configManager.agentExists(agentName)) {
            const overwrite = await vscode.window.showWarningMessage(
                I18n.get('agents.agentExists', agentName),
                I18n.get('skills.yes'),
                I18n.get('skills.no')
            );
            if (overwrite !== I18n.get('skills.yes')) {
                return false;
            }
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            this.configManager.saveAgentMd(agentName, content);

            vscode.window.showInformationMessage(I18n.get('agents.importSuccess', agentName));
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(I18n.get('agents.importFailed', String(error)));
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
            title: 'Import Agent'
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
