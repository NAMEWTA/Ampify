import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { evaluatePrerequisite, isValidSkillName, resolveSafeSkillPath, resolveSkillMetaName } from './skillSecurity';

test('evaluatePrerequisite does not execute checkCommand and marks it unmet', () => {
    const result = evaluatePrerequisite({
        type: 'tool',
        name: 'Node.js',
        checkCommand: 'node -v',
        installHint: 'Install Node.js first'
    });

    assert.equal(result.met, false);
    assert.equal(result.message, 'Install Node.js first');
});

test('evaluatePrerequisite keeps manual prerequisite unmet', () => {
    const result = evaluatePrerequisite({
        type: 'manual',
        name: 'Enable API key',
        installHint: 'Open settings and configure API key'
    });

    assert.equal(result.met, false);
    assert.equal(result.message, 'Open settings and configure API key');
});

test('isValidSkillName accepts lowercase kebab-case names', () => {
    assert.equal(isValidSkillName('my-skill-1'), true);
});

test('isValidSkillName rejects traversal-like names', () => {
    assert.equal(isValidSkillName('../evil'), false);
});

test('resolveSafeSkillPath resolves valid child path inside base directory', () => {
    const baseDir = path.resolve('/tmp/ampify-security-base');
    const resolved = resolveSafeSkillPath(baseDir, 'safe-skill');

    assert.equal(resolved, path.join(baseDir, 'safe-skill'));
});

test('resolveSafeSkillPath rejects invalid skill names', () => {
    assert.throws(() => resolveSafeSkillPath('/tmp/ampify-security-base', '../evil'));
});

test('resolveSkillMetaName returns null for invalid frontmatter name', () => {
    const result = resolveSkillMetaName('../evil', 'safe-fallback');
    assert.equal(result, null);
});

test('resolveSkillMetaName falls back to validated directory name', () => {
    const result = resolveSkillMetaName(undefined, 'safe-fallback');
    assert.equal(result, 'safe-fallback');
});
