import * as vscode from 'vscode';
import * as fs from 'fs';
import { GitShareTreeProvider } from './views/gitShareTreeProvider';
import { I18n } from '../../common/i18n';
import { getGitShareDir } from '../../common/paths';
import { DiffViewer } from '../../common/git';

export function registerGitShare(context: vscode.ExtensionContext): GitShareTreeProvider {
    console.log('Loading Git Share module...');

    const treeProvider = new GitShareTreeProvider();
    const gitManager = treeProvider.getGitManager();

    gitManager.ensureInit();

    const treeView = vscode.window.createTreeView('ampify-gitshare-tree', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    const configPath = gitManager.getConfigPath();
    let configWatcher: fs.FSWatcher | undefined;
    let reloadTimer: NodeJS.Timeout | undefined;
    let autoSyncTimer: NodeJS.Timeout | undefined;

    if (fs.existsSync(configPath)) {
        configWatcher = fs.watch(configPath, { persistent: false }, () => {
            if (reloadTimer) {
                clearTimeout(reloadTimer);
            }
            reloadTimer = setTimeout(() => {
                treeProvider.refresh();
            }, 300);
        });
    }

    const runAutoSync = async (): Promise<void> => {
        const result = await gitManager.sync();

        if (result.success) {
            treeProvider.refresh();
            vscode.commands.executeCommand('ampify.skills.refresh');
            vscode.commands.executeCommand('ampify.commands.refresh');
        } else if (result.conflict) {
            vscode.window.showErrorMessage(I18n.get('gitShare.mergeConflict'));
        } else if (result.authError) {
            vscode.window.showErrorMessage(I18n.get('gitShare.configureAuth'));
        } else if (result.error) {
            vscode.window.showErrorMessage(I18n.get('gitShare.syncFailed', result.error));
        }
    };

    const startAutoSync = (): void => {
        if (autoSyncTimer) {
            clearInterval(autoSyncTimer);
            autoSyncTimer = undefined;
        }

        autoSyncTimer = setInterval(() => {
            void runAutoSync();
        }, 300 * 1000);
    };

    startAutoSync();

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

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.gitShare.refresh', () => {
            treeProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.gitShare.sync', async () => {
            const result = await gitManager.sync();

            if (result.success) {
                if (result.localOnly) {
                    vscode.window.showInformationMessage(I18n.get('gitShare.localOnlyCommit'));
                } else {
                    vscode.window.showInformationMessage(I18n.get('gitShare.syncSuccess'));
                }
                treeProvider.refresh();
                vscode.commands.executeCommand('ampify.skills.refresh');
                vscode.commands.executeCommand('ampify.commands.refresh');
            } else {
                if (result.conflict) {
                    vscode.window.showErrorMessage(I18n.get('gitShare.mergeConflict'));
                    return;
                }
                if (result.authError) {
                    vscode.window.showErrorMessage(I18n.get('gitShare.configureAuth'));
                } else {
                    vscode.window.showErrorMessage(I18n.get('gitShare.syncFailed', result.error || 'Unknown error'));
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.gitShare.showDiff', async () => {
            const diffViewer = new DiffViewer(gitManager);
            await diffViewer.showLocalChanges();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.gitShare.openFolder', () => {
            const folderPath = getGitShareDir();
            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(folderPath));
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.gitShare.editConfig', async (field?: string) => {
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

            vscode.window.showInformationMessage(I18n.get('gitShare.configOpened'));
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.gitShare.openConfigWizard', async () => {
            const gitConfig = gitManager.getConfig().gitConfig || {};
            const remoteUrls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
                ? gitConfig.remoteUrls
                : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

            const userName = await vscode.window.showInputBox({
                prompt: I18n.get('gitShare.inputUserName'),
                value: gitConfig.userName || ''
            });
            if (userName === undefined) return;

            const userEmail = await vscode.window.showInputBox({
                prompt: I18n.get('gitShare.inputUserEmail'),
                value: gitConfig.userEmail || ''
            });
            if (userEmail === undefined) return;

            const remoteInput = await vscode.window.showInputBox({
                prompt: I18n.get('gitShare.inputRemoteUrls'),
                value: remoteUrls.join(', ')
            });
            if (remoteInput === undefined) return;

            const parsedRemoteUrls = remoteInput
                .split(/[\n,]/)
                .map(s => s.trim())
                .filter(Boolean);

            gitManager.updateGitConfig({
                userName: userName || undefined,
                userEmail: userEmail || undefined,
                remoteUrls: parsedRemoteUrls,
                remoteUrl: parsedRemoteUrls.length === 1 ? parsedRemoteUrls[0] : undefined
            });

            if (userName && userEmail) {
                await gitManager.configureUser(userName, userEmail);
            }
            if (parsedRemoteUrls.length > 0) {
                await gitManager.setRemotes(parsedRemoteUrls);
            }

            treeProvider.refresh();
            vscode.window.showInformationMessage(I18n.get('gitShare.configUpdated'));
        })
    );

    console.log('Git Share module loaded');
    return treeProvider;
}