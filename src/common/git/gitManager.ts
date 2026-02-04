import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import { GitStatus, DiffFile, GitConfig } from '../types';
import { getGitShareDir, getGitShareConfigPath, ensureDir } from '../paths';

/**
 * Git 共享配置
 */
export interface GitShareConfig {
    gitConfig: GitConfig;
}

/**
 * 共享 Git 管理器
 * 统一管理 gitshare 目录的 Git 操作
 */
export class GitManager {
    private git: SimpleGit;
    private rootDir: string;
    private configPath: string;

    constructor() {
        this.rootDir = getGitShareDir();
        this.configPath = getGitShareConfigPath();
        ensureDir(this.rootDir);
        this.git = simpleGit(this.rootDir);
    }

    /**
     * 获取 Git 共享根目录
     */
    public getRootDir(): string {
        return this.rootDir;
    }

    /**
     * 确保初始化
     */
    public ensureInit(): void {
        ensureDir(this.rootDir);
        if (!fs.existsSync(this.configPath)) {
            const defaultConfig: GitShareConfig = {
                gitConfig: { remoteUrls: [] }
            };
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        }
    }

    /**
     * 获取配置
     */
    public getConfig(): GitShareConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return { gitConfig: { remoteUrls: [] } };
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(content) as GitShareConfig;
            
            // 兼容处理
            if (!config.gitConfig) {
                config.gitConfig = { remoteUrls: [] };
            }
            if (!config.gitConfig.remoteUrls || config.gitConfig.remoteUrls.length === 0) {
                if (config.gitConfig.remoteUrl) {
                    config.gitConfig.remoteUrls = [config.gitConfig.remoteUrl];
                } else {
                    config.gitConfig.remoteUrls = [];
                }
            }
            return config;
        } catch (error) {
            console.error('Failed to read git share config', error);
            return { gitConfig: { remoteUrls: [] } };
        }
    }

    /**
     * 保存配置
     */
    public saveConfig(config: GitShareConfig): void {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    /**
     * 更新 Git 配置
     */
    public updateGitConfig(gitConfig: Partial<GitConfig>): void {
        const config = this.getConfig();
        const merged: GitConfig = { ...config.gitConfig, ...gitConfig };
        if (gitConfig.remoteUrl) {
            merged.remoteUrls = [gitConfig.remoteUrl];
        }
        config.gitConfig = merged;
        this.saveConfig(config);
    }

    /**
     * 获取配置文件路径
     */
    public getConfigPath(): string {
        return this.configPath;
    }

    /**
     * 初始化 Git 仓库
     */
    public async init(): Promise<boolean> {
        try {
            const isRepo = await this.isGitRepository();
            if (!isRepo) {
                await this.git.init();
                // 创建 .gitignore
                const gitignorePath = path.join(this.rootDir, '.gitignore');
                if (!fs.existsSync(gitignorePath)) {
                    fs.writeFileSync(gitignorePath, '# Ampify Git Share\n.DS_Store\n*.log\nconfig.json\n', 'utf8');
                }
            }
            return true;
        } catch (error) {
            console.error('Git init failed:', error);
            return false;
        }
    }

    /**
     * 检查是否是 Git 仓库
     */
    public async isGitRepository(): Promise<boolean> {
        try {
            await this.git.status();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取 Git 状态
     */
    public async getStatus(): Promise<GitStatus> {
        const status: GitStatus = {
            initialized: false,
            hasRemote: false,
            hasUnstagedChanges: false,
            hasUncommittedChanges: false,
            unpushedCommitCount: 0,
            changedFiles: 0
        };

        try {
            const isRepo = await this.isGitRepository();
            if (!isRepo) {
                return status;
            }

            status.initialized = true;

            // 获取状态
            const gitStatus: StatusResult = await this.git.status();
            status.branch = gitStatus.current || undefined;
            status.hasUnstagedChanges =
                gitStatus.modified.length > 0 ||
                gitStatus.not_added.length > 0 ||
                gitStatus.deleted.length > 0 ||
                gitStatus.created.length > 0 ||
                gitStatus.renamed.length > 0;
            status.hasUncommittedChanges =
                gitStatus.staged.length > 0 ||
                status.hasUnstagedChanges;
            status.changedFiles = gitStatus.files.length;

            // 检查远程
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            if (origin) {
                status.hasRemote = true;
                status.remoteUrl = origin.refs.fetch || origin.refs.push;
            } else {
                const synced = await this.syncRemotesFromConfig();
                if (synced) {
                    const refreshedRemotes = await this.git.getRemotes(true);
                    const refreshedOrigin = refreshedRemotes.find(r => r.name === 'origin');
                    if (refreshedOrigin) {
                        status.hasRemote = true;
                        status.remoteUrl = refreshedOrigin.refs.fetch || refreshedOrigin.refs.push;
                    }
                }
            }

            // 检查未推送的提交
            if (status.hasRemote && status.branch) {
                try {
                    const log = await this.git.log([`origin/${status.branch}..HEAD`]);
                    status.unpushedCommitCount = log.total;
                } catch {
                    // 可能远程分支不存在
                    status.unpushedCommitCount = 0;
                }
            }

            return status;
        } catch (error) {
            console.error('Failed to get git status:', error);
            return status;
        }
    }

    /**
     * 配置 Git 用户信息
     */
    public async configureUser(userName: string, userEmail: string): Promise<void> {
        await this.git.addConfig('user.name', userName, false, 'local');
        await this.git.addConfig('user.email', userEmail, false, 'local');
    }

    /**
     * 设置远程仓库
     */
    public async setRemote(url: string): Promise<boolean> {
        return this.setRemotes([url]);
    }

    /**
     * 设置多个远程仓库
     */
    public async setRemotes(urls: string[]): Promise<boolean> {
        try {
            const remotes = await this.git.getRemotes();
            const remoteNames = urls.map((_, index) => (index === 0 ? 'origin' : `origin-${index + 1}`));

            for (const name of remoteNames) {
                if (remotes.some(r => r.name === name)) {
                    await this.git.removeRemote(name);
                }
            }

            for (let i = 0; i < urls.length; i++) {
                const name = i === 0 ? 'origin' : `origin-${i + 1}`;
                await this.git.addRemote(name, urls[i]);
            }

            return true;
        } catch (error) {
            console.error('Failed to set remotes:', error);
            return false;
        }
    }

    /**
     * 从配置同步远程仓库
     */
    public async syncRemotesFromConfig(): Promise<boolean> {
        const urls = this.getConfiguredRemoteUrls();
        if (urls.length === 0) return false;
        return this.setRemotes(urls);
    }

    /**
     * 获取远程仓库 URL
     */
    public async getRemoteUrl(): Promise<string | undefined> {
        try {
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            return origin?.refs.fetch || origin?.refs.push;
        } catch {
            return undefined;
        }
    }

    /**
     * 暂存所有更改
     */
    public async stageAll(): Promise<void> {
        await this.git.add(['-A']);
    }

    /**
     * 提交更改
     */
    public async commit(message: string): Promise<boolean> {
        try {
            const status = await this.git.status();
            if (status.files.length === 0) {
                return true;
            }
            const user = this.getConfiguredUser();
            if (user) {
                await this.configureUser(user.userName, user.userEmail);
            }
            await this.stageAll();
            await this.git.commit(message);
            return true;
        } catch (error) {
            console.error('Commit failed:', error);
            return false;
        }
    }

    /**
     * 拉取远程更新
     */
    public async pull(): Promise<{ success: boolean; error?: string; authError?: boolean; conflict?: boolean; noRemote?: boolean }> {
        try {
            await this.init();
            const status = await this.getStatus();
            if (!status.hasRemote) {
                const synced = await this.syncRemotesFromConfig();
                if (!synced) {
                    return { success: true, noRemote: true };
                }
            }

            const refreshed = await this.getStatus();
            if (!refreshed.hasRemote) {
                return { success: true, noRemote: true };
            }
            const remoteBranch = await this.resolveRemoteBranch(refreshed.branch);
            if (!remoteBranch) {
                return { success: true, noRemote: true };
            }
            await this.git.pull('origin', remoteBranch);

            const afterStatus = await this.git.status();
            if (afterStatus.conflicted && afterStatus.conflicted.length > 0) {
                return { success: false, conflict: true, error: 'Merge conflicts detected' };
            }

            return { success: true };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isAuthError = errorMsg.includes('Authentication') || 
                               errorMsg.includes('Permission denied') ||
                               errorMsg.includes('could not read Username');
            const isConflict = errorMsg.includes('CONFLICT') ||
                               errorMsg.includes('Merge conflict') ||
                               errorMsg.includes('Automatic merge failed');
            return { 
                success: false, 
                error: errorMsg,
                authError: isAuthError,
                conflict: isConflict
            };
        }
    }

    /**
     * 推送到远程
     */
    public async push(options?: { skipPull?: boolean }): Promise<{ success: boolean; error?: string; authError?: boolean; conflict?: boolean; noRemote?: boolean }> {
        try {
            await this.init();
            const status = await this.getStatus();
            if (!status.hasRemote) {
                const synced = await this.syncRemotesFromConfig();
                if (!synced) {
                    return { success: true, noRemote: true };
                }
            }

            if (!options?.skipPull) {
                const pullResult = await this.pull();
                if (!pullResult.success) {
                    return {
                        success: false,
                        error: pullResult.error,
                        authError: pullResult.authError,
                        conflict: pullResult.conflict
                    };
                }
            }

            const refreshed = await this.getStatus();
            if (!refreshed.hasRemote) {
                return { success: true, noRemote: true };
            }

            // pull 后再提交
            if (refreshed.hasUncommittedChanges) {
                const committed = await this.commit('Auto-commit before push');
                if (!committed) {
                    return { success: false, error: 'Commit failed' };
                }
            }

            const branch = await this.resolveRemoteBranch(refreshed.branch) || refreshed.branch || 'main';
            const remotes = await this.getRemotesForPush();
            if (remotes.length === 0) {
                return { success: true, noRemote: true };
            }

            for (const remote of remotes) {
                if (remote === 'origin') {
                    await this.git.push(remote, branch, ['--set-upstream']);
                } else {
                    await this.git.push(remote, branch);
                }
            }
            return { success: true };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isAuthError = errorMsg.includes('Authentication') || 
                               errorMsg.includes('Permission denied') ||
                               errorMsg.includes('could not read Username');
            const isConflict = errorMsg.includes('CONFLICT') ||
                               errorMsg.includes('Merge conflict') ||
                               errorMsg.includes('Automatic merge failed');
            return { 
                success: false, 
                error: errorMsg,
                authError: isAuthError,
                conflict: isConflict
            };
        }
    }

    /**
     * 统一同步：init -> pull -> commit -> push
     */
    public async sync(): Promise<{ success: boolean; error?: string; authError?: boolean; conflict?: boolean; localOnly?: boolean }> {
        try {
            await this.init();

            let status = await this.getStatus();
            if (!status.hasRemote) {
                const synced = await this.syncRemotesFromConfig();
                if (synced) {
                    status = await this.getStatus();
                }
            }

            const hasRemote = status.hasRemote;

            if (hasRemote) {
                const pullResult = await this.pull();
                if (!pullResult.success) {
                    return {
                        success: false,
                        error: pullResult.error,
                        authError: pullResult.authError,
                        conflict: pullResult.conflict
                    };
                }
            }

            const refreshed = await this.getStatus();
            if (refreshed.hasUncommittedChanges) {
                const committed = await this.commit('Auto-sync commit');
                if (!committed) {
                    return { success: false, error: 'Commit failed' };
                }
            }

            if (hasRemote) {
                const pushResult = await this.push({ skipPull: true });
                if (!pushResult.success) {
                    return {
                        success: false,
                        error: pushResult.error,
                        authError: pushResult.authError,
                        conflict: pushResult.conflict
                    };
                }
                return { success: true };
            }

            return { success: true, localOnly: true };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return { success: false, error: errorMsg };
        }
    }

    private getConfiguredRemoteUrls(): string[] {
        const config = this.getConfig();
        const gitConfig = config.gitConfig || {};
        const urls = (gitConfig.remoteUrls && gitConfig.remoteUrls.length > 0)
            ? gitConfig.remoteUrls
            : (gitConfig.remoteUrl ? [gitConfig.remoteUrl] : []);

        return urls.filter(url => !!url);
    }

    private async getRemotesForPush(): Promise<string[]> {
        const remotes = await this.git.getRemotes();
        let remoteNames = remotes.map(r => r.name);

        if (remoteNames.length === 0) {
            const synced = await this.syncRemotesFromConfig();
            if (!synced) return [];
            const refreshed = await this.git.getRemotes();
            remoteNames = refreshed.map(r => r.name);
        }

        const originIndex = remoteNames.indexOf('origin');
        if (originIndex > 0) {
            remoteNames.splice(originIndex, 1);
            remoteNames.unshift('origin');
        }

        return remoteNames;
    }

    private getConfiguredUser(): { userName: string; userEmail: string } | null {
        const config = this.getConfig();
        const gitConfig = config.gitConfig || {};
        if (gitConfig.userName && gitConfig.userEmail) {
            return { userName: gitConfig.userName, userEmail: gitConfig.userEmail };
        }
        return null;
    }

    /**
     * 获取本地变更文件列表
     */
    public async getLocalChanges(): Promise<DiffFile[]> {
        try {
            const status = await this.git.status();
            const files: DiffFile[] = [];

            for (const file of status.created) {
                files.push({ path: file, status: 'added' });
            }
            for (const file of status.modified) {
                files.push({ path: file, status: 'modified' });
            }
            for (const file of status.deleted) {
                files.push({ path: file, status: 'deleted' });
            }
            for (const file of status.renamed) {
                files.push({ path: file.to, status: 'renamed' });
            }
            for (const file of status.not_added) {
                files.push({ path: file, status: 'added' });
            }

            return files;
        } catch (error) {
            console.error('Failed to get local changes:', error);
            return [];
        }
    }

    /**
     * 获取与远程的差异
     */
    public async getRemoteDiff(): Promise<DiffFile[]> {
        try {
            const status = await this.getStatus();
            if (!status.hasRemote) {
                return [];
            }

            // 先 fetch
            await this.git.fetch('origin');

            const remoteBranch = await this.resolveRemoteBranch(status.branch);
            if (!remoteBranch) {
                return [];
            }

            // 获取差异文件
            const diff = await this.git.diff([
                '--name-status',
                `HEAD..origin/${remoteBranch}`
            ]);

            const files: DiffFile[] = [];
            const lines = diff.split('\n').filter(line => line.trim());

            for (const line of lines) {
                const [statusCode, ...pathParts] = line.split('\t');
                const filePath = pathParts.join('\t');

                let fileStatus: DiffFile['status'] = 'modified';
                if (statusCode.startsWith('A')) fileStatus = 'added';
                else if (statusCode.startsWith('D')) fileStatus = 'deleted';
                else if (statusCode.startsWith('R')) fileStatus = 'renamed';

                files.push({ path: filePath, status: fileStatus });
            }

            return files;
        } catch (error) {
            console.error('Failed to get remote diff:', error);
            return [];
        }
    }

    /**
     * 获取文件的完整路径
     */
    public getFilePath(relativePath: string): string {
        return path.join(this.rootDir, relativePath);
    }

    /**
     * 获取文件在某个提交的内容
     */
    public async getFileContent(filePath: string, ref: string = 'HEAD'): Promise<string | null> {
        try {
            const content = await this.git.show([`${ref}:${filePath}`]);
            return content;
        } catch {
            return null;
        }
    }

    /**
     * 获取远程分支文件内容
     */
    public async getRemoteFileContent(filePath: string): Promise<string | null> {
        try {
            const status = await this.getStatus();
            if (!status.hasRemote) return null;
            
            await this.git.fetch('origin');
            const remoteBranch = await this.resolveRemoteBranch(status.branch);
            if (!remoteBranch) return null;
            const content = await this.git.show([`origin/${remoteBranch}:${filePath}`]);
            return content;
        } catch {
            return null;
        }
    }

    /**
     * 解析远程分支名称（优先当前分支，其次 main/master）
     */
    private async resolveRemoteBranch(preferred?: string): Promise<string | undefined> {
        try {
            const branches = await this.git.branch(['-r']);
            const all = branches.all
                .filter(b => b.startsWith('origin/'))
                .filter(b => !b.includes('->'))
                .map(b => b.replace('origin/', ''));

            if (preferred && all.includes(preferred)) {
                return preferred;
            }
            if (all.includes('main')) {
                return 'main';
            }
            if (all.includes('master')) {
                return 'master';
            }
            return all[0];
        } catch {
            return preferred || 'main';
        }
    }

    /**
     * 获取指定模块目录下的变更文件
     */
    public async getModuleChanges(moduleName: string): Promise<DiffFile[]> {
        const allChanges = await this.getLocalChanges();
        return allChanges.filter(change => change.path.startsWith(`${moduleName}/`));
    }
}
