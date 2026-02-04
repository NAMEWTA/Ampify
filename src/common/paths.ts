import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const APP_ROOT_NAME = '.vscode-ampify';
export const GIT_SHARE_DIR_NAME = 'gitshare';

export function getAppRootDir(): string {
    return path.join(os.homedir(), APP_ROOT_NAME);
}

export function getModuleDir(moduleName: string): string {
    return path.join(getAppRootDir(), moduleName);
}

/**
 * 获取 Git 共享根目录
 * ~/.vscode-ampify/gitshare/
 */
export function getGitShareDir(): string {
    return path.join(getAppRootDir(), GIT_SHARE_DIR_NAME);
}

/**
 * 获取模块的 Git 共享目录
 * ~/.vscode-ampify/gitshare/{moduleName}/
 */
export function getGitShareModuleDir(moduleName: string): string {
    return path.join(getGitShareDir(), moduleName);
}

/**
 * 获取 Git 共享配置文件路径
 * ~/.vscode-ampify/gitshare/config.json
 */
export function getGitShareConfigPath(): string {
    return path.join(getGitShareDir(), 'config.json');
}

export function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export function copyDir(src: string, dest: string): void {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
