import * as fs from 'fs';
import * as path from 'path';
import { getGitShareModuleDir, ensureDir } from '../../../common/paths';
import { CommandsManagerConfig, LoadedCommand, AiTaggingConfig } from '../../../common/types';
import { parseCommandMd } from '../templates/commandMdTemplate';
import { updateFrontmatterTags } from '../../../common/frontmatter';
import { normalizeTagLibrary } from '../../../common/tagLibrary';

/**
 * Commands Manager 配置管理器
 * 数据和配置统一存储在 gitshare/vscodecmdmanager/ 目录下
 */
export class CommandConfigManager {
    private static instance: CommandConfigManager;
    
    /** 配置文件路径 */
    protected readonly configPath: string;
    /** Git 共享数据目录 */
    protected readonly gitShareDir: string;
    /** Commands 数据目录 */
    private commandsDir: string;

    private constructor() {
        // Git 共享数据目录（配置和数据统一存放）
        this.gitShareDir = getGitShareModuleDir(this.getModuleName());
        this.configPath = path.join(this.gitShareDir, 'config.json');
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
            injectTarget: '.agents/commands/',
            aiTagging: this.getDefaultAiTaggingConfig()
        };
    }

    private getDefaultAiTaggingConfig(): AiTaggingConfig {
        return {
            provider: 'vscode-chat',
            vscodeModelId: '',
            openaiBaseUrl: '',
            openaiApiKey: '',
            openaiModel: '',
            tagLibrary: [
                { name: '笔记', description: '专指碎片化记录，避免与报告混淆' },
                { name: '报告', description: '与 PRD（需求）/ 设计（UI）严格区分' },
                { name: '前端', description: '前端代码开发与实现' },
                { name: '后端', description: '后端代码开发与实现' },
                { name: '代码检查', description: '独立于代码开发，聚焦审核过程' },
                { name: 'prd', description: '产品需求文档（PRD）标准缩写' },
                { name: '头脑风暴', description: '会议讨论扩散与创意发散' },
                { name: '项目计划', description: '项目管理核心输出' },
                { name: 'data', description: '数据处理、可视化、统计分析' },
                { name: 'ai', description: '机器学习、深度学习、AI 应用' },
                { name: 'design', description: 'UI/UX 设计、平面设计、Figma/Sketch 等工具' },
                { name: 'tool', description: '技术工具（如 Git、Docker、Excel）' },
                { name: 'plan', description: '内容主题规划与发布日历' },
                { name: 'seminar', description: '行业研讨会与学习分享' }
            ]
        };
    }

    private normalizeAiTaggingConfig(config?: AiTaggingConfig): AiTaggingConfig {
        const defaults = this.getDefaultAiTaggingConfig();
        return {
            provider: config?.provider === 'openai-compatible' ? 'openai-compatible' : 'vscode-chat',
            vscodeModelId: (config?.vscodeModelId || '').trim(),
            openaiBaseUrl: (config?.openaiBaseUrl || '').trim(),
            openaiApiKey: (config?.openaiApiKey || '').trim(),
            openaiModel: (config?.openaiModel || '').trim(),
            tagLibrary: normalizeTagLibrary(config?.tagLibrary, defaults.tagLibrary)
        };
    }

    public ensureInit(): void {
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
            const config = JSON.parse(content) as CommandsManagerConfig;
            const fallback = this.getDefaultConfig().injectTarget ?? '.agents/commands/';
            const normalized = this.normalizeInjectTarget(config.injectTarget ?? fallback);
            const aiTagging = this.normalizeAiTaggingConfig(config.aiTagging);
            let changed = false;
            if (normalized !== config.injectTarget) {
                config.injectTarget = normalized;
                changed = true;
            }
            if (JSON.stringify(aiTagging) !== JSON.stringify(config.aiTagging || {})) {
                config.aiTagging = aiTagging;
                changed = true;
            }
            if (changed) {
                this.saveConfig(config);
            }
            return config;
        } catch (error) {
            console.error('Failed to read commands config', error);
            return this.getDefaultConfig();
        }
    }

    public saveConfig(config: CommandsManagerConfig): void {
        config.aiTagging = this.normalizeAiTaggingConfig(config.aiTagging);
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    public getAiTaggingConfig(): AiTaggingConfig {
        const config = this.getConfig();
        return this.normalizeAiTaggingConfig(config.aiTagging);
    }

    public updateAiTaggingConfig(partial: Partial<AiTaggingConfig>): AiTaggingConfig {
        const config = this.getConfig();
        const next = this.normalizeAiTaggingConfig({
            ...this.getAiTaggingConfig(),
            ...partial
        });
        config.aiTagging = next;
        this.saveConfig(config);
        return next;
    }

    public updateCommandTags(commandPath: string, tags: string[]): boolean {
        if (!fs.existsSync(commandPath)) {
            return false;
        }
        const content = fs.readFileSync(commandPath, 'utf8');
        const updated = updateFrontmatterTags(content, tags);
        if (!updated) {
            return false;
        }
        fs.writeFileSync(commandPath, updated, 'utf8');
        return true;
    }

    private normalizeInjectTarget(target: string): string {
        if (/^\.claude([\\/]|$)/.test(target)) {
            return target.replace(/^\.claude(?=[\\/]|$)/, '.agents');
        }
        return target;
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
