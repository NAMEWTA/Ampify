import * as fs from 'fs';
import * as path from 'path';
import { SkillsManagerConfig, SkillMeta, LoadedSkill, GitConfig } from '../../../common/types';
import { parse as parseYaml } from 'yaml';
import { BaseConfigManager } from '../../../common/baseConfigManager';
import { ensureDir } from '../../../common/paths';

export class SkillConfigManager extends BaseConfigManager<SkillsManagerConfig> {
    private skillsDir: string;

    constructor() {
        super();
        this.skillsDir = path.join(this.rootDir, 'skills');
    }

    /**
     * 获取模块名
     */
    protected getModuleName(): string {
        return 'vscodeskillsmanager';
    }

    /**
     * 默认配置
     */
    protected getDefaultConfig(): SkillsManagerConfig {
        return {
            gitConfig: { remoteUrls: [] },
            autoSyncMinutes: 10,
            injectTarget: '.claude/skills/'
        };
    }

    /**
     * 读取配置并做兼容处理
     */
    public override getConfig(): SkillsManagerConfig {
        const config = super.getConfig();
        const gitConfig = config.gitConfig || {};

        if (!gitConfig.remoteUrls || gitConfig.remoteUrls.length === 0) {
            if (gitConfig.remoteUrl) {
                gitConfig.remoteUrls = [gitConfig.remoteUrl];
            } else {
                gitConfig.remoteUrls = [];
            }
        }

        if (!config.autoSyncMinutes || config.autoSyncMinutes <= 0) {
            config.autoSyncMinutes = 10;
        }

        config.gitConfig = gitConfig;
        return config;
    }

    /**
     * 初始化目录结构
     */
    protected initializeDirectories(): void {
        ensureDir(this.skillsDir);
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
     * 获取 Skills 目录
     */
    public getSkillsDir(): string {
        return this.skillsDir;
    }

    /**
     * 获取单个 Skill 的目录路径
     */
    public getSkillPath(skillName: string): string {
        return path.join(this.skillsDir, skillName);
    }

    /**
     * 扫描并加载所有 Skills（支持层级结构）
     */
    public loadAllSkills(): LoadedSkill[] {
        if (!fs.existsSync(this.skillsDir)) {
            return [];
        }

        return this.loadSkillsRecursive(this.skillsDir, this.skillsDir);
    }

    /**
     * 递归加载 Skills
     * - 只有含 SKILL.md 的目录才会创建节点
     * - 跳过无 SKILL.md 的中间层，子 skill 直接挂载到最近的父 skill
     */
    private loadSkillsRecursive(currentDir: string, rootDir: string): LoadedSkill[] {
        const skills: LoadedSkill[] = [];
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }

            const childDir = path.join(currentDir, entry.name);
            const skillMdPath = path.join(childDir, 'SKILL.md');
            const hasSkillMd = fs.existsSync(skillMdPath);

            if (hasSkillMd) {
                // 当前目录有 SKILL.md，解析为节点
                try {
                    const meta = this.parseSkillMetaFromMarkdown(skillMdPath, entry.name);
                    if (meta) {
                        const relativePath = path.relative(rootDir, childDir).replace(/\\/g, '/');
                        meta.relativePath = relativePath;

                        // 递归加载子 skill
                        const children = this.loadSkillsRecursive(childDir, rootDir);

                        const loadedSkill: LoadedSkill = {
                            dirName: entry.name,
                            path: childDir,
                            meta,
                            hasSkillMd: true,
                            skillMdPath,
                            relativePath,
                            children: children.length > 0 ? children : undefined
                        };

                        // 同步 children 到 meta
                        if (children.length > 0) {
                            meta.children = children.map(c => c.meta);
                        }

                        skills.push(loadedSkill);
                    }
                } catch (error) {
                    console.error(`Failed to load skill ${entry.name}:`, error);
                }
            } else {
                // 当前目录无 SKILL.md，继续向下搜索，找到的 skill 直接提升到当前层级
                const descendantSkills = this.loadSkillsRecursive(childDir, rootDir);
                skills.push(...descendantSkills);
            }
        }

        return skills;
    }


    /**
     * 保存 SKILL.md 内容
     */
    public saveSkillMd(skillName: string, content: string): void {
        const skillPath = this.getSkillPath(skillName);
        ensureDir(skillPath);
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        fs.writeFileSync(skillMdPath, content, 'utf8');
    }

    /**
     * 解析 SKILL.md 的 YAML 元数据
     */
    public parseSkillMetaFromMarkdown(skillMdPath: string, fallbackName: string): SkillMeta | null {
        try {
            const content = fs.readFileSync(skillMdPath, 'utf8');
            const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

            if (!match) {
                return null;
            }

            const yamlContent = match[1];
            const data = parseYaml(yamlContent) as Record<string, unknown> | undefined;

            if (!data) {
                return null;
            }

            const meta: SkillMeta = {
                name: typeof data.name === 'string' ? data.name : fallbackName,
                description: typeof data.description === 'string' ? data.description : '',
                version: typeof data.version === 'string' ? data.version : '1.0.0',
                tags: Array.isArray(data.tags) ? data.tags as string[] : undefined,
                allowedTools: Array.isArray(data.allowedTools) ? data.allowedTools as string[] : undefined,
                prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites as SkillMeta['prerequisites'] : undefined
            };

            // 兼容 allowed-tools
            const allowedTools = data['allowed-tools'];
            if (!meta.allowedTools && Array.isArray(allowedTools)) {
                meta.allowedTools = allowedTools as string[];
            } else if (!meta.allowedTools && typeof allowedTools === 'string') {
                meta.allowedTools = allowedTools.split(',').map(s => s.trim()).filter(Boolean);
            }

            return meta;
        } catch (error) {
            console.error('Failed to parse SKILL.md', error);
            return null;
        }
    }

    /**
     * 删除 Skill
     */
    public deleteSkill(skillName: string): boolean {
        const skillPath = this.getSkillPath(skillName);
        if (!fs.existsSync(skillPath)) {
            return false;
        }

        try {
            fs.rmSync(skillPath, { recursive: true, force: true });
            return true;
        } catch (error) {
            console.error(`Failed to delete skill ${skillName}:`, error);
            return false;
        }
    }

    /**
     * 检查 Skill 是否存在
     */
    public skillExists(skillName: string): boolean {
        return fs.existsSync(this.getSkillPath(skillName));
    }

    /**
     * 获取所有标签
     */
    public getAllTags(): string[] {
        const skills = this.loadAllSkills();
        const tagSet = new Set<string>();

        for (const skill of skills) {
            if (skill.meta.tags) {
                skill.meta.tags.forEach(tag => tagSet.add(tag));
            }
        }

        return Array.from(tagSet).sort();
    }

}
