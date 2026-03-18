export type InjectTargetKind = 'skills' | 'commands' | 'agents' | 'rules';

const defaultInjectTargets: Record<InjectTargetKind, string[]> = {
    skills: ['.agents/skills/', '.claude/skills/'],
    commands: ['.agents/commands/', '.claude/commands/'],
    agents: ['.agents/agents/', '.claude/agents/'],
    rules: ['.agents/rules/', '.claude/rules/']
};

function normalizeSingleInjectTarget(target: string): string {
    let normalized = target.trim().replace(/\\/g, '/');
    normalized = normalized.replace(/^\.\/+/, '');
    normalized = normalized.replace(/\/{2,}/g, '/');

    if (normalized.length > 0 && !normalized.endsWith('/')) {
        normalized += '/';
    }

    return normalized;
}

export function getDefaultInjectTargets(kind: InjectTargetKind): string[] {
    return [...defaultInjectTargets[kind]];
}

export function stringifyInjectTargets(targets: string[]): string {
    const unique = new Set<string>();

    for (const target of targets) {
        const normalized = normalizeSingleInjectTarget(target);
        if (normalized) {
            unique.add(normalized);
        }
    }

    return Array.from(unique).join(', ');
}

export function getDefaultInjectTargetValue(kind: InjectTargetKind): string {
    return stringifyInjectTargets(getDefaultInjectTargets(kind));
}

export function parseInjectTargets(value: string | undefined, kind: InjectTargetKind): string[] {
    const parts = (value || '')
        .split(/[\r\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return getDefaultInjectTargets(kind);
    }

    return stringifyInjectTargets(parts)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

export function normalizeInjectTargetValue(value: string | undefined, kind: InjectTargetKind): string {
    return stringifyInjectTargets(parseInjectTargets(value, kind));
}
