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

    // 搜索
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.search', async () => {
            const keyword = await vscode.window.showInputBox({
                prompt: I18n.get('commands.searchPlaceholder'),
                placeHolder: I18n.get('commands.searchPlaceholder')
            });
            if (keyword !== undefined) {
                // 搜索状态由 mainView bridge 管理
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    // 按标签过滤
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.filterByTag', async () => {
            const allTags = configManager.getAllTags();
            if (allTags.length === 0) {
                vscode.window.showInformationMessage(I18n.get('commands.noCommands'));
                return;
            }

            const selected = await vscode.window.showQuickPick(
                allTags.map(tag => ({ label: tag })),
                {
                    canPickMany: true,
                    placeHolder: I18n.get('commands.selectTags')
                }
            );

            if (selected && selected.length > 0) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    // 清除过滤
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.clearFilter', () => {
            vscode.window.showInformationMessage(I18n.get('commands.filterCleared'));
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
