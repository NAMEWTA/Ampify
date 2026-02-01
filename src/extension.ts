import * as vscode from 'vscode';
import { registerCopier } from './modules/copier';
import { registerLauncher } from './modules/launcher';
import { registerSkillManager } from './modules/skills';

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Ampify Extension...');
    
    // Register the original "Copier" module
    registerCopier(context);

    // Register the new "Launcher" module
    registerLauncher(context);

    // Register the "Skills Manager" module
    try {
        registerSkillManager(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register Skills Manager:', message);
        vscode.window.showErrorMessage(`Skills Manager failed to load: ${message}`);
    }

    console.log('Ampify Extension Activated');
}

export function deactivate() {}
