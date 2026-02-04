import * as fs from 'fs';
import * as path from 'path';
import { getGitShareModuleDir, ensureDir, getModuleDir } from '../../../common/paths';
import { CommandsManagerConfig, LoadedCommand } from '../../../common/types';
import { parseCommandMd } from '../templates/commandMdTemplate';

/**
 * Commands Manager 配置管理器
 * 数据存储在 gitshare/vscodecmdmanager/ 目录下
 * 配置存储在原来的 vscodecmdmanager/ 目录下（本地配置）
 */
export class CommandConfigManager {
    private static instance: CommandConfigManager;
    
    /** 本地配置目录（不同步） */
    protected readonly localRootDir: string;
    /** 本地配置文件路径 */
    protected readonly configPath: string;
    /** Git 共享数据目录 */
    protected readonly gitShareDir: string;
    /** Commands 数据目录 */
    private commandsDir: string;

    private constructor() {
        // 本地配置目录（不同步）
        this.localRootDir = getModuleDir(this.getModuleName());
        this.configPath = path.join(this.localRootDir, 'config.json');
        
        // Git 共享数据目录
        this.gitShareDir = getGitShareModuleDir(this.getModuleName());
        this.commandsDir = path.join(this.gitShareDir, 'commands');
    }

    public static getInstance(): CommandConfigManager {
        if (!CommandConfigManager.instance) {
            CommandConfigManager.instance = new CommandConfigManager();
        }
        return CommandConfigManager.instance;
    }

    protected getModuleName(): string {
        return 'vscodecmdmanager';
    }

    protected getDefaultConfig(): CommandsManagerConfig {
        return {
            injectTarget: '.claude/commands/'
        };
    }

    public ensureInit(): void {
        ensureDir(this.localRootDir);
        ensureDir(this.gitShareDir);
        ensureDir(this.commandsDir);

        if (!fs.existsSync(this.configPath)) {
            const defaultConfig = this.getDefaultConfig();
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        }
    }

    public getConfig(): CommandsManagerConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(content) as CommandsManagerConfig;
        } catch (error) {
            console.error('Failed to read commands config', error);
            return this.getDefaultConfig();
        }
    }

    public saveConfig(config: CommandsManagerConfig): void {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    /**
     * 获取本地配置目录（不同步）
     */
    public getLocalRootDir(): string {
        return this.localRootDir;
    }

    /**
     * 获取 Git 共享数据目录
     */
    public getGitShareDir(): string {
        return this.gitShareDir;
    }

    /**
     * 获取配置文件路径
     */
    public getConfigPath(): string {
        return this.configPath;
    }

    /**
     * 获取命令存储目录
     */
    public getCommandsDir(): string {
        return this.commandsDir;
    }

    /**
     * 获取命令相对于 gitshare 根目录的相对路径
     */
    public getCommandRelativePath(commandName: string): string {
        return `${this.getModuleName()}/commands/${commandName}.md`;
    }

    /**
     * 加载所有命令
     * @returns 命令列表
     */
    public loadAllCommands(): LoadedCommand[] {
        const commands: LoadedCommand[] = [];

        if (!fs.existsSync(this.commandsDir)) {
            return commands;
        }

        const files = fs.readdirSync(this.commandsDir);
        for (const file of files) {
            if (!file.endsWith('.md')) {
                continue;
            }

            const filePath = path.join(this.commandsDir, file);
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
                continue;
            }

            const command = this.loadCommandFromFile(filePath);
            if (command) {
                commands.push(command);
            }
        }

        return commands.sort((a, b) => a.meta.command.localeCompare(b.meta.command));
    }

    /**
     * 从文件加载单个命令
     */
    public loadCommandFromFile(filePath: string): LoadedCommand | null {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const { meta, body } = parseCommandMd(content);

            if (!meta) {
                return null;
            }

            const fileName = path.basename(filePath, '.md');
            
            // 验证文件名与 command 字段一致
            if (fileName !== meta.command) {
                console.warn(`Command file name mismatch: ${fileName} vs ${meta.command}`);
                return null;
            }

            return {
                fileName,
                path: filePath,
                meta,
                content: body
            };
        } catch (error) {
            console.error(`Failed to load command from ${filePath}`, error);
            return null;
        }
    }

    /**
     * 获取单个命令
     */
    public getCommand(commandName: string): LoadedCommand | null {
        const filePath = path.join(this.commandsDir, `${commandName}.md`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return this.loadCommandFromFile(filePath);
    }

    /**
     * 保存命令 MD 文件
     */
    public saveCommandMd(commandName: string, content: string): void {
        const filePath = path.join(this.commandsDir, `${commandName}.md`);
        fs.writeFileSync(filePath, content, 'utf8');
    }

    /**
     * 删除命令
     */
    public deleteCommand(commandName: string): boolean {
        const filePath = path.join(this.commandsDir, `${commandName}.md`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }

    /**
     * 检查命令是否存在
     */
    public commandExists(commandName: string): boolean {
        const filePath = path.join(this.commandsDir, `${commandName}.md`);
        return fs.existsSync(filePath);
    }

    /**
     * 获取所有标签
     */
    public getAllTags(): string[] {
        const commands = this.loadAllCommands();
        const tagSet = new Set<string>();

        for (const cmd of commands) {
            if (cmd.meta.tags) {
                cmd.meta.tags.forEach(tag => tagSet.add(tag));
            }
        }

        return Array.from(tagSet).sort();
    }

    /**
     * 验证命令名称格式
     */
    public static validateCommandName(name: string): boolean {
        // 小写字母、数字、连字符，最多64字符
        const pattern = /^[a-z0-9-]+$/;
        return pattern.test(name) && name.length <= 64 && name.length > 0;
    }
}
