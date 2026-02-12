import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { registerCopier } from './modules/copier';
import { registerLauncher } from './modules/launcher';
import { registerSkillManager } from './modules/skills';
import { registerCommandManager } from './modules/commands';
import { registerMainView } from './modules/mainView';
import { GitShareLifecycle, registerGitShare } from './modules/gitShare';
import { registerModelProxy } from './modules/modelProxy';
import { registerOpenCodeCopilotAuth } from './modules/opencode-copilot-auth';

/**
 * 当前实例的 Launcher key。
 * 通过 Launcher 启动的实例会在 user-data-dir 中写入 .ampify-instance-key 文件。
 * 主实例（非 Launcher 启动）值为空字符串。
 */
export let instanceKey: string = '';
let gitShareLifecycle: GitShareLifecycle | undefined;

/**
 * 检测当前 VS Code 实例的 Launcher key。
 * 从 process.argv 中获取 --user-data-dir，读取其中的 .ampify-instance-key 文件。
 */
function detectInstanceKey(): void {
    try {
        const args = process.argv;
        let userDataDir: string | undefined;

        for (const arg of args) {
            if (arg.startsWith('--user-data-dir=')) {
                userDataDir = arg.slice('--user-data-dir='.length);
                break;
            }
        }

        if (!userDataDir) {
            const idx = args.indexOf('--user-data-dir');
            if (idx >= 0 && idx + 1 < args.length) {
                userDataDir = args[idx + 1];
            }
        }

        if (userDataDir) {
            userDataDir = userDataDir.replace(/^"|"$/g, '');
            const keyFile = path.join(userDataDir, '.ampify-instance-key');
            if (fs.existsSync(keyFile)) {
                const key = fs.readFileSync(keyFile, 'utf8').trim();
                if (key) {
                    instanceKey = key;
                }
            }
        }
    } catch {
        // 读取失败保持空
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Activating Ampify Extension...');

    // 检测实例身份
    detectInstanceKey();
    console.log(`Ampify instance key: ${instanceKey}`);
    
    // Register Main View (unified webview, must be first)
    registerMainView(context);

    // Register the original "Copier" module
    registerCopier(context);

    // Register the new "Launcher" module
    registerLauncher(context);

    // Register Git Share module
    try {
        gitShareLifecycle = await registerGitShare(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register Git Share module:', message);
        vscode.window.showErrorMessage(`Git Share module failed to load: ${message}`);
    }

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

    // Register the "OpenCode Copilot Auth" module
    try {
        registerOpenCodeCopilotAuth(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register OpenCode Copilot Auth module:', message);
        vscode.window.showErrorMessage(`OpenCode Copilot Auth module failed to load: ${message}`);
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

export async function deactivate() {
    if (!gitShareLifecycle) {
        return;
    }
    try {
        await gitShareLifecycle.flushOnDeactivate();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Git Share shutdown flush failed:', message);
    }
}
