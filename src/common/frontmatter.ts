import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export function updateFrontmatterTags(content: string, tags: string[]): string | null {
    const match = content.match(/^(\uFEFF?)---\s*\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
        return null;
    }

    const bom = match[1] || '';
    const parsed = parseYaml(match[2]) as Record<string, unknown> | undefined;
    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    const normalizedTags = normalizeTags(tags);
    if (normalizedTags.length > 0) {
        parsed.tags = normalizedTags;
    } else {
        delete parsed.tags;
    }

    const yaml = stringifyYaml(parsed).trimEnd();
    const replaced = `${bom}---\n${yaml}\n---`;
    return content.replace(match[0], replaced);
}

export function normalizeTags(tags: string[]): string[] {
    const set = new Set<string>();
    for (const tag of tags) {
        const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-');
        if (normalized) {
            set.add(normalized);
        }
    }
    return Array.from(set);
}
