import { AgentMeta } from '../../../common/types';
import { parse as parseYaml } from 'yaml';

export function generateAgentMd(meta: AgentMeta, body?: string): string {
    const frontmatter = generateFrontmatter(meta);
    const content = body || generateDefaultBody();
    return `${frontmatter}\n${content}`;
}

function generateFrontmatter(meta: AgentMeta): string {
    const lines: string[] = ['---'];

    lines.push(`agent: ${meta.agent}`);
    lines.push(`description: ${meta.description}`);

    if (meta.tags && meta.tags.length > 0) {
        lines.push('tags:');
        meta.tags.forEach(tag => {
            lines.push(`  - ${tag}`);
        });
    }

    lines.push('---');
    return lines.join('\n');
}

function generateDefaultBody(): string {
    return `

# Agent Title

## Purpose
Briefly describe what this agent is responsible for.

## System Prompt

You are a professional [role description].

## Responsibilities
- [Responsibility 1]
- [Responsibility 2]

## Constraints
- [Constraint 1]
- [Constraint 2]

## Output Expectations
Describe how the agent should respond.

`;
}

export function parseAgentMd(content: string): { meta: AgentMeta | null; body: string } {
    const frontmatterMatch = content.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---/);

    if (!frontmatterMatch) {
        return { meta: null, body: content };
    }

    const frontmatterContent = frontmatterMatch[1];
    const body = content.slice(frontmatterMatch[0].length).trim();

    try {
        const data = parseYaml(frontmatterContent) as Record<string, unknown> | undefined;
        if (!data) {
            return { meta: null, body: content };
        }

        const meta: AgentMeta = {
            agent: typeof data.agent === 'string' ? data.agent : '',
            description: typeof data.description === 'string' ? data.description : '',
            tags: Array.isArray(data.tags) ? data.tags as string[] : undefined
        };

        if (!meta.agent || !meta.description) {
            return { meta: null, body: content };
        }

        return { meta, body };
    } catch {
        return { meta: null, body: content };
    }
}
