import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { normalizeSkillImportSource } from './skillImportSource';

function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'ampify-skill-import-'));
}

function cleanupTempDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
}

test('normalizeSkillImportSource accepts a skill directory', () => {
    const tempDir = createTempDir();
    try {
        const skillDir = path.join(tempDir, 'my-skill');
        fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# skill');

        const result = normalizeSkillImportSource(skillDir);

        assert.equal(result.ok, true);
        if (!result.ok) {
            throw new Error('Expected successful normalization');
        }
        assert.equal(result.directoryPath, skillDir);
    } finally {
        cleanupTempDir(tempDir);
    }
});

test('normalizeSkillImportSource converts SKILL.md file path to parent directory', () => {
    const tempDir = createTempDir();
    try {
        const skillDir = path.join(tempDir, 'my-skill');
        fs.mkdirSync(skillDir, { recursive: true });
        const skillMdPath = path.join(skillDir, 'SKILL.md');
        fs.writeFileSync(skillMdPath, '# skill');

        const result = normalizeSkillImportSource(skillMdPath);

        assert.equal(result.ok, true);
        if (!result.ok) {
            throw new Error('Expected successful normalization');
        }
        assert.equal(result.directoryPath, skillDir);
    } finally {
        cleanupTempDir(tempDir);
    }
});

test('normalizeSkillImportSource rejects non-SKILL.md files', () => {
    const tempDir = createTempDir();
    try {
        const randomFilePath = path.join(tempDir, 'README.md');
        fs.writeFileSync(randomFilePath, '# readme');

        const result = normalizeSkillImportSource(randomFilePath);

        assert.equal(result.ok, false);
        if (result.ok) {
            throw new Error('Expected failed normalization');
        }
        assert.match(result.error, /SKILL\.md/);
    } finally {
        cleanupTempDir(tempDir);
    }
});

test('normalizeSkillImportSource rejects missing paths', () => {
    const missingPath = path.join(os.tmpdir(), 'ampify-skill-import-missing-path');

    const result = normalizeSkillImportSource(missingPath);

    assert.equal(result.ok, false);
    if (result.ok) {
        throw new Error('Expected failed normalization');
    }
    assert.match(result.error, /not found|exist/i);
});
