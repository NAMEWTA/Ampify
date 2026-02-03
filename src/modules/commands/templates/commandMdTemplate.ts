import { CommandMeta } from '../../../common/types';
import { parse as parseYaml } from 'yaml';

/**
 * 生成命令 MD 文件内容
 * @param meta 命令元数据
 * @param body 命令正文内容（可选）
 * @returns 完整的 MD 文件内容
 */
export function generateCommandMd(meta: CommandMeta, body?: string): string {
    const frontmatter = generateFrontmatter(meta);
    const content = body || generateDefaultBody(meta);
    return `${frontmatter}\n${content}`;
}

/**
 * 生成 YAML frontmatter
 */
function generateFrontmatter(meta: CommandMeta): string {
    const lines: string[] = ['---'];
    
    lines.push(`command: ${meta.command}`);
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

/**
 * 生成默认正文模板
 */
function generateDefaultBody(_meta: CommandMeta): string {
    return `
<!-- 命令内容 -->
<!-- 在此编写命令的具体内容 -->

`;
}

/**
 * 从 MD 内容解析元数据和正文
 * @param content 完整的 MD 文件内容
 * @returns 解析结果，包含 meta 和 body
 */
export function parseCommandMd(content: string): { meta: CommandMeta | null; body: string } {
    const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

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

        const meta: CommandMeta = {
            command: typeof data.command === 'string' ? data.command : '',
            description: typeof data.description === 'string' ? data.description : '',
            tags: Array.isArray(data.tags) ? data.tags as string[] : undefined
        };

        if (!meta.command || !meta.description) {
            return { meta: null, body: content };
        }

        return { meta, body };
    } catch {
        return { meta: null, body: content };
    }
}
