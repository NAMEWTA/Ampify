import * as vscode from 'vscode';
import { registerCopier } from './modules/copier';
import { registerLauncher } from './modules/launcher';
import { registerSkillManager } from './modules/skills';
import { registerCommandManager } from './modules/commands';
import { registerMainView } from './modules/mainView';
import { registerGitShare } from './modules/gitShare';
import { registerModelProxy } from './modules/modelProxy';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Activating Ampify Extension...');
    
    // Register Main View (unified webview, must be first)
    registerMainView(context);

    // Register the original "Copier" module
    registerCopier(context);

    // Register the new "Launcher" module
    registerLauncher(context);

    // Register Git Share module
    registerGitShare(context);

    // Register the "Skills" module
    try {
        await registerSkillManager(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register Skills module:', message);
        vscode.window.showErrorMessage(`Skills module failed to load: ${message}`);
    }

    // Register the "Commands" module
    try {
        await registerCommandManager(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register Commands module:', message);
        vscode.window.showErrorMessage(`Commands module failed to load: ${message}`);
    }

    // Register the "Model Proxy" module
    try {
        await registerModelProxy(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register Model Proxy module:', message);
        vscode.window.showErrorMessage(`Model Proxy module failed to load: ${message}`);
    }

    console.log('Ampify Extension Activated');
}

export function deactivate() {}
