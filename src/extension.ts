import * as vscode from 'vscode';
import { registerCopier } from './modules/copier';
import { registerLauncher } from './modules/launcher';
import { registerSkillManager } from './modules/skills';
import { registerCommandManager } from './modules/commands';
import { registerTabBar } from './modules/tabBar';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Activating Ampify Extension...');
    
    // Register Tab Bar (must be first to set default context)
    registerTabBar(context);

    // Register the original "Copier" module
    registerCopier(context);

    // Register the new "Launcher" module
    registerLauncher(context);

    // Register the "Skills Manager" module
    try {
        await registerSkillManager(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register Skills Manager:', message);
        vscode.window.showErrorMessage(`Skills Manager failed to load: ${message}`);
    }

    // Register the "Commands Manager" module
    try {
        await registerCommandManager(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register Commands Manager:', message);
        vscode.window.showErrorMessage(`Commands Manager failed to load: ${message}`);
    }

    console.log('Ampify Extension Activated');
}

export function deactivate() {}
