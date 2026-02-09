import { randomUUID } from 'crypto';
import { BaseConfigManager } from '../../../common/baseConfigManager';
import { CopilotCredential, OpenCodeCopilotAuthConfig } from '../../../common/types';

export class OpenCodeCopilotAuthConfigManager extends BaseConfigManager<OpenCodeCopilotAuthConfig> {
    constructor() {
        super();
        this.ensureInit();
    }

    protected getModuleName(): string {
        return 'opencode-copilot-auth';
    }

    protected getDefaultConfig(): OpenCodeCopilotAuthConfig {
        return { credentials: [] };
    }

    getCredentials(): CopilotCredential[] {
        const config = this.getConfig();
        return config.credentials || [];
    }

    getCredentialById(id: string): CopilotCredential | undefined {
        return this.getCredentials().find((cred) => cred.id === id);
    }

    addCredential(name: string, type: string, access: string, refresh: string, expires: number): CopilotCredential {
        const config = this.getConfig();
        const credential: CopilotCredential = {
            id: randomUUID(),
            name,
            type,
            access,
            refresh,
            expires
        };
        config.credentials = [...(config.credentials || []), credential];
        this.saveConfig(config);
        return credential;
    }

    removeCredential(id: string): boolean {
        const config = this.getConfig();
        const next = (config.credentials || []).filter((cred) => cred.id !== id);
        if (next.length === (config.credentials || []).length) {
            return false;
        }
        config.credentials = next;
        if (config.activeId === id) {
            delete config.activeId;
        }
        this.saveConfig(config);
        return true;
    }

    renameCredential(id: string, name: string): boolean {
        const config = this.getConfig();
        const target = (config.credentials || []).find((cred) => cred.id === id);
        if (!target) {
            return false;
        }
        target.name = name;
        this.saveConfig(config);
        return true;
    }

    setActiveId(id: string): void {
        const config = this.getConfig();
        config.activeId = id;
        this.saveConfig(config);
    }

    getActiveId(): string | undefined {
        const config = this.getConfig();
        return config.activeId;
    }
}
