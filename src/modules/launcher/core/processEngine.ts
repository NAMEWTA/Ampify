import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import type { ChildProcess } from 'child_process';
import { InstanceConfig } from '../../../common/types';
import { ConfigManager } from './configManager';
import { I18n } from '../../../common/i18n';

export class ProcessEngine {
    constructor(private configManager: ConfigManager) {}

    private getCodeExecutablePath(): string {
        // 使用 vscode.env.appRoot 获取 VS Code 安装目录
        const appRoot = vscode.env.appRoot;
        
        if (process.platform === 'win32') {
            // Windows: 尝试多个可能的路径
            const candidates = [
                path.join(appRoot, 'bin', 'code.cmd'),
                path.join(appRoot, '..', 'bin', 'code.cmd'),
                path.join(path.dirname(appRoot), 'bin', 'code.cmd'),
            ];
            
            for (const candidate of candidates) {
                if (fs.existsSync(candidate)) {
                    console.log(`Found VS Code CLI at: ${candidate}`);
                    return candidate;
                }
            }
            
            // 如果找不到 code.cmd，尝试使用 Code.exe 直接启动
            const exeCandidates = [
                path.join(appRoot, '..', 'Code.exe'),
                path.join(path.dirname(appRoot), 'Code.exe'),
                process.execPath,
            ];
            
            for (const candidate of exeCandidates) {
                if (fs.existsSync(candidate)) {
                    console.log(`Found VS Code executable at: ${candidate}`);
                    return candidate;
                }
            }
        } else {
            // macOS/Linux
            const candidates = [
                path.join(appRoot, 'bin', 'code'),
                path.join(appRoot, '..', 'bin', 'code'),
                path.join(path.dirname(appRoot), 'bin', 'code'),
            ];
            
            for (const candidate of candidates) {
                if (fs.existsSync(candidate)) {
                    console.log(`Found VS Code CLI at: ${candidate}`);
                    return candidate;
                }
            }
        }
        
        // 最终回退到 process.execPath
        console.log(`Falling back to process.execPath: ${process.execPath}`);
        return process.execPath;
    }

    public launch(instance: InstanceConfig) {
        const codePath = this.getCodeExecutablePath(); 
        
        const userDataDir = this.configManager.ensureInstanceDir(instance.dirName);
        const extensionsDir = this.configManager.getSharedExtensionsDir();
        
        const args = [
            '--user-data-dir',
            userDataDir,
            '--extensions-dir',
            extensionsDir,
            ...instance.vscodeArgs
        ];

        if (instance.defaultProject) {
            let projectPath = instance.defaultProject;
             if (projectPath.startsWith('~')) {
                projectPath = projectPath.replace(/^~/, os.homedir());
            }
            args.push(projectPath);
        }

        console.log(`Launching: ${codePath} ${args.join(' ')}`);
        
        const env = { ...process.env };
        delete env['ELECTRON_RUN_AS_NODE'];
        
        try {
            const isCmd = process.platform === 'win32' && (codePath.toLowerCase().endsWith('.cmd') || codePath.toLowerCase().endsWith('.bat'));
            const isExe = process.platform === 'win32' && codePath.toLowerCase().endsWith('.exe');
            let child: ChildProcess;
            const stderrChunks: Buffer[] = [];
            const stdoutChunks: Buffer[] = [];
            try {
                if (isCmd) {
                    // 对于 .cmd 文件，使用 shell: true 更可靠
                    child = cp.spawn(codePath, args, {
                        detached: true,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        env,
                        shell: true,
                        windowsHide: true
                    });
                } else if (isExe) {
                    // 对于 .exe 文件，直接启动
                    child = cp.spawn(codePath, args, {
                        detached: true,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        env
                    });
                } else {
                    // 其他情况（macOS/Linux）
                    child = cp.spawn(codePath, args, {
                        detached: true,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        env
                    });
                }
            } catch (err) {
                // 如果 spawn 失败，尝试使用不同的方式
                console.error('Initial spawn failed, trying fallback:', err);
                child = cp.spawn(codePath, args, {
                    detached: true,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env,
                    shell: true,
                    windowsHide: true
                });
            }

            child.stdout?.on('data', (chunk) => {
                if (stdoutChunks.reduce((n, b) => n + b.length, 0) < 64_000) {
                    stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
                }
            });
            child.stderr?.on('data', (chunk) => {
                if (stderrChunks.reduce((n, b) => n + b.length, 0) < 64_000) {
                    stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
                }
            });
            
            child.on('error', (err) => {
                const msg = err.message || String(err);
                console.error('Failed to spawn VS Code process:', err);
                if ((err as any).code === 'ENOENT') {
                     vscode.window.showErrorMessage(I18n.get('launcher.codeNotFound'));
                } else {
                     const details = `${msg} (code=${(err as any).code ?? ''})`;
                     vscode.window.showErrorMessage(I18n.get('launcher.spawnError', details));
                }
            });

            child.on('exit', (code, signal) => {
                if (code === 0) {
                    return;
                }
                const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim();
                const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
                const details = [
                    `exitCode=${code ?? ''}`,
                    signal ? `signal=${signal}` : '',
                    stderr ? `stderr=${stderr}` : '',
                    stdout ? `stdout=${stdout}` : ''
                ].filter(Boolean).join(' | ');
                vscode.window.showErrorMessage(I18n.get('launcher.launchFail', details));
            });

            child.unref();
            vscode.window.setStatusBarMessage(I18n.get('launcher.launchSuccess', instance.description), 5000);
        } catch (err) {
            const anyErr = err as any;
            const msg = err instanceof Error ? err.message : String(err);
            const details = `${msg} (code=${anyErr?.code ?? ''})`;
            vscode.window.showErrorMessage(I18n.get('launcher.launchFail', details));
        }
    }
}
