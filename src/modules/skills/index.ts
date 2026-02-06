import * as vscode from 'vscode';
import { SkillConfigManager } from './core/skillConfigManager';
import { SkillApplier } from './core/skillApplier';
import { SkillImporter } from './core/skillImporter';
import { SkillCreator } from './core/skillCreator';
import { AgentMdManager } from './core/agentMdManager';
import { LoadedSkill } from '../../common/types';
import { I18n } from '../../common/i18n';

/** Bridge 兼容�?item 类型 */
interface SkillItemLike {
    itemType?: string;
    data?: unknown;
}

export async function registerSkillManager(context: vscode.ExtensionContext): Promise<void> {
    console.log('Loading Skills module...');

    try {
        // 初始化核心组件（使用单例模式�?
        const configManager = SkillConfigManager.getInstance();
        configManager.ensureInit();

        const applier = new SkillApplier(configManager);
        const importer = new SkillImporter(configManager);
        const creator = new SkillCreator(configManager);
        const agentMdManager = new AgentMdManager(configManager);

        // TreeView 已由 mainView 模块统一管理


    // ==================== 注册命令 ====================

    // 刷新
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.refresh', () => {
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    // 搜索
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.search', async () => {
            const keyword = await vscode.window.showInputBox({
                prompt: I18n.get('skills.searchPlaceholder'),
                value: ''
            });

            if (keyword !== undefined) {
                // 搜索状态由 mainView bridge 管理
                if (keyword) {
                    vscode.window.showInformationMessage(I18n.get('skills.filterActive', keyword));
                }
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    // 按标签过�?
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.filterByTag', async () => {
            const allTags = configManager.getAllTags();
            
            if (allTags.length === 0) {
                vscode.window.showInformationMessage('No tags available');
                return;
            }

            const items = allTags.map(tag => ({
                label: tag,
                picked: false
            }));

            const selected = await vscode.window.showQuickPick(items, {
                canPickMany: true,
                placeHolder: I18n.get('skills.selectTags')
            });

            if (selected !== undefined) {
                const tags = selected.map(item => item.label);
                if (tags.length > 0) {
                    vscode.window.showInformationMessage(
                        I18n.get('skills.filterActive', tags.join(', '))
                    );
                }
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    // 清除过滤
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.clearFilter', () => {
            vscode.window.showInformationMessage(I18n.get('skills.filterCleared'));
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    // 创建�?Skill
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.create', async () => {
            const result = await creator.create();
            if (result.success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    // 导入 Skill（对话框�?
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.import', async () => {
            const result = await importer.importFromDialog();
            if (result.success && result.skillName) {
                vscode.window.showInformationMessage(
                    I18n.get('skills.importSuccess', result.skillName)
                );
                vscode.commands.executeCommand('ampify.mainView.refresh');
            } else if (result.error && result.error !== 'No directory selected' && result.error !== 'User cancelled') {
                vscode.window.showErrorMessage(I18n.get('skills.importFailed', result.error));
            }
        })
    );

    // �?URI 导入（拖拽）
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.importFromUris', async (uris: vscode.Uri[]) => {
            const result = await importer.importFromUris(uris);
            if (result.success > 0) {
                vscode.window.showInformationMessage(
                    `Successfully imported ${result.success} skill(s)`
                );
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
            if (result.failed > 0) {
                vscode.window.showWarningMessage(
                    `Failed to import ${result.failed} item(s): ${result.errors.join('; ')}`
                );
            }
        })
    );

    // 应用 Skill 到项�?
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.apply', async (item: SkillItemLike) => {
            if (!item || item.itemType !== 'skillItem') return;
            
            const workspaceRoot = getWorkspaceRoot();
            if (!workspaceRoot) {
                vscode.window.showErrorMessage(I18n.get('skills.noWorkspace'));
                return;
            }

            const skill = item.data as LoadedSkill;
            const result = await applier.apply(skill, workspaceRoot);
            
            if (result.success) {
                try {
                    const injectTarget = applier.getInjectTarget(workspaceRoot);
                    agentMdManager.scanAndSync(workspaceRoot, injectTarget);
                } catch (error) {
                    console.error('Failed to sync AGENT.md:', error);
                }
                vscode.window.showInformationMessage(I18n.get('skills.applied', skill.meta.name));
            } else if (result.error && result.error !== 'User cancelled due to prerequisites') {
                vscode.window.showErrorMessage(I18n.get('skills.applyFailed', result.error));
            }
        })
    );

    // 同步 AGENT.md（全量扫�?injectTarget�?
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.syncToAgentMd', () => {
            const workspaceRoot = getWorkspaceRoot();
            if (!workspaceRoot) {
                vscode.window.showErrorMessage(I18n.get('skills.noWorkspace'));
                return;
            }

            try {
                const config = configManager.getConfig();
                const injectTarget = config.injectTarget || '.claude/skills/';
                agentMdManager.scanAndSync(workspaceRoot, injectTarget);
                vscode.window.showInformationMessage(I18n.get('skills.agentMdSynced'));
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(I18n.get('skills.applyFailed', message));
            }
        })
    );

    // 预览 SKILL.md
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.preview', async (item: SkillItemLike | LoadedSkill) => {
            let skill: LoadedSkill;
            
            if ('itemType' in item && item.itemType) {
                if (item.itemType !== 'skillItem') return;
                skill = item.data as LoadedSkill;
            } else {
                skill = item as LoadedSkill;
            }

            if (skill.skillMdPath) {
                const doc = await vscode.workspace.openTextDocument(skill.skillMdPath);
                await vscode.window.showTextDocument(doc);
            }
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


    // 打开 Skills 文件�?
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.openFolder', (item?: SkillItemLike) => {
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
        vscode.commands.registerCommand('ampify.skills.delete', async (item: SkillItemLike) => {
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
                    vscode.commands.executeCommand('ampify.mainView.refresh');
                }
            }
        })
    );

    // 从项目移�?Skill
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.skills.remove', async (item: SkillItemLike) => {
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


        console.log('Module "Skills" loaded');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Skills module failed to load:', message);
        vscode.window.showErrorMessage(`Skills module failed to load: ${message}`);
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
