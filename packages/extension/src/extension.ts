import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { registerCopier } from './modules/copier';
import { registerLauncher } from './modules/launcher';
import { registerSkillManager } from './modules/skills';
import { registerCommandManager } from './modules/commands';
import { registerMainView } from './modules/mainView';
import { registerGitShare } from './modules/gitShare';
import { registerModelProxy } from './modules/modelProxy';
import { registerOpenCodeCopilotAuth } from './modules/opencode-copilot-auth';
import { setInstanceKey } from './common/instanceContext';

/**
 * 当前实例的 Launcher key。
 * 通过 Launcher 启动的实例会在 user-data-dir 中写入 .ampify-instance-key 文件。
 * 主实例（非 Launcher 启动）值为空字符串。
 */
export let instanceKey: string = '';

/**
 * 检测当前 VS Code 实例的 Launcher key。
 * 通过 context.globalStorageUri 提取 user-data-dir，
 * 再从 config.json 中反查匹配的实例名称。
 */
function detectInstanceKey(context: vscode.ExtensionContext): void {
    try {
        const globalStoragePath = context.globalStorageUri.fsPath;

        // globalStoragePath 形如：
        // <rootDir>/vscodemultilauncher/userdata/<dirName>/User/globalStorage/<publisher.ext>
        // 非 Launcher 实例则不含 vscodemultilauncher/userdata
        const launcherMarker = path.join('vscodemultilauncher', 'userdata');
        const markerIdx = globalStoragePath.indexOf(launcherMarker);
        if (markerIdx < 0) return; // 非 Launcher 启动的实例

        // 提取 dirName（userdata 之后的第一级目录名）
        const afterMarker = globalStoragePath.substring(
            markerIdx + launcherMarker.length + 1 // +1 跳过路径分隔符
        );
        const dirName = afterMarker.split(/[\\/]/)[0];
        if (!dirName) return;

        // 读取 config.json
        const rootDir = globalStoragePath.substring(0, markerIdx);
        const configPath = path.join(rootDir, 'vscodemultilauncher', 'config.json');
        if (!fs.existsSync(configPath)) return;

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
            instances: Record<string, { dirName: string }>;
        };

        // 反查 dirName 对应的实例 key
        for (const [key, inst] of Object.entries(config.instances)) {
            if (inst.dirName === dirName) {
                instanceKey = key;
                return;
            }
        }
    } catch {
        // 读取失败保持空
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Activating Ampify Extension...');

    // 检测实例身份（从 config.json 反查）
    detectInstanceKey(context);
    console.log(`Ampify instance key: ${instanceKey || '(main instance)'}`);
    setInstanceKey(instanceKey);
    
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

export function deactivate() {}
