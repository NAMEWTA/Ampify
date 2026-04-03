import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { buildSyncedModules } from './gitShareModules';

function mockLocalize(locale: 'en' | 'zh-cn') {
    const dict = locale === 'en'
        ? {
            'nav.skills': 'Skills',
            'nav.commands': 'Commands',
            'nav.agents': 'Agents',
            'nav.rules': 'Rules',
            'gitShare.module.skills': 'Skills library',
            'gitShare.module.commands': 'Command library',
            'gitShare.module.agents': 'Agent library',
            'gitShare.module.rules': 'Rule library'
        }
        : {
            'nav.skills': '技能',
            'nav.commands': '命令',
            'nav.agents': '智能体',
            'nav.rules': '规则',
            'gitShare.module.skills': '技能资源库',
            'gitShare.module.commands': '命令资源库',
            'gitShare.module.agents': '智能体资源库',
            'gitShare.module.rules': '规则资源库'
        };

    return (key: string) => dict[key as keyof typeof dict] ?? key;
}

test('returns all synced module folders including agents and rules', () => {
    const modules = buildSyncedModules(mockLocalize('en'));

    assert.deepEqual(modules.map((mod) => mod.name), [
        'vscodeskillsmanager',
        'vscodecmdmanager',
        'vscodeagentmanager',
        'vscoderulemanager'
    ]);

    assert.deepEqual(modules.map((mod) => mod.relativePath), [
        'vscodeskillsmanager/skills',
        'vscodecmdmanager/commands',
        'vscodeagentmanager/agents',
        'vscoderulemanager/rules'
    ]);
});

test('uses localized display names and descriptions', () => {
    const modules = buildSyncedModules(mockLocalize('zh-cn'));

    assert.deepEqual(modules.map((mod) => mod.displayName), ['技能', '命令', '智能体', '规则']);
    assert.deepEqual(modules.map((mod) => mod.description), ['技能资源库', '命令资源库', '智能体资源库', '规则资源库']);
});
