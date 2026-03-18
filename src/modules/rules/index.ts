import * as vscode from 'vscode';
import { I18n } from '../../common/i18n';
import { LoadedRule } from '../../common/types';
import { RuleConfigManager } from './core/ruleConfigManager';
import { RuleApplier } from './core/ruleApplier';
import { RuleImporter } from './core/ruleImporter';
import { RuleCreator } from './core/ruleCreator';

interface RuleItemLike {
    itemType?: string;
    data?: unknown;
}

export async function registerRuleManager(context: vscode.ExtensionContext): Promise<void> {
    const configManager = RuleConfigManager.getInstance();
    configManager.ensureInit();

    const applier = RuleApplier.getInstance();
    const importer = RuleImporter.getInstance();
    const creator = RuleCreator.getInstance();

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.refresh', () => {
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.search', () => {
            // Search is handled by WebView overlay
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.filterByTag', () => {
            // Filter is handled by WebView overlay
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.clearFilter', () => {
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.create', async () => {
            const success = await creator.create();
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.import', async () => {
            const success = await importer.importFromDialog();
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.importFromUris', async (uris: vscode.Uri[]) => {
            const success = await importer.importFromUris(uris);
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.apply', async (item: RuleItemLike) => {
            if (!item || item.itemType !== 'ruleItem') {
                return;
            }

            const rule = item.data as LoadedRule;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(I18n.get('rules.noWorkspace'));
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

            await applier.apply(rule, targetFolder.uri.fsPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.remove', async (item: RuleItemLike) => {
            if (!item || item.itemType !== 'ruleItem') {
                return;
            }

            const rule = item.data as LoadedRule;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(I18n.get('rules.noWorkspace'));
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

            await applier.remove(rule.meta.rule, targetFolder.uri.fsPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.delete', async (item: RuleItemLike) => {
            if (!item || item.itemType !== 'ruleItem') {
                return;
            }

            const rule = item.data as LoadedRule;
            configManager.deleteRule(rule.meta.rule);
            vscode.window.showInformationMessage(I18n.get('rules.deleted', rule.meta.rule));
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.open', async (item: RuleItemLike) => {
            if (!item || item.itemType !== 'ruleItem') {
                return;
            }

            const rule = item.data as LoadedRule;
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(rule.path));
            await vscode.window.showTextDocument(doc, { preview: false });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.preview', async (item: RuleItemLike) => {
            if (!item || item.itemType !== 'ruleItem') {
                return;
            }

            const rule = item.data as LoadedRule;
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(rule.path));
            await vscode.window.showTextDocument(doc, { preview: true });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.rules.openFolder', async () => {
            const rulesDir = configManager.getRulesDir();
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(rulesDir));
        })
    );

    console.log(I18n.get('rules.initialized'));
}
