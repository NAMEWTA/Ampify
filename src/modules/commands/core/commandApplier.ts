import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ensureDir } from '../../../common/paths';
import { LoadedCommand } from '../../../common/types';
import { I18n } from '../../../common/i18n';

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
    public getInjectTarget(workspaceRoot: string): string {
        const config = vscode.workspace.getConfiguration('ampify');
        let target = config.get<string>('commands.injectTarget') || '.agents/commands/';
        target = this.normalizeInjectTarget(target);
        return path.join(workspaceRoot, target);
    }

    /**
     * 应用命令到项目
     */
    public async apply(command: LoadedCommand, workspaceRoot: string): Promise<boolean> {
        try {
            const targetDir = this.getInjectTarget(workspaceRoot);
            ensureDir(targetDir);

            const targetPath = path.join(targetDir, `${command.meta.command}.md`);

            this.ensureCommandLink(command.path, targetPath);

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
            const targetDir = this.getInjectTarget(workspaceRoot);
            const targetPath = path.join(targetDir, `${commandName}.md`);

            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { force: true });
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
        const targetDir = this.getInjectTarget(workspaceRoot);
        const targetPath = path.join(targetDir, `${commandName}.md`);
        return fs.existsSync(targetPath);
    }

    /**
     * 获取项目中已应用的命令列表
     */
    public getAppliedCommands(workspaceRoot: string): string[] {
        const targetDir = this.getInjectTarget(workspaceRoot);
        if (!fs.existsSync(targetDir)) {
            return [];
        }

        const files = fs.readdirSync(targetDir);
        return files
            .filter(f => f.endsWith('.md'))
            .map(f => path.basename(f, '.md'));
    }

    private normalizeInjectTarget(target: string): string {
        if (/^\.claude([\\/]|$)/.test(target)) {
            return target.replace(/^\.claude(?=[\\/]|$)/, '.agents');
        }
        return target;
    }

    private ensureCommandLink(sourcePath: string, targetPath: string): void {
        if (fs.existsSync(targetPath)) {
            const stats = fs.lstatSync(targetPath);
            if (stats.isSymbolicLink()) {
                const existingTarget = this.normalizeFsPath(fs.realpathSync(targetPath));
                const desiredTarget = this.normalizeFsPath(fs.realpathSync(sourcePath));
                if (existingTarget === desiredTarget) {
                    return;
                }
            }
            fs.rmSync(targetPath, { force: true });
        }

        // 使用软链注入命令文件（Windows 需要开启开发者模式或管理员权限）
        fs.symlinkSync(sourcePath, targetPath, 'file');
    }

    private normalizeFsPath(value: string): string {
        const normalized = path.resolve(value);
        return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    }
}
