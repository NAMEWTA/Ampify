import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { SkillMeta } from '../../../common/types';
import { SkillConfigManager } from './skillConfigManager';

const SKILLS_TAG = 'ampify';
const SKILLS_MD_FILENAME = 'SKILLS.md';

export class AgentMdManager {
    constructor(private configManager: SkillConfigManager) {}

    /**
     * 确保 AGENTS.md 文件存在
     */
    public ensureAgentMd(workspaceRoot: string): string {
        const agentPath = path.join(workspaceRoot, 'AGENTS.md');
        if (!fs.existsSync(agentPath)) {
            fs.writeFileSync(agentPath, '', 'utf8');
        }
        return agentPath;
    }

    /**
     * 扫描并同步：生成 SKILLS.md 和更新 AGENTS.md 引用
     */
    public scanAndSync(workspaceRoot: string, injectTarget: string): void {
        injectTarget = this.normalizeInjectTarget(injectTarget);
        const targetDir = path.isAbsolute(injectTarget)
            ? injectTarget
            : path.join(workspaceRoot, injectTarget);

        // 递归扫描构建层级化 SkillMeta 树
        const skills = this.scanSkillMetasRecursive(targetDir, targetDir);

        // 生成 SKILLS.md 文件
        const skillsMdPath = this.generateSkillsMd(workspaceRoot, injectTarget, skills);

        // 更新 AGENTS.md 中的 <skillsmanager> 引用
        this.updateAgentMdWithInclude(workspaceRoot, skillsMdPath);
    }

    /**
     * 递归扫描目录，构建层级化 SkillMeta 树
     * - 只有含 SKILL.md 的目录才会创建节点
     * - 跳过无 SKILL.md 的中间层，子 skill 直接挂载到最近的父 skill
     */
    private scanSkillMetasRecursive(currentDir: string, rootDir: string): SkillMeta[] {
        const skills: SkillMeta[] = [];

        if (!fs.existsSync(currentDir)) {
            return skills;
        }

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
                const meta = this.parseSkillMetaFromMarkdown(skillMdPath, entry.name);
                if (meta) {
                    // 计算相对路径
                    meta.relativePath = path.relative(rootDir, childDir).replace(/\\/g, '/');
                    // 递归扫描子目录，作为 children
                    const children = this.scanSkillMetasRecursive(childDir, rootDir);
                    if (children.length > 0) {
                        meta.children = children;
                    }
                    skills.push(meta);
                }
            } else {
                // 当前目录无 SKILL.md，继续向下搜索，找到的 skill 直接提升到当前层级
                const descendantSkills = this.scanSkillMetasRecursive(childDir, rootDir);
                skills.push(...descendantSkills);
            }
        }

        return skills;
    }

    /**
     * 解析 SKILL.md 的 YAML frontmatter
     */
    private parseSkillMetaFromMarkdown(skillMdPath: string, fallbackName: string): SkillMeta | null {
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
     * 生成 SKILLS.md 文件，包含完整层级 XML
     * @returns SKILLS.md 的相对路径（相对于 workspaceRoot）
     */
    private generateSkillsMd(workspaceRoot: string, injectTarget: string, skills: SkillMeta[]): string {
        // SKILLS.md 放在 injectTarget 的父目录
        // 例如 injectTarget = '.agents/skills/' => SKILLS.md 在 '.agents/SKILLS.md'
        const normalizedTarget = injectTarget.replace(/\/$/, '').replace(/\\$/, '');
        const targetDirAbs = path.isAbsolute(normalizedTarget)
            ? normalizedTarget
            : path.join(workspaceRoot, normalizedTarget);
        const targetParentAbs = path.dirname(targetDirAbs);
        const skillsMdAbsPath = path.join(targetParentAbs, SKILLS_MD_FILENAME);
        const skillsMdRelativePath = this.toWorkspaceRelativePath(workspaceRoot, skillsMdAbsPath);

        // 确保父目录存在
        const skillsMdDir = path.dirname(skillsMdAbsPath);
        if (!fs.existsSync(skillsMdDir)) {
            fs.mkdirSync(skillsMdDir, { recursive: true });
        }

        // 构建完整 XML 内容
        const xmlContent = this.buildSkillsXmlFull(skills);
        const content = `# Skills Index\n\n此文件由 Ampify 自动生成，包含项目中所有 Skills 的层级结构清单。\n\n${xmlContent}\n`;

        fs.writeFileSync(skillsMdAbsPath, content, 'utf8');

        return skillsMdRelativePath;
    }

    private toWorkspaceRelativePath(workspaceRoot: string, absPath: string): string {
        let relativePath = path.relative(workspaceRoot, absPath);
        if (!relativePath || relativePath.trim().length === 0) {
            relativePath = path.basename(absPath);
        }
        return this.normalizePath(relativePath);
    }

    private normalizePath(value: string): string {
        return value.replace(/\\/g, '/').replace(/^\.\//, '');
    }

    private normalizeInjectTarget(target: string): string {
        if (/^\.claude([\\/]|$)/.test(target)) {
            return target.replace(/^\.claude(?=[\\/]|$)/, '.agents');
        }
        return target;
    }

    /**
     * 构建完整的层级 XML（用于 SKILLS.md）
     */
    private buildSkillsXmlFull(skills: SkillMeta[]): string {
        const lines: string[] = [];
        lines.push('<skills>');

        for (const skill of skills) {
            this.skillToXmlRecursive(skill, lines, 1);
        }

        lines.push('</skills>');
        return lines.join('\n');
    }

    /**
     * 递归将 SkillMeta 转换为 XML（支持 children 嵌套）
     */
    private skillToXmlRecursive(meta: SkillMeta, lines: string[], depth: number): void {
        const indent = '  '.repeat(depth);
        const name = escapeXml(meta.name);
        const pathAttr = meta.relativePath ? ` path="${escapeXml(meta.relativePath)}"` : '';

        lines.push(`${indent}<skill name="${name}"${pathAttr}>`);
        lines.push(`${indent}  <description>${escapeXml(meta.description || '')}</description>`);

        if (meta.tags && meta.tags.length > 0) {
            lines.push(`${indent}  <tags>${escapeXml(meta.tags.join(', '))}</tags>`);
        }

        if (meta.allowedTools && meta.allowedTools.length > 0) {
            lines.push(`${indent}  <allowedTools>${escapeXml(meta.allowedTools.join(', '))}</allowedTools>`);
        }

        if (meta.prerequisites && meta.prerequisites.length > 0) {
            lines.push(`${indent}  <prerequisites>`);
            for (const prereq of meta.prerequisites) {
                const attrs: string[] = [];
                attrs.push(`type="${escapeXml(prereq.type)}"`);
                attrs.push(`name="${escapeXml(prereq.name)}"`);
                if (prereq.checkCommand) {
                    attrs.push(`checkCommand="${escapeXml(prereq.checkCommand)}"`);
                }
                if (prereq.installHint) {
                    attrs.push(`installHint="${escapeXml(prereq.installHint)}"`);
                }
                lines.push(`${indent}    <prerequisite ${attrs.join(' ')} />`);
            }
            lines.push(`${indent}  </prerequisites>`);
        }

        // 递归处理子 skill
        if (meta.children && meta.children.length > 0) {
            lines.push(`${indent}  <children>`);
            for (const child of meta.children) {
                this.skillToXmlRecursive(child, lines, depth + 2);
            }
            lines.push(`${indent}  </children>`);
        }

        lines.push(`${indent}</skill>`);
    }

    /**
     * 更新 AGENTS.md，使用 <include> 引用 SKILLS.md
     */
    private updateAgentMdWithInclude(workspaceRoot: string, skillsMdPath: string): void {
        const agentPath = this.ensureAgentMd(workspaceRoot);
        const existing = fs.readFileSync(agentPath, 'utf8');
        const includeXml = this.buildIncludeXml(skillsMdPath);

        // 匹配完整的 AMPIFY 块，包括标题和标签
        // 支持可选的标题行 (# AMPIFY 或旧版 # SKILLS MANAGER)，后跟 <ampify>...</ampify> 或 <skillsmanager>...</skillsmanager>
        const pattern = new RegExp(
            `(^|\\n)#\\s*(AMPIFY|SKILLS\\s+MANAGER)\\s*\\n<(${SKILLS_TAG}|skillsmanager)>[\\s\\S]*?<\\/(${SKILLS_TAG}|skillsmanager)>|` +
            `<(${SKILLS_TAG}|skillsmanager)>[\\s\\S]*?<\\/(${SKILLS_TAG}|skillsmanager)>`,
            'g'
        );
        let updated: string;

        if (pattern.test(existing)) {
            // 重置 lastIndex（因为使用了 g 标志进行 test）
            pattern.lastIndex = 0;
            updated = existing.replace(pattern, (match, prefix) => {
                // 如果匹配到了换行前缀，保留换行
                return (prefix === '\n' ? '\n' : '') + includeXml;
            });
        } else if (existing.trim().length > 0) {
            updated = `${existing.trimEnd()}\n\n${includeXml}\n`;
        } else {
            updated = `${includeXml}\n`;
        }

        fs.writeFileSync(agentPath, updated, 'utf8');
    }

    /**
     * 构建 AGENTS.md 中的 <ampify> include 引用
     */
    private buildIncludeXml(skillsMdPath: string): string {
        const lines: string[] = [];
        lines.push(`# AMPIFY`);
        lines.push(`<${SKILLS_TAG}>`);
        lines.push('  <instruction>必须在此处查看可用的 SKILLS 列表</instruction>');
        lines.push(`  <include path="${escapeXml(skillsMdPath)}" />`);
        lines.push(`</${SKILLS_TAG}>`);
        return lines.join('\n');
    }
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
