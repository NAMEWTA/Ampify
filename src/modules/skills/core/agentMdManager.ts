import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { SkillMeta } from '../../../common/types';
import { SkillConfigManager } from './skillConfigManager';

const SKILLS_TAG = 'skillsmanager';

export class AgentMdManager {
    constructor(private configManager: SkillConfigManager) {}

    public ensureAgentMd(workspaceRoot: string): string {
        const agentPath = path.join(workspaceRoot, 'AGENT.md');
        if (!fs.existsSync(agentPath)) {
            fs.writeFileSync(agentPath, '', 'utf8');
        }
        return agentPath;
    }

    public scanAndSync(workspaceRoot: string, injectTarget: string): void {
        const targetDir = path.isAbsolute(injectTarget)
            ? injectTarget
            : path.join(workspaceRoot, injectTarget);

        const skills = this.scanSkillMetas(targetDir);
        this.updateSkillsSection(workspaceRoot, skills);
    }

    private scanSkillMetas(targetDir: string): SkillMeta[] {
        const skills: SkillMeta[] = [];

        if (!fs.existsSync(targetDir)) {
            return skills;
        }

        const entries = fs.readdirSync(targetDir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const skillDir = path.join(targetDir, entry.name);
            const skillMdPath = path.join(skillDir, 'SKILL.md');

            if (!fs.existsSync(skillMdPath)) continue;

            const meta = this.configManager.parseSkillMetaFromMarkdown(skillMdPath, entry.name)
                || this.parseSkillMetaFromMarkdown(skillMdPath, entry.name);

            if (meta) {
                skills.push(meta);
            }
        }

        return skills;
    }

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
                version: typeof data.version === 'string' ? data.version : '1.0.0',
                tags: Array.isArray(data.tags) ? data.tags as string[] : undefined,
                allowedTools: Array.isArray(data.allowedTools) ? data.allowedTools as string[] : undefined,
                prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites as SkillMeta['prerequisites'] : undefined
            };

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

    private updateSkillsSection(workspaceRoot: string, skills: SkillMeta[]): void {
        const agentPath = this.ensureAgentMd(workspaceRoot);
        const existing = fs.readFileSync(agentPath, 'utf8');
        const skillsXml = this.buildSkillsXml(skills);

        const pattern = new RegExp(`<${SKILLS_TAG}>[\\s\\S]*?<\\/${SKILLS_TAG}>`);
        let updated: string;

        if (pattern.test(existing)) {
            updated = existing.replace(pattern, skillsXml);
        } else if (existing.trim().length > 0) {
            updated = `${existing.trimEnd()}\n\n${skillsXml}\n`;
        } else {
            updated = `${skillsXml}\n`;
        }

        fs.writeFileSync(agentPath, updated, 'utf8');
    }

    private buildSkillsXml(skills: SkillMeta[]): string {
        const lines: string[] = [];
        lines.push(`<${SKILLS_TAG}>`);
        lines.push('  <instruction>运行时，模型必须思考</instruction>');

        for (const skill of skills) {
            lines.push(this.skillToXml(skill));
        }

        lines.push(`</${SKILLS_TAG}>`);
        return lines.join('\n');
    }

    private skillToXml(meta: SkillMeta): string {
        const lines: string[] = [];
        const name = escapeXml(meta.name);
        const version = escapeXml(meta.version);

        lines.push(`  <skill name="${name}" version="${version}">`);
        lines.push(`    <description>${escapeXml(meta.description || '')}</description>`);

        if (meta.tags && meta.tags.length > 0) {
            lines.push(`    <tags>${escapeXml(meta.tags.join(', '))}</tags>`);
        }

        if (meta.allowedTools && meta.allowedTools.length > 0) {
            lines.push(`    <allowedTools>${escapeXml(meta.allowedTools.join(', '))}</allowedTools>`);
        }

        if (meta.prerequisites && meta.prerequisites.length > 0) {
            lines.push('    <prerequisites>');
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
                lines.push(`      <prerequisite ${attrs.join(' ')} />`);
            }
            lines.push('    </prerequisites>');
        }

        lines.push('  </skill>');
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
