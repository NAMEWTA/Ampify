import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ensureDir } from '../../../common/paths';
import { LoadedAgent } from '../../../common/types';
import { I18n } from '../../../common/i18n';
import { getDefaultInjectTargetValue, parseInjectTargets } from '../../../common/injectTarget';

export class AgentApplier {
    private static instance: AgentApplier;

    private constructor() {}

    public static getInstance(): AgentApplier {
        if (!AgentApplier.instance) {
            AgentApplier.instance = new AgentApplier();
        }
        return AgentApplier.instance;
    }

    public getInjectTargets(workspaceRoot: string): string[] {
        const config = vscode.workspace.getConfiguration('ampify');
        const configuredTargets = config.get<string>('agents.injectTarget') || getDefaultInjectTargetValue('agents');
        return parseInjectTargets(configuredTargets, 'agents')
            .map((target) => path.join(workspaceRoot, target));
    }

    public async apply(agent: LoadedAgent, workspaceRoot: string): Promise<boolean> {
        try {
            for (const targetDir of this.getInjectTargets(workspaceRoot)) {
                ensureDir(targetDir);
                const targetPath = path.join(targetDir, `${agent.meta.agent}.md`);
                this.copyAgent(agent.path, targetPath);
            }

            vscode.window.showInformationMessage(I18n.get('agents.applied', agent.meta.agent));
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(I18n.get('agents.applyFailed', errorMessage));
            return false;
        }
    }

    public async remove(agentName: string, workspaceRoot: string): Promise<boolean> {
        try {
            let removed = false;
            for (const targetDir of this.getInjectTargets(workspaceRoot)) {
                const targetPath = path.join(targetDir, `${agentName}.md`);
                if (fs.existsSync(targetPath)) {
                    fs.rmSync(targetPath, { force: true });
                    removed = true;
                }
            }

            if (removed) {
                vscode.window.showInformationMessage(I18n.get('agents.removed', agentName));
                return true;
            }
            return false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(I18n.get('agents.applyFailed', errorMessage));
            return false;
        }
    }

    public isApplied(agentName: string, workspaceRoot: string): boolean {
        return this.getInjectTargets(workspaceRoot)
            .some((targetDir) => fs.existsSync(path.join(targetDir, `${agentName}.md`)));
    }

    private copyAgent(sourcePath: string, targetPath: string): void {
        if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
            throw new Error(`Agent source file not found: ${sourcePath}`);
        }

        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { force: true });
        }

        fs.copyFileSync(sourcePath, targetPath);
    }
}
