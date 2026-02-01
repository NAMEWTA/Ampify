import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import * as path from 'path';
import { GitStatus, DiffFile } from '../../../common/types';
import { SkillConfigManager } from './skillConfigManager';

export class SkillGitManager {
    private git: SimpleGit;
    private rootDir: string;

    constructor(private configManager: SkillConfigManager) {
        this.rootDir = configManager.getRootDir();
        this.git = simpleGit(this.rootDir);
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
                const fs = await import('fs');
                const gitignorePath = path.join(this.rootDir, '.gitignore');
                if (!fs.existsSync(gitignorePath)) {
                    fs.writeFileSync(gitignorePath, '# Skills Manager\n.DS_Store\n*.log\n', 'utf8');
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
            hasUnpushedCommits: false,
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
            status.hasUnstagedChanges = gitStatus.modified.length > 0 || gitStatus.not_added.length > 0;
            status.hasUncommittedChanges = gitStatus.staged.length > 0 || status.hasUnstagedChanges;
            status.changedFiles = gitStatus.files.length;

            // 检查远程
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            if (origin) {
                status.hasRemote = true;
                status.remoteUrl = origin.refs.fetch || origin.refs.push;
            }

            // 检查未推送的提交
            if (status.hasRemote && status.branch) {
                try {
                    const log = await this.git.log([`origin/${status.branch}..HEAD`]);
                    status.hasUnpushedCommits = log.total > 0;
                } catch {
                    // 可能远程分支不存在
                    status.hasUnpushedCommits = false;
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
        try {
            const remotes = await this.git.getRemotes();
            const hasOrigin = remotes.some(r => r.name === 'origin');

            if (hasOrigin) {
                await this.git.removeRemote('origin');
            }
            await this.git.addRemote('origin', url);
            return true;
        } catch (error) {
            console.error('Failed to set remote:', error);
            return false;
        }
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
        await this.git.add('.');
    }

    /**
     * 提交更改
     */
    public async commit(message: string): Promise<boolean> {
        try {
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
    public async pull(): Promise<{ success: boolean; error?: string; authError?: boolean }> {
        try {
            const status = await this.getStatus();
            if (!status.hasRemote) {
                return { success: false, error: 'No remote configured' };
            }

            await this.git.pull('origin', status.branch || 'main');
            return { success: true };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isAuthError = errorMsg.includes('Authentication') || 
                               errorMsg.includes('Permission denied') ||
                               errorMsg.includes('could not read Username');
            return { 
                success: false, 
                error: errorMsg,
                authError: isAuthError
            };
        }
    }

    /**
     * 推送到远程
     */
    public async push(): Promise<{ success: boolean; error?: string; authError?: boolean }> {
        try {
            const status = await this.getStatus();
            if (!status.hasRemote) {
                return { success: false, error: 'No remote configured' };
            }

            // 先确保有提交
            if (status.hasUncommittedChanges) {
                await this.commit('Auto-commit before push');
            }

            await this.git.push('origin', status.branch || 'main', ['--set-upstream']);
            return { success: true };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isAuthError = errorMsg.includes('Authentication') || 
                               errorMsg.includes('Permission denied') ||
                               errorMsg.includes('could not read Username');
            return { 
                success: false, 
                error: errorMsg,
                authError: isAuthError
            };
        }
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
            if (!status.hasRemote || !status.branch) {
                return [];
            }

            // 先 fetch
            await this.git.fetch('origin');

            // 获取差异文件
            const diff = await this.git.diff([
                '--name-status',
                `HEAD..origin/${status.branch}`
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
            if (!status.branch) return null;
            
            await this.git.fetch('origin');
            const content = await this.git.show([`origin/${status.branch}:${filePath}`]);
            return content;
        } catch {
            return null;
        }
    }
}
