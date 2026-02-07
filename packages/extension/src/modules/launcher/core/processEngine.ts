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

    public launch(instance: InstanceConfig, key: string) {
        const codePath = this.getCodeExecutablePath(); 
        
        const userDataDir = this.configManager.ensureInstanceDir(instance.dirName);
        const extensionsDir = this.configManager.getSharedExtensionsDir();

        // 写入实例身份文件，供被启动的 Ampify 扩展读取
        try {
            const keyFile = path.join(userDataDir, '.ampify-instance-key');
            fs.writeFileSync(keyFile, key, 'utf8');
        } catch (err) {
            console.error('Failed to write instance key file:', err);
        }
        
        const args = [
            '--user-data-dir',
            userDataDir,
            '--extensions-dir',
            extensionsDir,
            ...instance.vscodeArgs
        ];

        // 优先使用当前工作区目录，否则回退到 defaultProject 配置
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            // 使用当前工作区的第一个目录
            args.push(workspaceFolders[0].uri.fsPath);
        } else if (instance.defaultProject) {
            // 没有打开的工作区时，回退到配置的默认项目
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
                 const error = err as NodeJS.ErrnoException;
                 const msg = error.message || String(error);
                 console.error('Failed to spawn VS Code process:', error);
                 if (error.code === 'ENOENT') {
                     vscode.window.showErrorMessage(I18n.get('launcher.codeNotFound'));
                 } else {
                     const details = `${msg} (code=${error.code ?? ''})`;
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
            const error = err as NodeJS.ErrnoException;
            const msg = error instanceof Error ? error.message : String(error);
            const details = `${msg} (code=${error.code ?? ''})`;
            vscode.window.showErrorMessage(I18n.get('launcher.launchFail', details));
        }
    }
}
