import { normalizeTags } from './frontmatter';
import { AiTagLibraryItem } from './types';

export function normalizeTagLibrary(items: unknown, fallback: AiTagLibraryItem[]): AiTagLibraryItem[] {
    const source = Array.isArray(items) ? items : [];
    const map = new Map<string, string>();

    for (const item of source) {
        if (typeof item === 'string') {
            const normalized = normalizeTags([item])[0];
            if (normalized && !map.has(normalized)) {
                map.set(normalized, '');
            }
            continue;
        }

        if (item && typeof item === 'object') {
            const candidate = item as { name?: unknown; description?: unknown };
            const normalized = normalizeTags([typeof candidate.name === 'string' ? candidate.name : ''])[0];
            if (!normalized) {
                continue;
            }
            const description = typeof candidate.description === 'string' ? candidate.description.trim() : '';
            if (!map.has(normalized) || (description && !map.get(normalized))) {
                map.set(normalized, description);
            }
        }
    }

    const result = Array.from(map.entries()).map(([name, description]) => ({ name, description }));
    return result.length > 0 ? result : fallback;
}

export function parseTagLibraryText(text: string): AiTagLibraryItem[] {
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const map = new Map<string, string>();
    for (const line of lines) {
        const parts = line.split('|');
        const rawName = parts[0]?.trim() || '';
        const description = parts.slice(1).join('|').trim();
        const name = normalizeTags([rawName])[0];
        if (!name) {
            continue;
        }
        if (!map.has(name) || (description && !map.get(name))) {
            map.set(name, description);
        }
    }

    return Array.from(map.entries()).map(([name, description]) => ({ name, description }));
}

export function stringifyTagLibraryText(items: AiTagLibraryItem[]): string {
    return items
        .map(item => {
            const desc = (item.description || '').trim();
            return desc ? `${item.name} | ${desc}` : item.name;
        })
        .join('\n');
}

export function getTagNames(items: AiTagLibraryItem[]): string[] {
    return items.map(item => item.name);
}

export function toTagOptions(items: AiTagLibraryItem[]): { label: string; value: string }[] {
    return items.map(item => ({
        label: item.description ? `${item.name} — ${item.description}` : item.name,
        value: item.name
    }));
}
