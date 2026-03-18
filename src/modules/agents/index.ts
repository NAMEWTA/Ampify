import * as vscode from 'vscode';
import { I18n } from '../../common/i18n';
import { LoadedAgent } from '../../common/types';
import { AgentConfigManager } from './core/agentConfigManager';
import { AgentApplier } from './core/agentApplier';
import { AgentImporter } from './core/agentImporter';
import { AgentCreator } from './core/agentCreator';

interface AgentItemLike {
    itemType?: string;
    data?: unknown;
}

export async function registerAgentManager(context: vscode.ExtensionContext): Promise<void> {
    const configManager = AgentConfigManager.getInstance();
    configManager.ensureInit();

    const applier = AgentApplier.getInstance();
    const importer = AgentImporter.getInstance();
    const creator = AgentCreator.getInstance();

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.refresh', () => {
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.search', () => {
            // Search is handled by WebView overlay
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.filterByTag', () => {
            // Filter is handled by WebView overlay
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.clearFilter', () => {
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.create', async () => {
            const success = await creator.create();
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.import', async () => {
            const success = await importer.importFromDialog();
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.importFromUris', async (uris: vscode.Uri[]) => {
            const success = await importer.importFromUris(uris);
            if (success) {
                vscode.commands.executeCommand('ampify.mainView.refresh');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.apply', async (item: AgentItemLike) => {
            if (!item || item.itemType !== 'agentItem') {
                return;
            }

            const agent = item.data as LoadedAgent;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(I18n.get('agents.noWorkspace'));
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

            await applier.apply(agent, targetFolder.uri.fsPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.remove', async (item: AgentItemLike) => {
            if (!item || item.itemType !== 'agentItem') {
                return;
            }

            const agent = item.data as LoadedAgent;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(I18n.get('agents.noWorkspace'));
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

            await applier.remove(agent.meta.agent, targetFolder.uri.fsPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.delete', async (item: AgentItemLike) => {
            if (!item || item.itemType !== 'agentItem') {
                return;
            }

            const agent = item.data as LoadedAgent;
            configManager.deleteAgent(agent.meta.agent);
            vscode.window.showInformationMessage(I18n.get('agents.deleted', agent.meta.agent));
            vscode.commands.executeCommand('ampify.mainView.refresh');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.open', async (item: AgentItemLike) => {
            if (!item || item.itemType !== 'agentItem') {
                return;
            }

            const agent = item.data as LoadedAgent;
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(agent.path));
            await vscode.window.showTextDocument(doc, { preview: false });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.preview', async (item: AgentItemLike) => {
            if (!item || item.itemType !== 'agentItem') {
                return;
            }

            const agent = item.data as LoadedAgent;
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(agent.path));
            await vscode.window.showTextDocument(doc, { preview: true });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.agents.openFolder', async () => {
            const agentsDir = configManager.getAgentsDir();
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(agentsDir));
        })
    );

    console.log(I18n.get('agents.initialized'));
}
