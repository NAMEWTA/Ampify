import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ensureDir } from '../../../common/paths';
import { LoadedCommand } from '../../../common/types';
import { I18n } from '../../../common/i18n';
import { getDefaultInjectTargetValue, parseInjectTargets } from '../../../common/injectTarget';

/**
 * 命令应用器
 * 负责将命令应用到项目或从项目移除
 */
export class CommandApplier {
    private static instance: CommandApplier;

    private constructor() {}

    public static getInstance(): CommandApplier {
        if (!CommandApplier.instance) {
            CommandApplier.instance = new CommandApplier();
        }
        return CommandApplier.instance;
    }

    /**
     * 获取注入目标目录
     */
    public getInjectTargets(workspaceRoot: string): string[] {
        const config = vscode.workspace.getConfiguration('ampify');
        const configuredTargets = config.get<string>('commands.injectTarget') || getDefaultInjectTargetValue('commands');
        return parseInjectTargets(configuredTargets, 'commands')
            .map((target) => path.join(workspaceRoot, target));
    }

    /**
     * 应用命令到项目
     */
    public async apply(command: LoadedCommand, workspaceRoot: string): Promise<boolean> {
        try {
            for (const targetDir of this.getInjectTargets(workspaceRoot)) {
                ensureDir(targetDir);
                const targetPath = path.join(targetDir, `${command.meta.command}.md`);
                this.copyCommand(command.path, targetPath);
            }

            vscode.window.showInformationMessage(
                I18n.get('commands.applied', command.meta.command)
            );
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
                I18n.get('commands.applyFailed', errorMessage)
            );
            return false;
        }
    }

    /**
     * 从项目移除命令
     */
    public async remove(commandName: string, workspaceRoot: string): Promise<boolean> {
        try {
            let removed = false;
            for (const targetDir of this.getInjectTargets(workspaceRoot)) {
                const targetPath = path.join(targetDir, `${commandName}.md`);
                if (fs.existsSync(targetPath)) {
                    fs.rmSync(targetPath, { force: true });
                    removed = true;
                }
            }

            if (removed) {
                vscode.window.showInformationMessage(
                    I18n.get('commands.removed', commandName)
                );
                return true;
            }
            return false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
                I18n.get('commands.applyFailed', errorMessage)
            );
            return false;
        }
    }

    /**
     * 检查命令是否已应用到项目
     */
    public isApplied(commandName: string, workspaceRoot: string): boolean {
        return this.getInjectTargets(workspaceRoot)
            .some((targetDir) => fs.existsSync(path.join(targetDir, `${commandName}.md`)));
    }

    /**
     * 获取项目中已应用的命令列表
     */
    public getAppliedCommands(workspaceRoot: string): string[] {
        const applied = new Set<string>();

        for (const targetDir of this.getInjectTargets(workspaceRoot)) {
            if (!fs.existsSync(targetDir)) {
                continue;
            }

            const files = fs.readdirSync(targetDir);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    applied.add(path.basename(file, '.md'));
                }
            }
        }

        return Array.from(applied).sort();
    }

    private copyCommand(sourcePath: string, targetPath: string): void {
        if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
            throw new Error(`Command source file not found: ${sourcePath}`);
        }

        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { force: true });
        }

        fs.copyFileSync(sourcePath, targetPath);
    }
}
