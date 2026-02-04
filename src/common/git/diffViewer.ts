import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { GitManager } from './gitManager';
import { DiffFile } from '../types';
import { I18n } from '../i18n';

/**
 * 共享 Diff 查看器
 * 统一管理 gitshare 目录的 Diff 展示
 */
export class DiffViewer {
    constructor(private gitManager: GitManager) {
    }

    /**
     * 显示本地变更的 Diff
     */
    public async showLocalChanges(): Promise<void> {
        const changes = await this.gitManager.getLocalChanges();
        
        if (changes.length === 0) {
            vscode.window.showInformationMessage(I18n.get('gitShare.noChanges'));
            return;
        }

        await this.showDiffPicker(changes, 'local');
    }

    /**
     * 显示远程变更的 Diff
     */
    public async showRemoteChanges(): Promise<void> {
        const changes = await this.gitManager.getRemoteDiff();
        
        if (changes.length === 0) {
            vscode.window.showInformationMessage(I18n.get('gitShare.noChanges'));
            return;
        }

        await this.showDiffPicker(changes, 'remote');
    }

    /**
     * 显示指定模块的本地变更
     */
    public async showModuleLocalChanges(moduleName: string): Promise<void> {
        const changes = await this.gitManager.getModuleChanges(moduleName);
        
        if (changes.length === 0) {
            vscode.window.showInformationMessage(I18n.get('gitShare.noChanges'));
            return;
        }

        await this.showDiffPicker(changes, 'local');
    }

    /**
     * 显示 Diff 选择器
     */
    private async showDiffPicker(changes: DiffFile[], mode: 'local' | 'remote'): Promise<void> {
        const items: vscode.QuickPickItem[] = changes.map(change => ({
            label: this.getStatusIcon(change.status) + ' ' + change.path,
            description: change.status,
            detail: change.path
        }));

        items.unshift({
            label: `$(list-flat) ${I18n.get('gitShare.changedFiles', changes.length.toString())}`,
            description: '',
            kind: vscode.QuickPickItemKind.Separator
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: I18n.get('gitShare.viewDiff'),
            canPickMany: false
        });

        if (selected && selected.detail) {
            await this.openDiff(selected.detail, mode);
        }
    }

    /**
     * 获取状态图标
     */
    private getStatusIcon(status: DiffFile['status']): string {
        switch (status) {
            case 'added': return '$(diff-added)';
            case 'modified': return '$(diff-modified)';
            case 'deleted': return '$(diff-removed)';
            case 'renamed': return '$(diff-renamed)';
            default: return '$(file)';
        }
    }

    /**
     * 打开 Diff 视图
     */
    public async openDiff(filePath: string, mode: 'local' | 'remote'): Promise<void> {
        const fullPath = this.gitManager.getFilePath(filePath);

        try {
            if (mode === 'local') {
                // 本地变更：HEAD vs Working Directory
                await this.openLocalDiff(filePath, fullPath);
            } else {
                // 远程变更：Local vs Remote
                await this.openRemoteDiff(filePath, fullPath);
            }
        } catch (error) {
            console.error('Failed to open diff:', error);
            // 如果 diff 失败，直接打开文件
            if (fs.existsSync(fullPath)) {
                const doc = await vscode.workspace.openTextDocument(fullPath);
                await vscode.window.showTextDocument(doc);
            }
        }
    }

    /**
     * 打开本地 Diff（HEAD vs 工作目录）
     */
    private async openLocalDiff(relativePath: string, fullPath: string): Promise<void> {
        // 获取 HEAD 版本内容
        const headContent = await this.gitManager.getFileContent(relativePath, 'HEAD');
        
        if (headContent === null) {
            // 新文件，直接打开
            if (fs.existsSync(fullPath)) {
                const doc = await vscode.workspace.openTextDocument(fullPath);
                await vscode.window.showTextDocument(doc);
            }
            return;
        }

        // 创建临时文件存储 HEAD 版本
        const tempDir = path.join(os.tmpdir(), 'ampify-diff');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const headFileName = `HEAD_${path.basename(relativePath)}`;
        const headFilePath = path.join(tempDir, headFileName);
        fs.writeFileSync(headFilePath, headContent, 'utf8');

        const headUri = vscode.Uri.file(headFilePath);
        const localUri = vscode.Uri.file(fullPath);

        const title = I18n.get('gitShare.diffTitle', path.basename(relativePath));

        await vscode.commands.executeCommand('vscode.diff', headUri, localUri, title);
    }

    /**
     * 打开远程 Diff（本地 vs 远程）
     */
    private async openRemoteDiff(relativePath: string, fullPath: string): Promise<void> {
        // 获取远程版本内容
        const remoteContent = await this.gitManager.getRemoteFileContent(relativePath);
        
        if (remoteContent === null) {
            // 远程不存在，直接打开本地
            if (fs.existsSync(fullPath)) {
                const doc = await vscode.workspace.openTextDocument(fullPath);
                await vscode.window.showTextDocument(doc);
            }
            return;
        }

        // 创建临时文件存储远程版本
        const tempDir = path.join(os.tmpdir(), 'ampify-diff');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const remoteFileName = `REMOTE_${path.basename(relativePath)}`;
        const remoteFilePath = path.join(tempDir, remoteFileName);
        fs.writeFileSync(remoteFilePath, remoteContent, 'utf8');

        // 本地文件
        let localUri: vscode.Uri;
        if (fs.existsSync(fullPath)) {
            localUri = vscode.Uri.file(fullPath);
        } else {
            // 本地不存在，创建空文件
            const localFileName = `LOCAL_${path.basename(relativePath)}`;
            const localFilePath = path.join(tempDir, localFileName);
            fs.writeFileSync(localFilePath, '', 'utf8');
            localUri = vscode.Uri.file(localFilePath);
        }

        const remoteUri = vscode.Uri.file(remoteFilePath);
        const title = I18n.get('gitShare.diffTitle', path.basename(relativePath));

        await vscode.commands.executeCommand('vscode.diff', localUri, remoteUri, title);
    }
}
