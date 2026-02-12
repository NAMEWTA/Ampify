import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CopilotCredential } from '../../../common/types';

export interface AuthProviderEntry {
    provider: string;
    type: string;
    access: string;
    refresh: string;
    expires: number;
    raw: Record<string, unknown>;
}

export class AuthSwitcher {
    getAuthJsonPath(): string {
        return path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json');
    }

    ensureAuthJsonFile(): string {
        const authPath = this.getAuthJsonPath();
        if (!fs.existsSync(authPath)) {
            fs.mkdirSync(path.dirname(authPath), { recursive: true });
            fs.writeFileSync(authPath, '{}\n', 'utf8');
        }
        return authPath;
    }

    readAuthJson(): Record<string, unknown> {
        const authPath = this.getAuthJsonPath();
        if (!fs.existsSync(authPath)) {
            throw new Error('auth.json not found');
        }

        const content = fs.readFileSync(authPath, 'utf8').trim();
        if (!content) {
            return {};
        }

        const parsed = JSON.parse(content) as Record<string, unknown> | null;
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('auth.json is invalid');
        }

        return parsed;
    }

    readAuthJsonOrEmpty(): Record<string, unknown> {
        try {
            return this.readAuthJson();
        } catch (error) {
            if (error instanceof Error && error.message === 'auth.json not found') {
                return {};
            }
            throw error;
        }
    }

    writeAuthJson(data: Record<string, unknown>): void {
        const authPath = this.getAuthJsonPath();
        fs.mkdirSync(path.dirname(authPath), { recursive: true });
        fs.writeFileSync(authPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    }

    importAllCredentials(): AuthProviderEntry[] {
        const data = this.readAuthJsonOrEmpty();
        const entries: AuthProviderEntry[] = [];

        for (const [provider, value] of Object.entries(data)) {
            if (!value || typeof value !== 'object') {
                continue;
            }
            const record = value as Record<string, unknown>;
            const access = typeof record.access === 'string' ? record.access : '';
            const refresh = typeof record.refresh === 'string' ? record.refresh : '';
            if (!access || !refresh) {
                continue;
            }

            entries.push({
                provider,
                type: typeof record.type === 'string' ? record.type : 'oauth',
                access,
                refresh,
                expires: typeof record.expires === 'number' ? record.expires : 0,
                raw: { ...record }
            });
        }

        return entries;
    }

    getProviderCount(): number {
        try {
            const data = this.readAuthJsonOrEmpty();
            return Object.entries(data).filter(([, value]) => value && typeof value === 'object').length;
        } catch {
            return 0;
        }
    }

    applyCredential(credential: CopilotCredential): void {
        const data = this.readAuthJsonOrEmpty();
        const next: Record<string, unknown> = {
            ...(credential.raw || {}),
            type: credential.type,
            access: credential.access,
            refresh: credential.refresh,
            expires: credential.expires
        };
        data[credential.provider] = next;
        this.writeAuthJson(data);
    }

    applyProviderEntry(entry: AuthProviderEntry): void {
        const data = this.readAuthJsonOrEmpty();
        data[entry.provider] = {
            ...entry.raw,
            type: entry.type,
            access: entry.access,
            refresh: entry.refresh,
            expires: entry.expires
        };
        this.writeAuthJson(data);
    }

    clearProvider(provider: string): void {
        const data = this.readAuthJsonOrEmpty();
        if (Object.prototype.hasOwnProperty.call(data, provider)) {
            delete data[provider];
        }
        this.writeAuthJson(data);
    }

    clearAllProviders(): void {
        this.writeAuthJson({});
    }
}
