import * as vscode from 'vscode';
import { I18n } from '../../common/i18n';
import { LoadedCommand } from '../../common/types';
import { CommandConfigManager } from './core/commandConfigManager';
import { CommandApplier } from './core/commandApplier';
import { CommandImporter } from './core/commandImporter';
import { CommandCreator } from './core/commandCreator';
import { CommandTreeProvider, CommandTreeItem } from './views/commandTreeProvider';

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

    // 初始化 TreeView
    const treeProvider = new CommandTreeProvider();
    const treeView = vscode.window.createTreeView('ampify-commands-tree', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
        canSelectMany: false,
        dragAndDropController: treeProvider
    });

    context.subscriptions.push(treeView);

    // ==================== 注册命令 ====================

    // 刷新
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.refresh', () => {
            treeProvider.refresh();
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
                treeProvider.setFilter(keyword || undefined);
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
                treeProvider.setFilter(undefined, selected.map(s => s.label));
            }
        })
    );

    // 清除过滤
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.clearFilter', () => {
            treeProvider.clearFilter();
            vscode.window.showInformationMessage(I18n.get('commands.filterCleared'));
        })
    );

    // 创建命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.create', async () => {
            const success = await creator.create();
            if (success) {
                treeProvider.refresh();
            }
        })
    );

    // 导入命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.import', async () => {
            const success = await importer.importFromDialog();
            if (success) {
                treeProvider.refresh();
            }
        })
    );

    // 应用到项目
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.apply', async (item: CommandTreeItem) => {
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
        vscode.commands.registerCommand('ampify.commands.remove', async (item: CommandTreeItem) => {
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
        vscode.commands.registerCommand('ampify.commands.delete', async (item: CommandTreeItem) => {
            if (!item || item.itemType !== 'commandItem') {
                return;
            }

            const command = item.data as LoadedCommand;
            configManager.deleteCommand(command.meta.command);
            vscode.window.showInformationMessage(
                I18n.get('commands.deleted', command.meta.command)
            );
            treeProvider.refresh();
        })
    );

    // 打开命令文件
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.commands.open', async (item: CommandTreeItem) => {
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
        vscode.commands.registerCommand('ampify.commands.preview', async (item: CommandTreeItem) => {
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
