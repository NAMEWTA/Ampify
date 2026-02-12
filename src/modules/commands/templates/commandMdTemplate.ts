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

# 命令标题

## 用途
简要说明此命令的用途和适用场景。

## 指令内容

你是一个专业的 [角色描述]。

## 任务
[描述具体任务]

## 约束
- [约束条件]

## 输出格式
[期望的输出格式]

## 注意事项
- 注意点 1
- 注意点 2

`;
}

/**
 * 从 MD 内容解析元数据和正文
 * @param content 完整的 MD 文件内容
 * @returns 解析结果，包含 meta 和 body
 */
export function parseCommandMd(content: string): { meta: CommandMeta | null; body: string } {
    // 兼容 UTF-8 BOM：某些编辑器保存的 MD 会在开头写入 \uFEFF
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
