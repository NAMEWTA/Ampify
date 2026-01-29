import * as vscode from 'vscode';
import { registerCopier } from './modules/copier';
import { registerLauncher } from './modules/launcher';

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Ampify Extension...');
    
    // Register the original "Copier" module
    registerCopier(context);

    // Register the new "Launcher" module
    registerLauncher(context);

    console.log('Ampify Extension Activated');
}

export function deactivate() {}
