export interface SyncedModule {
    name: string;
    displayName: string;
    relativePath: string;
    description: string;
    iconId: string;
}

type LocalizeFn = (key: string) => string;

function localizeOrFallback(localize: LocalizeFn, key: string, fallback: string): string {
    const localized = localize(key);
    return localized && localized !== key ? localized : fallback;
}

export function buildSyncedModules(localize: LocalizeFn): SyncedModule[] {
    return [
        {
            name: 'vscodeskillsmanager',
            displayName: localizeOrFallback(localize, 'nav.skills', 'Skills'),
            relativePath: 'vscodeskillsmanager/skills',
            description: localizeOrFallback(localize, 'gitShare.module.skills', 'AI Skills library'),
            iconId: 'book'
        },
        {
            name: 'vscodecmdmanager',
            displayName: localizeOrFallback(localize, 'nav.commands', 'Commands'),
            relativePath: 'vscodecmdmanager/commands',
            description: localizeOrFallback(localize, 'gitShare.module.commands', 'Command library'),
            iconId: 'terminal'
        },
        {
            name: 'vscodeagentmanager',
            displayName: localizeOrFallback(localize, 'nav.agents', 'Agents'),
            relativePath: 'vscodeagentmanager/agents',
            description: localizeOrFallback(localize, 'gitShare.module.agents', 'Agent library'),
            iconId: 'hubot'
        },
        {
            name: 'vscoderulemanager',
            displayName: localizeOrFallback(localize, 'nav.rules', 'Rules'),
            relativePath: 'vscoderulemanager/rules',
            description: localizeOrFallback(localize, 'gitShare.module.rules', 'Rule library'),
            iconId: 'law'
        }
    ];
}