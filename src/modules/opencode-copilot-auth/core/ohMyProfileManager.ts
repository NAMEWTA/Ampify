import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';
import { OpenCodeCopilotAuthConfigManager } from './configManager';
import { OhMyProfile } from '../../../common/types';

const OH_MY_PATH = path.join(os.homedir(), '.config', 'opencode', 'oh-my-opencode.json');

export interface CurrentOhMyInfo {
    exists: boolean;
    path: string;
    contentHash?: string;
    modelIds: string[];
}

export class OhMyProfileManager {
    constructor(private readonly configManager: OpenCodeCopilotAuthConfigManager) {}

    getFilePath(): string {
        return OH_MY_PATH;
    }

    readCurrentContent(): string {
        const filePath = this.getFilePath();
        if (!fs.existsSync(filePath)) {
            throw new Error('oh-my-opencode.json not found');
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return normalizeJsonText(content);
    }

    readCurrentInfo(): CurrentOhMyInfo {
        const filePath = this.getFilePath();
        if (!fs.existsSync(filePath)) {
            return {
                exists: false,
                path: filePath,
                modelIds: []
            };
        }

        const content = normalizeJsonText(fs.readFileSync(filePath, 'utf8'));
        return {
            exists: true,
            path: filePath,
            contentHash: buildHash(content),
            modelIds: extractModelIds(content)
        };
    }

    importCurrentProfile(name: string): OhMyProfile {
        const content = this.readCurrentContent();
        const profile: OhMyProfile = {
            id: randomUUID(),
            name,
            content,
            contentHash: buildHash(content),
            importedAt: Date.now()
        };
        this.configManager.saveOhMyProfile(profile);
        return profile;
    }

    applyProfile(profileId: string): OhMyProfile {
        const profile = this.configManager.getOhMyProfileById(profileId);
        if (!profile) {
            throw new Error('oh-my profile not found');
        }

        const target = this.getFilePath();
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, normalizeJsonText(profile.content), 'utf8');

        this.configManager.markOhMyProfileApplied(profile.id);

        const updated = this.configManager.getOhMyProfileById(profile.id);
        return updated || { ...profile, lastAppliedAt: Date.now() };
    }

    resolveCurrentProfileId(): string | undefined {
        const profiles = this.configManager.getOhMyProfiles();
        if (profiles.length === 0) {
            return undefined;
        }

        const activeId = this.configManager.getActiveOhMyProfileId();
        const current = this.readCurrentInfo();
        if (!current.exists || !current.contentHash) {
            return activeId;
        }

        const matched = profiles.find((profile) => profile.contentHash === current.contentHash);
        if (matched) {
            if (matched.id !== activeId) {
                this.configManager.setActiveOhMyProfile(matched.id);
            }
            return matched.id;
        }

        return activeId;
    }

    getModelsFromCurrentConfig(): string[] {
        const info = this.readCurrentInfo();
        return info.modelIds;
    }
}

function normalizeJsonText(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) {
        return '{}';
    }

    try {
        const parsed = JSON.parse(trimmed) as unknown;
        return `${JSON.stringify(parsed, null, 2)}\n`;
    } catch {
        return `${trimmed}\n`;
    }
}

function buildHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
}

function extractModelIds(content: string): string[] {
    try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const models = new Set<string>();

        collectModels(parsed.agents, models);
        collectModels(parsed.categories, models);

        return [...models].sort();
    } catch {
        return [];
    }
}

function collectModels(input: unknown, bucket: Set<string>): void {
    if (!input || typeof input !== 'object') {
        return;
    }

    const groups = input as Record<string, unknown>;
    for (const value of Object.values(groups)) {
        if (!value || typeof value !== 'object') {
            continue;
        }
        const record = value as Record<string, unknown>;
        if (typeof record.model === 'string' && record.model.trim()) {
            bucket.add(record.model.trim());
        }
    }
}
