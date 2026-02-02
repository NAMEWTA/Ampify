import * as vscode from 'vscode';
import * as fs from 'fs';
import { SkillConfigManager } from './core/skillConfigManager';
import { SkillGitManager } from './core/skillGitManager';
import { SkillApplier } from './core/skillApplier';
import { SkillImporter } from './core/skillImporter';
import { SkillCreator } from './core/skillCreator';
import { SkillDiffViewer } from './core/skillDiffViewer';
import { SkillTreeProvider, SkillTreeItem } from './views/skillTreeProvider';
import { LoadedSkill } from '../../common/types';
import { I18n } from '../../common/i18n';

export async function registerSkillManager(context: vscode.ExtensionContext): Promise<void> {
    console.log('Loading Skills Manager...');

    try {
        // 初始化核心组件
        const configManager = new SkillConfigManager();
        await configManager.ensureInit();

        const gitManager = new SkillGitManager(configManager);
        await gitManager.init();

        const applier = new SkillApplier(configManager);
        const importer = new SkillImporter(configManager);
        const creator = new SkillCreator(configManager);
        const diffViewer = new SkillDiffViewer(gitManager);
        const treeProvider = new SkillTreeProvider(configManager, gitManager);

        const applyGitConfigFromFile = async (): Promise<void> => {
            try {
                const config = configManager.getConfig();
                const gitConfig = config.gitConfig || {};
                const remoteUrls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
                    ? gitConfig.remoteUrls
                    : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

                await gitManager.init();

                if (gitConfig.userName && gitConfig.userEmail) {
                    await gitManager.configureUser(gitConfig.userName, gitConfig.userEmail);
                }

                if (remoteUrls.length > 0) {
                    await gitManager.setRemotes(remoteUrls);
                }

                treeProvider.refresh();
            } catch (error) {
                console.error('Failed to apply git config:', error);
            }
        };

        // 注册 TreeDataProvider（带拖拽支持）
        const treeView = vscode.window.createTreeView('ampify-skills-tree', {
            treeDataProvider: treeProvider,
            dragAndDropController: treeProvider,
            showCollapseAll: true
        });
        context.subscriptions.push(treeView);

        await applyGitConfigFromFile();

        // 自动同步（pull -> commit -> push）定时任务
        let autoSyncTimer: NodeJS.Timeout | undefined;
        let configWatcher: fs.FSWatcher | undefined;
        let reloadTimer: NodeJS.Timeout | undefined;

        const runAutoSync = async (): Promise<void> => {
            try {
                const status = await gitManager.getStatus();
                if (!status.hasRemote) {
                    const synced = await gitManager.syncRemotesFromConfig();
                    if (!synced) return;
                }

                const pullResult = await gitManager.pull();
                if (!pullResult.success) {
                    return;
                }

                const refreshed = await gitManager.getStatus();
                if (refreshed.hasUncommittedChanges) {
                    const committed = await gitManager.commit('Auto-sync commit');
                    if (!committed) return;
                }

                await gitManager.push({ skipPull: true });
            } catch (error) {
                console.error('Auto sync failed:', error);
            }
        };

        const startAutoSync = (): void => {
            if (autoSyncTimer) {
                clearInterval(autoSyncTimer);
                autoSyncTimer = undefined;
            }

            const config = configManager.getConfig();
            const minutes = config.autoSyncMinutes ?? 10;
            if (minutes <= 0) return;

            autoSyncTimer = setInterval(() => {
                void runAutoSync();
            }, minutes * 60 * 1000);
        };

        startAutoSync();

        const configPath = configManager.getConfigPath();
        configWatcher = fs.watch(configPath, { persistent: false }, () => {
            if (reloadTimer) {
                clearTimeout(reloadTimer);
            }
            reloadTimer = setTimeout(() => {
                startAutoSync();
                void applyGitConfigFromFile();
            }, 300);
        });

        context.subscriptions.push({
            dispose: () => {
                if (autoSyncTimer) {
                    clearInterval(autoSyncTimer);
                }
                if (configWatcher) {
                    configWatcher.close();
                }
                if (reloadTimer) {
                    clearTimeout(reloadTimer);
                }
            }
        });

    // ==================== 注册命令 ====================

    // 刷新
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.refresh', () => {
            treeProvider.refresh();
        })
    );

    // 搜索
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.search', async () => {
            const keyword = await vscode.window.showInputBox({
                prompt: I18n.get('skills.searchPlaceholder'),
                value: treeProvider.getFilterState().keyword || ''
            });

            if (keyword !== undefined) {
                treeProvider.setSearchKeyword(keyword || undefined);
                if (keyword) {
                    vscode.window.showInformationMessage(I18n.get('skills.filterActive', keyword));
                }
            }
        })
    );

    // 按标签过滤
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.filterByTag', async () => {
            const allTags = configManager.getAllTags();
            
            if (allTags.length === 0) {
                vscode.window.showInformationMessage('No tags available');
                return;
            }

            const currentTags = treeProvider.getFilterState().tags || [];
            const items = allTags.map(tag => ({
                label: tag,
                picked: currentTags.includes(tag)
            }));

            const selected = await vscode.window.showQuickPick(items, {
                canPickMany: true,
                placeHolder: I18n.get('skills.selectTags')
            });

            if (selected !== undefined) {
                const tags = selected.map(item => item.label);
                treeProvider.setTagFilter(tags.length > 0 ? tags : undefined);
                if (tags.length > 0) {
                    vscode.window.showInformationMessage(
                        I18n.get('skills.filterActive', tags.join(', '))
                    );
                }
            }
        })
    );

    // 清除过滤
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.clearFilter', () => {
            treeProvider.clearFilter();
            vscode.window.showInformationMessage(I18n.get('skills.filterCleared'));
        })
    );

    // 创建新 Skill
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.create', async () => {
            const result = await creator.create();
            if (result.success) {
                treeProvider.refresh();
            }
        })
    );

    // 导入 Skill（对话框）
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.import', async () => {
            const result = await importer.importFromDialog();
            if (result.success && result.skillName) {
                vscode.window.showInformationMessage(
                    I18n.get('skills.importSuccess', result.skillName)
                );
                treeProvider.refresh();
            } else if (result.error && result.error !== 'No directory selected' && result.error !== 'User cancelled') {
                vscode.window.showErrorMessage(I18n.get('skills.importFailed', result.error));
            }
        })
    );

    // 从 URI 导入（拖拽）
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.importFromUris', async (uris: vscode.Uri[]) => {
            const result = await importer.importFromUris(uris);
            if (result.success > 0) {
                vscode.window.showInformationMessage(
                    `Successfully imported ${result.success} skill(s)`
                );
                treeProvider.refresh();
            }
            if (result.failed > 0) {
                vscode.window.showWarningMessage(
                    `Failed to import ${result.failed} item(s): ${result.errors.join('; ')}`
                );
            }
        })
    );

    // 应用 Skill 到项目
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.apply', async (item: SkillTreeItem) => {
            if (!item || item.itemType !== 'skillItem') return;
            
            const workspaceRoot = getWorkspaceRoot();
            if (!workspaceRoot) {
                vscode.window.showErrorMessage(I18n.get('skills.noWorkspace'));
                return;
            }

            const skill = item.data as LoadedSkill;
            const result = await applier.apply(skill, workspaceRoot);
            
            if (result.success) {
                vscode.window.showInformationMessage(I18n.get('skills.applied', skill.meta.name));
            } else if (result.error && result.error !== 'User cancelled due to prerequisites') {
                vscode.window.showErrorMessage(I18n.get('skills.applyFailed', result.error));
            }
        })
    );

    // 预览 SKILL.md
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.preview', async (item: SkillTreeItem | LoadedSkill) => {
            let skill: LoadedSkill;
            
            if ('itemType' in item) {
                if (item.itemType !== 'skillItem') return;
                skill = item.data as LoadedSkill;
            } else {
                skill = item;
            }

            if (skill.skillMdPath) {
                const doc = await vscode.workspace.openTextDocument(skill.skillMdPath);
                await vscode.window.showTextDocument(doc);
            }
        })
    );

    // 显示 Diff
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.showDiff', async (item: SkillTreeItem) => {
            if (!item || item.itemType !== 'skillItem') {
                // 显示所有本地变更
                await diffViewer.showLocalChanges();
                return;
            }

            const skill = item.data as LoadedSkill;
            await diffViewer.showSkillDiff(skill.meta.name);
        })
    );

    // 打开 Skill 文件
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.openFile', async (filePath: string) => {
            if (!filePath) return;
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);
        })
    );

    // 编辑 Git 配置
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.editGitConfig', async (field?: string) => {
            const configPath = configManager.getConfigPath();
            const doc = await vscode.workspace.openTextDocument(configPath);
            const editor = await vscode.window.showTextDocument(doc);

            const text = doc.getText();
            let targetIndex = text.indexOf('"gitConfig"');

            if (field) {
                const fieldIndex = text.indexOf(`"${field}"`);
                const altFieldIndex = field === 'remoteUrl' ? text.indexOf('"remoteUrls"') : -1;
                targetIndex = fieldIndex >= 0 ? fieldIndex : (altFieldIndex >= 0 ? altFieldIndex : targetIndex);
            }

            if (targetIndex >= 0) {
                const position = doc.positionAt(targetIndex);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
            }

            vscode.window.showInformationMessage(I18n.get('skills.gitConfigOpened'));
        })
    );

    // 交互式配置 Git
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.openConfigWizard', async () => {
            const config = configManager.getConfig();
            const gitConfig = config.gitConfig || {};
            const remoteUrls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
                ? gitConfig.remoteUrls
                : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

            const userName = await vscode.window.showInputBox({
                prompt: I18n.get('skills.inputUserName'),
                value: gitConfig.userName || ''
            });
            if (userName === undefined) return;

            const userEmail = await vscode.window.showInputBox({
                prompt: I18n.get('skills.inputUserEmail'),
                value: gitConfig.userEmail || ''
            });
            if (userEmail === undefined) return;

            const remoteInput = await vscode.window.showInputBox({
                prompt: I18n.get('skills.inputRemoteUrls'),
                value: remoteUrls.join(', ')
            });
            if (remoteInput === undefined) return;

            const parsedRemoteUrls = remoteInput
                .split(/[\n,]/)
                .map(s => s.trim())
                .filter(Boolean);

            configManager.updateGitConfig({
                userName: userName || undefined,
                userEmail: userEmail || undefined,
                remoteUrls: parsedRemoteUrls,
                remoteUrl: parsedRemoteUrls.length === 1 ? parsedRemoteUrls[0] : undefined
            });

            await applyGitConfigFromFile();
            vscode.window.showInformationMessage(I18n.get('skills.gitConfigUpdated'));
        })
    );

    // 打开 Skills 文件夹
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.openFolder', (item?: SkillTreeItem) => {
            let folderPath: string;
            
            if (item && item.itemType === 'skillItem') {
                const skill = item.data as LoadedSkill;
                folderPath = skill.path;
            } else {
                folderPath = configManager.getSkillsDir();
            }

            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(folderPath));
        })
    );

    // 删除 Skill
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.delete', async (item: SkillTreeItem) => {
            if (!item || item.itemType !== 'skillItem') return;
            
            const skill = item.data as LoadedSkill;
            const confirm = await vscode.window.showWarningMessage(
                I18n.get('skills.confirmDelete', skill.meta.name),
                { modal: true },
                I18n.get('skills.yes')
            );

            if (confirm === I18n.get('skills.yes')) {
                const success = configManager.deleteSkill(skill.meta.name);
                if (success) {
                    vscode.window.showInformationMessage(I18n.get('skills.deleted', skill.meta.name));
                    treeProvider.refresh();
                }
            }
        })
    );

    // 从项目移除 Skill
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.remove', async (item: SkillTreeItem) => {
            if (!item || item.itemType !== 'skillItem') return;
            
            const workspaceRoot = getWorkspaceRoot();
            if (!workspaceRoot) {
                vscode.window.showErrorMessage(I18n.get('skills.noWorkspace'));
                return;
            }

            const skill = item.data as LoadedSkill;
            const success = applier.remove(skill.meta.name, workspaceRoot);
            
            if (success) {
                vscode.window.showInformationMessage(I18n.get('skills.removed', skill.meta.name));
            }
        })
    );

    // Pull
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.pull', async () => {
            const status = await gitManager.getStatus();
            
            if (!status.hasRemote) {
                const synced = await gitManager.syncRemotesFromConfig();
                if (!synced) {
                    vscode.window.showErrorMessage(I18n.get('skills.noRemoteConfigured'));
                    return;
                }
            }

            if (status.hasUncommittedChanges) {
                const choice = await vscode.window.showWarningMessage(
                    I18n.get('skills.hasUncommittedChanges'),
                    I18n.get('skills.yes'),
                    I18n.get('skills.cancel')
                );
                if (choice !== I18n.get('skills.yes')) {
                    return;
                }
            }

            // 显示远程变更预览
            const remoteChanges = await gitManager.getRemoteDiff();
            if (remoteChanges.length > 0) {
                const choice = await vscode.window.showInformationMessage(
                    I18n.get('skills.confirmPull', remoteChanges.length.toString()),
                    I18n.get('skills.viewDiff'),
                    I18n.get('skills.yes'),
                    I18n.get('skills.cancel')
                );

                if (choice === I18n.get('skills.viewDiff')) {
                    await diffViewer.showRemoteChanges();
                    return;
                }
                if (choice !== I18n.get('skills.yes')) {
                    return;
                }
            }

            const result = await gitManager.pull();
            
            if (result.success) {
                vscode.window.showInformationMessage(I18n.get('skills.pullSuccess'));
                treeProvider.refresh();
            } else {
                if (result.conflict) {
                    vscode.window.showErrorMessage(I18n.get('skills.mergeConflict'));
                    return;
                }
                if (result.authError) {
                    vscode.window.showErrorMessage(I18n.get('skills.configureAuth'));
                } else {
                    vscode.window.showErrorMessage(I18n.get('skills.pullFailed', result.error || 'Unknown error'));
                }
            }
        })
    );

    // Push
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.push', async () => {
            const status = await gitManager.getStatus();
            
            if (!status.hasRemote) {
                const synced = await gitManager.syncRemotesFromConfig();
                if (!synced) {
                    vscode.window.showErrorMessage(I18n.get('skills.noRemoteConfigured'));
                    return;
                }
            }

            const pullResult = await gitManager.pull();
            if (!pullResult.success) {
                if (pullResult.conflict) {
                    vscode.window.showErrorMessage(I18n.get('skills.mergeConflict'));
                    return;
                }
                if (pullResult.authError) {
                    vscode.window.showErrorMessage(I18n.get('skills.configureAuth'));
                    return;
                }
                vscode.window.showErrorMessage(I18n.get('skills.pullFailed', pullResult.error || 'Unknown error'));
                return;
            }

            // 显示本地变更预览
            const localChanges = await gitManager.getLocalChanges();
            if (localChanges.length > 0) {
                const choice = await vscode.window.showInformationMessage(
                    I18n.get('skills.confirmPush', localChanges.length.toString()),
                    I18n.get('skills.viewDiff'),
                    I18n.get('skills.yes'),
                    I18n.get('skills.cancel')
                );

                if (choice === I18n.get('skills.viewDiff')) {
                    await diffViewer.showLocalChanges();
                    return;
                }
                if (choice !== I18n.get('skills.yes')) {
                    return;
                }
            }

            const result = await gitManager.push({ skipPull: true });
            
            if (result.success) {
                vscode.window.showInformationMessage(I18n.get('skills.pushSuccess'));
                treeProvider.refresh();
            } else {
                if (result.conflict) {
                    vscode.window.showErrorMessage(I18n.get('skills.mergeConflict'));
                    return;
                }
                if (result.authError) {
                    vscode.window.showErrorMessage(I18n.get('skills.configureAuth'));
                } else {
                    vscode.window.showErrorMessage(I18n.get('skills.pushFailed', result.error || 'Unknown error'));
                }
            }
        })
    );

        console.log('Module "Skills Manager" loaded');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Skills Manager failed to load:', message);
        vscode.window.showErrorMessage(`Skills Manager failed to load: ${message}`);
    }
}

/**
 * 获取工作区根目录
 */
function getWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return undefined;
    }
    return folders[0].uri.fsPath;
}
