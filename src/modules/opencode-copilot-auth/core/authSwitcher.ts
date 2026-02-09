import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CopilotCredential } from '../../../common/types';

const GITHUB_COPILOT_KEY = 'github-copilot';

interface CopilotAuthEntry {
    type: string;
    access: string;
    refresh: string;
    expires: number;
}

export class AuthSwitcher {
    getAuthJsonPath(): string {
        return path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json');
    }

    readAuthJson(): Record<string, unknown> {
        const authPath = this.getAuthJsonPath();
        if (!fs.existsSync(authPath)) {
            throw new Error('auth.json not found');
        }
        const content = fs.readFileSync(authPath, 'utf8');
        const parsed = JSON.parse(content) as Record<string, unknown> | null;
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('auth.json is invalid');
        }
        return parsed;
    }

    importCurrentCredential(): CopilotAuthEntry | null {
        let data: Record<string, unknown>;
        try {
            data = this.readAuthJson();
        } catch (error) {
            if (error instanceof Error && error.message === 'auth.json not found') {
                return null;
            }
            throw error;
        }
        if (!Object.prototype.hasOwnProperty.call(data, GITHUB_COPILOT_KEY)) {
            return null;
        }
        const entry = data[GITHUB_COPILOT_KEY];
        if (!entry || typeof entry !== 'object') {
            throw new Error('github-copilot entry is invalid');
        }
        const record = entry as Record<string, unknown>;
        const type = typeof record.type === 'string' ? record.type : 'oauth';
        const access = typeof record.access === 'string' ? record.access : '';
        const refresh = typeof record.refresh === 'string' ? record.refresh : '';
        const expires = typeof record.expires === 'number' ? record.expires : 0;

        if (!access || !refresh) {
            throw new Error('github-copilot entry missing tokens');
        }

        return { type, access, refresh, expires };
    }

    switchCredential(credential: CopilotCredential): void {
        const data = this.readAuthJson();
        data[GITHUB_COPILOT_KEY] = {
            type: credential.type,
            access: credential.access,
            refresh: credential.refresh,
            expires: credential.expires
        };

        const authPath = this.getAuthJsonPath();
        fs.writeFileSync(authPath, JSON.stringify(data, null, 2), 'utf8');
    }

    clearCredential(): void {
        const data = this.readAuthJson();
        if (Object.prototype.hasOwnProperty.call(data, GITHUB_COPILOT_KEY)) {
            delete data[GITHUB_COPILOT_KEY];
        }

        const authPath = this.getAuthJsonPath();
        fs.writeFileSync(authPath, JSON.stringify(data, null, 2), 'utf8');
    }
}
