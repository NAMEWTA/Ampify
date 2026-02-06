/**
 * MainView 模块入口
 * 注册统一 WebviewView 并连接各模块刷新事件
 */
import * as vscode from 'vscode';
import { AmpifyViewProvider } from './AmpifyViewProvider';

export function registerMainView(context: vscode.ExtensionContext): AmpifyViewProvider {
    const provider = new AmpifyViewProvider(context.extensionUri);

    // 注册 WebviewViewProvider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AmpifyViewProvider.viewType, provider)
    );

    // 注册全局刷新命令
    context.subscriptions.push(
        vscode.commands.registerCommand('ampify.mainView.refresh', async () => {
            await provider.refresh();
        })
    );

    console.log('Module "MainView" loaded');
    return provider;
}
