import * as path from 'node:path';
import type { Prerequisite } from '../../../common/types';

const SKILL_NAME_PATTERN = /^[a-z0-9-]+$/;
const MAX_SKILL_NAME_LENGTH = 64;

export interface EvaluatedPrerequisite {
    met: boolean;
    message: string;
}

export function isValidSkillName(name: string): boolean {
    if (!name || name.trim() !== name) {
        return false;
    }

    return SKILL_NAME_PATTERN.test(name) && name.length <= MAX_SKILL_NAME_LENGTH;
}

export function resolveSafeSkillPath(baseDir: string, skillName: string): string {
    if (!isValidSkillName(skillName)) {
        throw new Error(`Invalid skill name: ${skillName}`);
    }

    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(resolvedBase, skillName);
    const relative = path.relative(resolvedBase, resolvedTarget);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Resolved path escapes base directory: ${skillName}`);
    }

    return resolvedTarget;
}

export function resolveSkillMetaName(rawName: unknown, fallbackName: string): string | null {
    const candidate = typeof rawName === 'string' ? rawName : fallbackName;
    return isValidSkillName(candidate) ? candidate : null;
}

export function evaluatePrerequisite(prerequisite: Prerequisite): EvaluatedPrerequisite {
    if (prerequisite.checkCommand) {
        return {
            met: false,
            message: prerequisite.installHint || 'Automatic command checks are disabled for security'
        };
    }

    if (prerequisite.type === 'manual') {
        return {
            met: false,
            message: prerequisite.installHint || prerequisite.name
        };
    }

    return {
        met: true,
        message: 'Unable to verify automatically'
    };
}
