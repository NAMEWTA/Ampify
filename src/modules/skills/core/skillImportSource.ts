import * as fs from 'fs';
import * as path from 'path';

export type SkillImportSourceResolution =
    | { ok: true; directoryPath: string }
    | { ok: false; error: string };

export function normalizeSkillImportSource(sourcePath: string): SkillImportSourceResolution {
    const normalizedPath = sourcePath.trim();
    if (!normalizedPath) {
        return { ok: false, error: 'Source path is empty' };
    }

    if (!fs.existsSync(normalizedPath)) {
        return { ok: false, error: 'Source path does not exist' };
    }

    const stat = fs.statSync(normalizedPath);
    if (stat.isDirectory()) {
        return { ok: true, directoryPath: path.resolve(normalizedPath) };
    }

    if (stat.isFile() && path.basename(normalizedPath) === 'SKILL.md') {
        return { ok: true, directoryPath: path.resolve(path.dirname(normalizedPath)) };
    }

    return { ok: false, error: 'Skill import source must be a directory or SKILL.md file' };
}
