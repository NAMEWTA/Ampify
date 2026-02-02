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
            gitConfig: {},
            injectTarget: '.claude/skills/'
        };
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
        config.gitConfig = { ...config.gitConfig, ...gitConfig };
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
     * 扫描并加载所有 Skills
     */
    public loadAllSkills(): LoadedSkill[] {
        const skills: LoadedSkill[] = [];

        if (!fs.existsSync(this.skillsDir)) {
            return skills;
        }

        const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const skillPath = path.join(this.skillsDir, entry.name);
            const skillMdPath = path.join(skillPath, 'SKILL.md');

            // 必须有 SKILL.md
            if (!fs.existsSync(skillMdPath)) continue;

            try {
                const meta = this.parseSkillMetaFromMarkdown(skillMdPath, entry.name);
                if (!meta) continue;

                skills.push({
                    dirName: entry.name,
                    path: skillPath,
                    meta,
                    hasSkillMd: true,
                    skillMdPath
                });
            } catch (error) {
                console.error(`Failed to load skill ${entry.name}:`, error);
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
