import { RuleMeta } from '../../../common/types';
import { parse as parseYaml } from 'yaml';

export function generateRuleMd(meta: RuleMeta, body?: string): string {
    const frontmatter = generateFrontmatter(meta);
    const content = body || generateDefaultBody();
    return `${frontmatter}\n${content}`;
}

function generateFrontmatter(meta: RuleMeta): string {
    const lines: string[] = ['---'];

    lines.push(`rule: ${meta.rule}`);
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

# Rule Title

## Purpose
Briefly describe what this rule governs.

## Rule Content
- [Rule 1]
- [Rule 2]

## Scope
Describe where this rule should apply.

## Notes
Add any details or examples here.

`;
}

export function parseRuleMd(content: string): { meta: RuleMeta | null; body: string } {
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

        const meta: RuleMeta = {
            rule: typeof data.rule === 'string' ? data.rule : '',
            description: typeof data.description === 'string' ? data.description : '',
            tags: Array.isArray(data.tags) ? data.tags as string[] : undefined
        };

        if (!meta.rule || !meta.description) {
            return { meta: null, body: content };
        }

        return { meta, body };
    } catch {
        return { meta: null, body: content };
    }
}
