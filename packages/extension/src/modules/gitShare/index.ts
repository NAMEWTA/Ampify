import * as vscode from 'vscode';
import * as fs from 'fs';
import { I18n } from '../../common/i18n';
import { getGitShareDir } from '../../common/paths';
import { DiffViewer, GitManager } from '../../common/git';

export function registerGitShare(context: vscode.ExtensionContext): void {
    console.log('Loading Git Share module...');

    const gitManager = new GitManager();

    gitManager.ensureInit();

    const configPath = gitManager.getConfigPath();
    let configWatcher: fs.FSWatcher | undefined;
    let reloadTimer: NodeJS.Timeout | undefined;

    if (fs.existsSync(configPath)) {
        configWatcher = fs.watch(configPath, { persistent: false }, () => {
            if (reloadTimer) {
                clearTimeout(reloadTimer);
            }
            reloadTimer = setTimeout(() => {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }, 300);
        });
    }

    context.subscriptions.push({
        dispose: () => {
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
            vscode.commands.executeCommand('ampify.mainView.refresh');
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
                vscode.commands.executeCommand('ampify.mainView.refresh');
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
        vscode.commands.registerCommand('ampify.gitShare.pull', async () => {
            const result = await gitManager.pull();
            if (result.success) {
                if (result.noRemote) {
                    vscode.window.showWarningMessage(I18n.get('gitShare.noRemote'));
                } else {
                    vscode.window.showInformationMessage(I18n.get('gitShare.pullSuccess'));
                }
                vscode.commands.executeCommand('ampify.mainView.refresh');
            } else if (result.conflict) {
                vscode.window.showErrorMessage(I18n.get('gitShare.mergeConflict'));
            } else if (result.authError) {
                vscode.window.showErrorMessage(I18n.get('gitShare.configureAuth'));
            } else {
                vscode.window.showErrorMessage(I18n.get('gitShare.pullFailed', result.error || 'Unknown error'));
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.gitShare.push', async () => {
            const result = await gitManager.push();
            if (result.success) {
                if (result.noRemote) {
                    vscode.window.showWarningMessage(I18n.get('gitShare.noRemote'));
                } else {
                    vscode.window.showInformationMessage(I18n.get('gitShare.pushSuccess'));
                }
                vscode.commands.executeCommand('ampify.mainView.refresh');
            } else if (result.conflict) {
                vscode.window.showErrorMessage(I18n.get('gitShare.mergeConflict'));
            } else if (result.authError) {
                vscode.window.showErrorMessage(I18n.get('gitShare.configureAuth'));
            } else {
                vscode.window.showErrorMessage(I18n.get('gitShare.pushFailed', result.error || 'Unknown error'));
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.gitShare.commit', async () => {
            const message = await vscode.window.showInputBox({
                prompt: I18n.get('gitShare.commitPrompt'),
                value: I18n.get('gitShare.commitDefaultMessage')
            });
            if (message === undefined) {
                return;
            }

            const committed = await gitManager.commit(message || I18n.get('gitShare.commitDefaultMessage'));
            if (committed) {
                vscode.window.showInformationMessage(I18n.get('gitShare.commitSuccess'));
                vscode.commands.executeCommand('ampify.mainView.refresh');
            } else {
                vscode.window.showErrorMessage(I18n.get('gitShare.commitFailed', 'Commit failed'));
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

            vscode.commands.executeCommand('ampify.mainView.refresh');
            vscode.window.showInformationMessage(I18n.get('gitShare.configUpdated'));
        })
    );

    console.log('Git Share module loaded');
}