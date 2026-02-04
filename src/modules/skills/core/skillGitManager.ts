import { GitManager } from '../../../common/git';
import { GitStatus, DiffFile } from '../../../common/types';
import { SkillConfigManager } from './skillConfigManager';

/**
 * Skills Git 管理器
 * 作为共享 GitManager 的薄包装层，提供 Skills 模块特定的功能
 */
export class SkillGitManager {
    private gitManager: GitManager;
    private configManager: SkillConfigManager;

    constructor(configManager: SkillConfigManager) {
        this.configManager = configManager;
        this.gitManager = new GitManager();
    }

    /**
     * 获取共享 Git 管理器
     */
    public getGitManager(): GitManager {
        return this.gitManager;
    }

    /**
     * 初始化 Git 仓库
     */
    public async init(): Promise<boolean> {
        return this.gitManager.init();
    }

    /**
     * 检查是否是 Git 仓库
     */
    public async isGitRepository(): Promise<boolean> {
        return this.gitManager.isGitRepository();
    }

    /**
     * 获取 Git 状态
     */
    public async getStatus(): Promise<GitStatus> {
        return this.gitManager.getStatus();
    }

    /**
     * 配置 Git 用户信息
     */
    public async configureUser(userName: string, userEmail: string): Promise<void> {
        return this.gitManager.configureUser(userName, userEmail);
    }

    /**
     * 设置远程仓库
     */
    public async setRemote(url: string): Promise<boolean> {
        return this.gitManager.setRemote(url);
    }

    /**
     * 设置多个远程仓库
     */
    public async setRemotes(urls: string[]): Promise<boolean> {
        return this.gitManager.setRemotes(urls);
    }

    /**
     * 从配置同步远程仓库
     */
    public async syncRemotesFromConfig(): Promise<boolean> {
        return this.gitManager.syncRemotesFromConfig();
    }

    /**
     * 获取远程仓库 URL
     */
    public async getRemoteUrl(): Promise<string | undefined> {
        return this.gitManager.getRemoteUrl();
    }

    /**
     * 暂存所有更改
     */
    public async stageAll(): Promise<void> {
        return this.gitManager.stageAll();
    }

    /**
     * 提交更改
     */
    public async commit(message: string): Promise<boolean> {
        return this.gitManager.commit(message);
    }

    /**
     * 拉取远程更新
     */
    public async pull(): Promise<{ success: boolean; error?: string; authError?: boolean; conflict?: boolean; noRemote?: boolean }> {
        return this.gitManager.pull();
    }

    /**
     * 推送到远程
     */
    public async push(options?: { skipPull?: boolean }): Promise<{ success: boolean; error?: string; authError?: boolean; conflict?: boolean; noRemote?: boolean }> {
        return this.gitManager.push(options);
    }

    /**
     * 统一同步：init -> pull -> commit -> push
     */
    public async sync(): Promise<{ success: boolean; error?: string; authError?: boolean; conflict?: boolean; localOnly?: boolean }> {
        return this.gitManager.sync();
    }

    /**
     * 获取本地变更文件列表（仅 Skills 模块）
     */
    public async getLocalChanges(): Promise<DiffFile[]> {
        const moduleName = 'vscodeskillsmanager';
        return this.gitManager.getModuleChanges(moduleName);
    }

    /**
     * 获取与远程的差异
     */
    public async getRemoteDiff(): Promise<DiffFile[]> {
        return this.gitManager.getRemoteDiff();
    }

    /**
     * 获取文件的完整路径（相对于 gitshare 根目录）
     */
    public getFilePath(relativePath: string): string {
        return this.gitManager.getFilePath(relativePath);
    }

    /**
     * 获取文件在某个提交的内容
     */
    public async getFileContent(filePath: string, ref: string = 'HEAD'): Promise<string | null> {
        return this.gitManager.getFileContent(filePath, ref);
    }

    /**
     * 获取远程分支文件内容
     */
    public async getRemoteFileContent(filePath: string): Promise<string | null> {
        return this.gitManager.getRemoteFileContent(filePath);
    }

    /**
     * 获取 Git 共享配置文件路径
     */
    public getGitConfigPath(): string {
        return this.gitManager.getConfigPath();
    }
}
