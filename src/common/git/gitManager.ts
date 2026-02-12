import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import { GitStatus, DiffFile, GitConfig } from '../types';
import { getGitShareDir, getGitShareConfigPath, ensureDir } from '../paths';

/**
 * Git share config
 */
export interface GitShareConfig {
    gitConfig: GitConfig;
}

export type GitOperationPhase = 'pull' | 'push' | 'startup' | 'shutdown';

export interface GitOperationResult {
    success: boolean;
    error?: string;
    authError?: boolean;
    conflict?: boolean;
    noRemote?: boolean;
    localOnly?: boolean;
    networkError?: boolean;
    recovered?: boolean;
    phase?: GitOperationPhase;
}

export interface ForceReceiveOptions {
    conflictsOnly?: boolean;
    phase?: GitOperationPhase;
}

/**
 * Shared git manager for gitshare directory.
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

    public getRootDir(): string {
        return this.rootDir;
    }

    public ensureInit(): void {
        ensureDir(this.rootDir);
        if (!fs.existsSync(this.configPath)) {
            const defaultConfig: GitShareConfig = {
                gitConfig: { remoteUrls: [] }
            };
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        }
    }

    public getConfig(): GitShareConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return { gitConfig: { remoteUrls: [] } };
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(content) as GitShareConfig;

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

    public saveConfig(config: GitShareConfig): void {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    public updateGitConfig(gitConfig: Partial<GitConfig>): void {
        const config = this.getConfig();
        const merged: GitConfig = { ...config.gitConfig, ...gitConfig };
        if (gitConfig.remoteUrl) {
            merged.remoteUrls = [gitConfig.remoteUrl];
        }
        config.gitConfig = merged;
        this.saveConfig(config);
    }

    public getConfigPath(): string {
        return this.configPath;
    }

    public async init(): Promise<boolean> {
        try {
            const isRepo = await this.isGitRepository();
            if (!isRepo) {
                await this.git.init();
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

    public async isGitRepository(): Promise<boolean> {
        try {
            await this.git.status();
            return true;
        } catch {
            return false;
        }
    }

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

            if (status.hasRemote && status.branch) {
                try {
                    const log = await this.git.log([`origin/${status.branch}..HEAD`]);
                    status.unpushedCommitCount = log.total;
                } catch {
                    status.unpushedCommitCount = 0;
                }
            }

            return status;
        } catch (error) {
            console.error('Failed to get git status:', error);
            return status;
        }
    }

    public async configureUser(userName: string, userEmail: string): Promise<void> {
        await this.git.addConfig('user.name', userName, false, 'local');
        await this.git.addConfig('user.email', userEmail, false, 'local');
    }

    public async setRemote(url: string): Promise<boolean> {
        return this.setRemotes([url]);
    }

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

    public async syncRemotesFromConfig(): Promise<boolean> {
        const urls = this.getConfiguredRemoteUrls();
        if (urls.length === 0) return false;
        return this.setRemotes(urls);
    }

    public async getRemoteUrl(): Promise<string | undefined> {
        try {
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            return origin?.refs.fetch || origin?.refs.push;
        } catch {
            return undefined;
        }
    }

    public async stageAll(): Promise<void> {
        await this.git.add(['-A']);
    }

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

    public async pull(): Promise<GitOperationResult> {
        const phase: GitOperationPhase = 'pull';
        try {
            await this.init();
            let status = await this.getStatus();
            if (!status.hasRemote) {
                const synced = await this.syncRemotesFromConfig();
                if (!synced) {
                    return { success: true, noRemote: true, phase };
                }
                status = await this.getStatus();
            }

            if (!status.hasRemote) {
                return { success: true, noRemote: true, phase };
            }

            const remoteBranch = await this.resolveRemoteBranch(status.branch);
            if (!remoteBranch) {
                return { success: true, noRemote: true, phase };
            }

            await this.git.pull('origin', remoteBranch);

            const afterStatus = await this.git.status();
            if (afterStatus.conflicted && afterStatus.conflicted.length > 0) {
                return { success: false, conflict: true, error: 'Merge conflicts detected', phase };
            }

            return { success: true, phase };
        } catch (error: unknown) {
            const errorMsg = this.getErrorMessage(error);
            return {
                success: false,
                error: errorMsg,
                authError: this.isAuthError(errorMsg),
                conflict: this.isConflictError(errorMsg),
                networkError: this.isNetworkError(errorMsg),
                phase
            };
        }
    }

    public async push(options?: { skipPull?: boolean }): Promise<GitOperationResult> {
        const phase: GitOperationPhase = 'push';
        try {
            await this.init();
            const status = await this.getStatus();
            if (!status.hasRemote) {
                const synced = await this.syncRemotesFromConfig();
                if (!synced) {
                    return { success: true, noRemote: true, phase };
                }
            }

            if (!options?.skipPull) {
                const pullResult = await this.pull();
                if (!pullResult.success) {
                    return { ...pullResult, phase };
                }
            }

            const refreshed = await this.getStatus();
            if (!refreshed.hasRemote) {
                return { success: true, noRemote: true, phase };
            }

            if (refreshed.hasUncommittedChanges) {
                const committed = await this.commit('Auto-commit before push');
                if (!committed) {
                    return { success: false, error: 'Commit failed', phase };
                }
            }

            const branch = await this.resolveRemoteBranch(refreshed.branch) || refreshed.branch || 'main';
            const pushResult = await this.pushBranchToAllRemotes(branch);
            return { ...pushResult, phase };
        } catch (error: unknown) {
            const errorMsg = this.getErrorMessage(error);
            return {
                success: false,
                error: errorMsg,
                authError: this.isAuthError(errorMsg),
                conflict: this.isConflictError(errorMsg),
                networkError: this.isNetworkError(errorMsg),
                phase
            };
        }
    }

    public async sync(): Promise<GitOperationResult> {
        return this.forcePushWithRecovery('sync');
    }

    public async forceReceiveRemote(options?: ForceReceiveOptions): Promise<GitOperationResult> {
        const phase = options?.phase || 'pull';
        const conflictsOnly = options?.conflictsOnly ?? true;

        try {
            await this.init();

            let status = await this.getStatus();
            if (!status.hasRemote) {
                const synced = await this.syncRemotesFromConfig();
                if (!synced) {
                    return { success: true, noRemote: true, phase };
                }
                status = await this.getStatus();
            }

            if (!status.hasRemote) {
                return { success: true, noRemote: true, phase };
            }

            const remoteBranch = await this.resolveRemoteBranch(status.branch);
            if (!remoteBranch) {
                return { success: true, noRemote: true, phase };
            }

            try {
                await this.git.pull('origin', remoteBranch);
            } catch (error: unknown) {
                const errorMsg = this.getErrorMessage(error);
                if (this.isConflictError(errorMsg)) {
                    const resolved = await this.resolveConflictsByTheirs({
                        conflictsOnly,
                        commitMessage: 'Auto-resolve: accept remote changes'
                    });
                    if (resolved) {
                        return { success: true, recovered: true, phase };
                    }
                    return { success: false, conflict: true, error: 'Merge conflict', phase };
                }

                return {
                    success: false,
                    error: errorMsg,
                    authError: this.isAuthError(errorMsg),
                    conflict: this.isConflictError(errorMsg),
                    networkError: this.isNetworkError(errorMsg),
                    phase
                };
            }

            const afterStatus = await this.git.status();
            if (afterStatus.conflicted && afterStatus.conflicted.length > 0) {
                const resolved = await this.resolveConflictsByTheirs({
                    conflictsOnly,
                    commitMessage: 'Auto-resolve: accept remote changes'
                });
                if (!resolved) {
                    return { success: false, conflict: true, error: 'Merge conflict', phase };
                }
                return { success: true, recovered: true, phase };
            }

            return { success: true, phase };
        } catch (error: unknown) {
            const errorMsg = this.getErrorMessage(error);
            return {
                success: false,
                error: errorMsg,
                authError: this.isAuthError(errorMsg),
                conflict: this.isConflictError(errorMsg),
                networkError: this.isNetworkError(errorMsg),
                phase
            };
        }
    }

    public async forcePushWithRecovery(context: 'sync' | 'shutdown'): Promise<GitOperationResult> {
        const phase: GitOperationPhase = context === 'shutdown' ? 'shutdown' : 'push';
        const commitMessage = context === 'shutdown' ? 'Auto-shutdown commit' : 'Auto-sync commit';

        try {
            await this.init();

            let status = await this.getStatus();
            if (!status.hasRemote) {
                const synced = await this.syncRemotesFromConfig();
                if (synced) {
                    status = await this.getStatus();
                }
            }

            if (!status.hasRemote) {
                const localCommitResult = await this.commitIfNeeded(commitMessage, phase);
                if (!localCommitResult.success) {
                    return localCommitResult;
                }
                return { success: true, localOnly: true, noRemote: true, phase };
            }

            const branch = await this.resolveRemoteBranch(status.branch) || status.branch || 'main';

            const firstCommitResult = await this.commitIfNeeded(commitMessage, phase);
            if (!firstCommitResult.success) {
                return firstCommitResult;
            }

            const firstPushResult = await this.pushBranchToAllRemotes(branch, phase);
            if (firstPushResult.success) {
                return firstPushResult;
            }

            if (firstPushResult.networkError) {
                return firstPushResult;
            }

            const receiveResult = await this.forceReceiveRemote({ conflictsOnly: true, phase: 'pull' });
            if (!receiveResult.success) {
                return receiveResult;
            }

            const secondCommitResult = await this.commitIfNeeded(commitMessage, phase);
            if (!secondCommitResult.success) {
                return secondCommitResult;
            }

            const refreshedStatus = await this.getStatus();
            const refreshedBranch = await this.resolveRemoteBranch(refreshedStatus.branch) || refreshedStatus.branch || branch;
            const secondPushResult = await this.pushBranchToAllRemotes(refreshedBranch, phase);
            if (secondPushResult.success) {
                return { ...secondPushResult, recovered: true, phase };
            }
            return secondPushResult;
        } catch (error: unknown) {
            const errorMsg = this.getErrorMessage(error);
            return {
                success: false,
                error: errorMsg,
                authError: this.isAuthError(errorMsg),
                conflict: this.isConflictError(errorMsg),
                networkError: this.isNetworkError(errorMsg),
                phase
            };
        }
    }

    public isNetworkError(errorMsg: string): boolean {
        const lower = errorMsg.toLowerCase();
        return lower.includes('enotfound') ||
            lower.includes('econnrefused') ||
            lower.includes('econnreset') ||
            lower.includes('etimedout') ||
            lower.includes('network is unreachable') ||
            lower.includes('could not resolve host') ||
            lower.includes('failed to connect') ||
            lower.includes('failed to connect to') ||
            lower.includes('connection timed out') ||
            lower.includes('timed out');
    }

    private async resolveConflictsByTheirs(options?: { conflictsOnly?: boolean; commitMessage?: string }): Promise<boolean> {
        try {
            const status = await this.git.status();
            const conflicted = status.conflicted || [];
            if (conflicted.length === 0) {
                return true;
            }

            if (options?.conflictsOnly) {
                await this.git.raw(['checkout', '--theirs', '--', ...conflicted]);
                await this.git.raw(['add', '-A', '--', ...conflicted]);
            } else {
                await this.git.raw(['checkout', '--theirs', '.']);
                await this.stageAll();
            }

            const afterStatus = await this.git.status();
            if (afterStatus.conflicted && afterStatus.conflicted.length > 0) {
                return false;
            }

            await this.git.commit(options?.commitMessage || 'Auto-resolve: accept remote changes');
            return true;
        } catch (error) {
            console.error('Auto-resolve conflicts failed:', error);
            return false;
        }
    }

    private async commitIfNeeded(message: string, phase: GitOperationPhase): Promise<GitOperationResult> {
        try {
            const status = await this.git.status();
            if (status.files.length === 0) {
                return { success: true, phase };
            }
            const committed = await this.commit(message);
            if (!committed) {
                return { success: false, error: 'Commit failed', phase };
            }
            return { success: true, phase };
        } catch (error: unknown) {
            const errorMsg = this.getErrorMessage(error);
            return {
                success: false,
                error: errorMsg,
                authError: this.isAuthError(errorMsg),
                conflict: this.isConflictError(errorMsg),
                networkError: this.isNetworkError(errorMsg),
                phase
            };
        }
    }

    private async pushBranchToAllRemotes(branch: string, phase: GitOperationPhase = 'push'): Promise<GitOperationResult> {
        try {
            const remotes = await this.getRemotesForPush();
            if (remotes.length === 0) {
                return { success: true, noRemote: true, phase };
            }

            for (const remote of remotes) {
                if (remote === 'origin') {
                    await this.git.push(remote, branch, ['--set-upstream']);
                } else {
                    await this.git.push(remote, branch);
                }
            }

            return { success: true, phase };
        } catch (error: unknown) {
            const errorMsg = this.getErrorMessage(error);
            return {
                success: false,
                error: errorMsg,
                authError: this.isAuthError(errorMsg),
                conflict: this.isConflictError(errorMsg),
                networkError: this.isNetworkError(errorMsg),
                phase
            };
        }
    }

    private isAuthError(errorMsg: string): boolean {
        return errorMsg.includes('Authentication') ||
            errorMsg.includes('Permission denied') ||
            errorMsg.includes('could not read Username');
    }

    private isConflictError(errorMsg: string): boolean {
        return errorMsg.includes('CONFLICT') ||
            errorMsg.includes('Merge conflict') ||
            errorMsg.includes('Automatic merge failed') ||
            errorMsg.includes('non-fast-forward') ||
            errorMsg.includes('fetch first') ||
            errorMsg.includes('could not apply');
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
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

    public async getRemoteDiff(): Promise<DiffFile[]> {
        try {
            const status = await this.getStatus();
            if (!status.hasRemote) {
                return [];
            }

            await this.git.fetch('origin');

            const remoteBranch = await this.resolveRemoteBranch(status.branch);
            if (!remoteBranch) {
                return [];
            }

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

    public getFilePath(relativePath: string): string {
        return path.join(this.rootDir, relativePath);
    }

    public async getFileContent(filePath: string, ref: string = 'HEAD'): Promise<string | null> {
        try {
            const content = await this.git.show([`${ref}:${filePath}`]);
            return content;
        } catch {
            return null;
        }
    }

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

    public async getModuleChanges(moduleName: string): Promise<DiffFile[]> {
        const allChanges = await this.getLocalChanges();
        return allChanges.filter(change => change.path.startsWith(`${moduleName}/`));
    }
}
