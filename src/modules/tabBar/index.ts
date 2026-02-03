import * as vscode from 'vscode';
import { TabBarViewProvider, TabId } from './TabBarViewProvider';

const DEFAULT_TAB: TabId = 'launcher';

export function registerTabBar(context: vscode.ExtensionContext): TabBarViewProvider {
    const provider = new TabBarViewProvider(context.extensionUri);

    // 注册 WebviewViewProvider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TabBarViewProvider.viewType, provider)
    );

    // 设置默认 Tab
    vscode.commands.executeCommand('setContext', 'ampify.activeTab', DEFAULT_TAB);

    // 注册切换 Tab 命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.switchTab', (tab: TabId) => {
            if (['launcher', 'skills', 'commands'].includes(tab)) {
                provider.setActiveTab(tab);
                vscode.commands.executeCommand('setContext', 'ampify.activeTab', tab);
            }
        })
    );

    console.log('Module "TabBar" loaded');
    return provider;
}

export { TabBarViewProvider, TabId };
