import * as vscode from 'vscode';
import { I18n } from '../../common/i18n';
import { LoadedCommand } from '../../common/types';
import { CommandConfigManager } from './core/commandConfigManager';
import { CommandApplier } from './core/commandApplier';
import { CommandImporter } from './core/commandImporter';
import { CommandCreator } from './core/commandCreator';

/** Bridge 兼容的 item 类型 */
interface CommandItemLike {
    itemType?: string;
    data?: unknown;
}

/**
 * 注册 Commands Manager 模块
 */
export async function registerCommandManager(context: vscode.ExtensionContext): Promise<void> {
    // 初始化配置管理器
    const configManager = CommandConfigManager.getInstance();
    configManager.ensureInit();

    // 初始化其他组件
    const applier = CommandApplier.getInstance();
    const importer = CommandImporter.getInstance();
    const creator = CommandCreator.getInstance();

    // TreeView 已由 mainView 模块统一管理

    // ==================== 注册命令 ====================

    // 刷新 (由 mainView 统一刷新)
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.refresh', () => {
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    // 搜索（由 WebView overlay 处理，命令保留为空操作）
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.search', () => {
            // Search is handled by WebView overlay
        })
    );

    // 按标签过滤（由 WebView overlay 处理）
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.filterByTag', () => {
            // Filter is handled by WebView overlay
        })
    );

    // 清除过滤（由 WebView 处理）
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.clearFilter', () => {
            // Clear filter is handled by WebView
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    // 创建命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.create', async () => {
            const success = await creator.create();
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    // 导入命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.import', async () => {
            const success = await importer.importFromDialog();
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.importFromUris', async (uris: vscode.Uri[]) => {
            const success = await importer.importFromUris(uris);
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.importFromExplorer', async (uri: vscode.Uri, uris?: vscode.Uri[]) => {
            const targets = uris && uris.length > 0 ? uris : (uri ? [uri] : []);
            if (targets.length === 0) return;
            await vscode.commands.executeCommand('ampify.commands.importFromUris', targets);
        })
    );

    // 应用到项目
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.apply', async (item: CommandItemLike) => {
            if (!item || item.itemType !== 'commandItem') {
                return;
            }

            const command = item.data as LoadedCommand;
            const workspaceFolders = vscode.workspace.workspaceFolders;

            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(I18n.get('commands.noWorkspace'));
                return;
            }

            let targetFolder: vscode.WorkspaceFolder;
            if (workspaceFolders.length === 1) {
                targetFolder = workspaceFolders[0];
            } else {
                const selected = await vscode.window.showWorkspaceFolderPick({
                    placeHolder: 'Select workspace folder'
                });
                if (!selected) {
                    return;
                }
                targetFolder = selected;
            }

            await applier.apply(command, targetFolder.uri.fsPath);
        })
    );

    // 从项目移除
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.remove', async (item: CommandItemLike) => {
            if (!item || item.itemType !== 'commandItem') {
                return;
            }

            const command = item.data as LoadedCommand;
            const workspaceFolders = vscode.workspace.workspaceFolders;

            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(I18n.get('commands.noWorkspace'));
                return;
            }

            let targetFolder: vscode.WorkspaceFolder;
            if (workspaceFolders.length === 1) {
                targetFolder = workspaceFolders[0];
            } else {
                const selected = await vscode.window.showWorkspaceFolderPick({
                    placeHolder: 'Select workspace folder'
                });
                if (!selected) {
                    return;
                }
                targetFolder = selected;
            }

            await applier.remove(command.meta.command, targetFolder.uri.fsPath);
        })
    );

    // 删除命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.delete', async (item: CommandItemLike) => {
            if (!item || item.itemType !== 'commandItem') {
                return;
            }

            const command = item.data as LoadedCommand;
            configManager.deleteCommand(command.meta.command);
            vscode.window.showInformationMessage(
                I18n.get('commands.deleted', command.meta.command)
            );
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    // 打开命令文件
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.open', async (item: CommandItemLike) => {
            if (!item || item.itemType !== 'commandItem') {
                return;
            }

            const command = item.data as LoadedCommand;
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(command.path));
            await vscode.window.showTextDocument(doc, { preview: false });
        })
    );

    // 预览命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.preview', async (item: CommandItemLike) => {
            if (!item || item.itemType !== 'commandItem') {
                return;
            }

            const command = item.data as LoadedCommand;
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(command.path));
            await vscode.window.showTextDocument(doc, { preview: true });
        })
    );

    // 打开命令目录
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.openFolder', async () => {
            const commandsDir = configManager.getCommandsDir();
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(commandsDir));
        })
    );

    console.log(I18n.get('commands.initialized'));
}
