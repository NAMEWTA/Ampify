import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SkillsManagerConfig, SkillMeta, LoadedSkill, GitConfig } from '../../../common/types';

export class SkillConfigManager {
    private configPath: string;
    private rootDir: string;
    private skillsDir: string;

    constructor() {
        this.rootDir = path.join(os.homedir(), '.vscodeskillsmanager');
        this.configPath = path.join(this.rootDir, 'config.json');
        this.skillsDir = path.join(this.rootDir, 'skills');
    }

    /**
     * 初始化目录结构
     */
    public async ensureInit(): Promise<void> {
        this.ensureDir(this.rootDir);
        this.ensureDir(this.skillsDir);

        if (!fs.existsSync(this.configPath)) {
            const defaultConfig: SkillsManagerConfig = {
                gitConfig: {},
                injectTarget: '.claude/skills/'
            };
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        }
    }

    /**
     * 确保目录存在
     */
    private ensureDir(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * 获取配置
     */
    public getConfig(): SkillsManagerConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return { gitConfig: {}, injectTarget: '.claude/skills/' };
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to read skills config', error);
            return { gitConfig: {}, injectTarget: '.claude/skills/' };
        }
    }

    /**
     * 保存配置
     */
    public saveConfig(config: SkillsManagerConfig): void {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
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
     * 获取根目录
     */
    public getRootDir(): string {
        return this.rootDir;
    }

    /**
     * 获取配置文件路径
     */
    public getConfigPath(): string {
        return this.configPath;
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
            const skillJsonPath = path.join(skillPath, 'skill.json');
            const skillMdPath = path.join(skillPath, 'SKILL.md');

            // 必须有 skill.json
            if (!fs.existsSync(skillJsonPath)) continue;

            try {
                const metaContent = fs.readFileSync(skillJsonPath, 'utf8');
                const meta: SkillMeta = JSON.parse(metaContent);

                skills.push({
                    dirName: entry.name,
                    path: skillPath,
                    meta,
                    hasSkillMd: fs.existsSync(skillMdPath),
                    skillMdPath: fs.existsSync(skillMdPath) ? skillMdPath : undefined
                });
            } catch (error) {
                console.error(`Failed to load skill ${entry.name}:`, error);
            }
        }

        return skills;
    }

    /**
     * 加载单个 Skill
     */
    public loadSkill(skillName: string): LoadedSkill | null {
        const skillPath = this.getSkillPath(skillName);
        const skillJsonPath = path.join(skillPath, 'skill.json');
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        if (!fs.existsSync(skillJsonPath)) {
            return null;
        }

        try {
            const metaContent = fs.readFileSync(skillJsonPath, 'utf8');
            const meta: SkillMeta = JSON.parse(metaContent);

            return {
                dirName: skillName,
                path: skillPath,
                meta,
                hasSkillMd: fs.existsSync(skillMdPath),
                skillMdPath: fs.existsSync(skillMdPath) ? skillMdPath : undefined
            };
        } catch (error) {
            console.error(`Failed to load skill ${skillName}:`, error);
            return null;
        }
    }

    /**
     * 保存 Skill 元数据
     */
    public saveSkillMeta(skillName: string, meta: SkillMeta): void {
        const skillPath = this.getSkillPath(skillName);
        this.ensureDir(skillPath);
        const skillJsonPath = path.join(skillPath, 'skill.json');
        fs.writeFileSync(skillJsonPath, JSON.stringify(meta, null, 2), 'utf8');
    }

    /**
     * 保存 SKILL.md 内容
     */
    public saveSkillMd(skillName: string, content: string): void {
        const skillPath = this.getSkillPath(skillName);
        this.ensureDir(skillPath);
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        fs.writeFileSync(skillMdPath, content, 'utf8');
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

    /**
     * 复制目录
     */
    public copyDir(src: string, dest: string): void {
        this.ensureDir(dest);
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}
