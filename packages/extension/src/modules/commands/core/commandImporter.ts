import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { CommandMeta } from '../../../common/types';
import { CommandConfigManager } from './commandConfigManager';
import { parseCommandMd } from '../templates/commandMdTemplate';

/**
 * 命令导入器
 * 负责验证和导入命令文件到全局目录
 */
export class CommandImporter {
    private static instance: CommandImporter;
    private configManager: CommandConfigManager;

    private constructor() {
        this.configManager = CommandConfigManager.getInstance();
    }

    public static getInstance(): CommandImporter {
        if (!CommandImporter.instance) {
            CommandImporter.instance = new CommandImporter();
        }
        return CommandImporter.instance;
    }

    /**
     * 验证命令文件
     * @returns 验证结果，成功返回元数据，失败返回错误信息
     */
    public validateCommandFile(filePath: string): { valid: boolean; meta?: CommandMeta; error?: string } {
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            return { valid: false, error: 'File not found' };
        }

        // 检查文件扩展名
        if (!filePath.endsWith('.md')) {
            return { valid: false, error: 'File must be .md' };
        }

        // 读取并解析文件
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const { meta } = parseCommandMd(content);

            if (!meta) {
                return { valid: false, error: I18n.get('commands.invalidCommandFile') };
            }

            // 验证必需字段
            if (!meta.command || !meta.description) {
                return { valid: false, error: I18n.get('commands.invalidCommandFile') };
            }

            // 验证命令名称格式
            if (!CommandConfigManager.validateCommandName(meta.command)) {
                return { valid: false, error: I18n.get('commands.nameValidation') };
            }

            // 验证文件名与 command 字段一致
            const fileName = path.basename(filePath, '.md');
            if (fileName !== meta.command) {
                return { valid: false, error: I18n.get('commands.fileNameMismatch', meta.command) };
            }

            return { valid: true, meta };
        } catch (error) {
            return { valid: false, error: String(error) };
        }
    }

    /**
     * 导入命令文件
     */
    public async importFromFile(filePath: string): Promise<boolean> {
        const validation = this.validateCommandFile(filePath);
        
        if (!validation.valid || !validation.meta) {
            vscode.window.showErrorMessage(
                I18n.get('commands.importFailed', validation.error || 'Unknown error')
            );
            return false;
        }

        const commandName = validation.meta.command;

        // 检查是否已存在
        if (this.configManager.commandExists(commandName)) {
            const overwrite = await vscode.window.showWarningMessage(
                I18n.get('commands.commandExists', commandName),
                I18n.get('skills.yes'),
                I18n.get('skills.no')
            );
            if (overwrite !== I18n.get('skills.yes')) {
                return false;
            }
        }

        try {
            // 复制文件到全局目录
            const content = fs.readFileSync(filePath, 'utf8');
            this.configManager.saveCommandMd(commandName, content);

            vscode.window.showInformationMessage(
                I18n.get('commands.importSuccess', commandName)
            );
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(
                I18n.get('commands.importFailed', String(error))
            );
            return false;
        }
    }

    /**
     * 从对话框导入
     */
    public async importFromDialog(): Promise<boolean> {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'Markdown': ['md']
            },
            title: 'Import Command'
        });

        if (!uris || uris.length === 0) {
            return false;
        }

        return this.importFromFile(uris[0].fsPath);
    }

    /**
     * 从 URI 列表导入（用于拖拽）
     * Supports both .md files and folders (scans folders for .md files)
     */
    public async importFromUris(uris: vscode.Uri[]): Promise<boolean> {
        let success = false;
        const errors: string[] = [];
        let successCount = 0;

        for (const uri of uris) {
            const fsPath = uri.fsPath;

            if (!fs.existsSync(fsPath)) {
                errors.push(`${path.basename(fsPath)}: File not found`);
                continue;
            }

            const stat = fs.statSync(fsPath);

            if (stat.isDirectory()) {
                // Scan directory for .md files
                const mdFiles = this.scanDirectoryForMd(fsPath);
                if (mdFiles.length === 0) {
                    errors.push(`${path.basename(fsPath)}: No .md command files found in folder`);
                    continue;
                }
                for (const mdFile of mdFiles) {
                    const result = await this.importFromFile(mdFile);
                    if (result) {
                        successCount++;
                        success = true;
                    }
                }
            } else if (fsPath.endsWith('.md')) {
                const result = await this.importFromFile(fsPath);
                if (result) {
                    successCount++;
                    success = true;
                }
            } else {
                errors.push(`${path.basename(fsPath)}: Commands must be .md files`);
            }
        }

        // Show summary if dropped multiple items
        if (errors.length > 0 && successCount === 0) {
            vscode.window.showErrorMessage(`Import failed: ${errors.join('; ')}`);
        } else if (errors.length > 0 && successCount > 0) {
            vscode.window.showWarningMessage(
                `Imported ${successCount} command${successCount > 1 ? 's' : ''}, some failed: ${errors.join('; ')}`
            );
        }

        return success;
    }

    /**
     * Scan a directory (non-recursive) for .md files
     */
    private scanDirectoryForMd(dirPath: string): string[] {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            return entries
                .filter(e => e.isFile() && e.name.endsWith('.md'))
                .map(e => path.join(dirPath, e.name));
        } catch {
            return [];
        }
    }
}
