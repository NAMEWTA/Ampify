import { randomUUID } from 'crypto';
import { BaseConfigManager } from '../../../common/baseConfigManager';
import {
    CopilotCredential,
    ManagedOpencodeSession,
    OpenCodeCopilotAuthConfig,
    OhMyProfile
} from '../../../common/types';

export interface UpsertCredentialInput {
    name?: string;
    provider: string;
    type: string;
    access: string;
    refresh: string;
    expires: number;
    raw?: Record<string, unknown>;
}

const DEFAULT_PROVIDER = 'github-copilot';

export class OpenCodeCopilotAuthConfigManager extends BaseConfigManager<OpenCodeCopilotAuthConfig> {
    constructor() {
        super();
        this.ensureInit();
        this.ensureMigrated();
    }

    protected getModuleName(): string {
        return 'opencode-copilot-auth';
    }

    protected getDefaultConfig(): OpenCodeCopilotAuthConfig {
        return {
            credentials: [],
            activeByProvider: {},
            ohMyProfiles: [],
            managedSessions: []
        };
    }

    override getConfig(): OpenCodeCopilotAuthConfig {
        const raw = super.getConfig();
        return this.normalizeConfig(raw).config;
    }

    ensureMigrated(): void {
        const current = super.getConfig();
        const { config, changed } = this.normalizeConfig(current);
        if (changed) {
            this.saveConfig(config);
        }
    }

    private normalizeConfig(raw: OpenCodeCopilotAuthConfig): { config: OpenCodeCopilotAuthConfig; changed: boolean } {
        let changed = false;

        const config: OpenCodeCopilotAuthConfig = {
            ...raw,
            credentials: Array.isArray(raw.credentials) ? [...raw.credentials] : [],
            activeByProvider: raw.activeByProvider && typeof raw.activeByProvider === 'object'
                ? { ...raw.activeByProvider }
                : {},
            ohMyProfiles: Array.isArray(raw.ohMyProfiles) ? [...raw.ohMyProfiles] : [],
            managedSessions: Array.isArray(raw.managedSessions) ? [...raw.managedSessions] : []
        };

        if (!Array.isArray(raw.credentials)) {
            changed = true;
        }
        if (!raw.activeByProvider || typeof raw.activeByProvider !== 'object') {
            changed = true;
        }
        if (!Array.isArray(raw.ohMyProfiles)) {
            changed = true;
        }
        if (!Array.isArray(raw.managedSessions)) {
            changed = true;
        }

        config.credentials = config.credentials.map((cred) => {
            const provider = typeof cred.provider === 'string' && cred.provider.trim()
                ? cred.provider.trim()
                : DEFAULT_PROVIDER;

            const migrated: CopilotCredential = {
                ...cred,
                provider,
                name: cred.name || `${provider}-${new Date().toISOString().replace(/[:.]/g, '-')}`,
                type: cred.type || 'oauth',
                access: cred.access || '',
                refresh: cred.refresh || '',
                expires: typeof cred.expires === 'number' ? cred.expires : 0
            };

            if (migrated.provider !== cred.provider) {
                changed = true;
            }
            if (!cred.id) {
                migrated.id = randomUUID();
                changed = true;
            }

            return migrated;
        });

        // Legacy activeId migration to provider map.
        if (config.activeId) {
            const active = config.credentials.find((cred) => cred.id === config.activeId);
            if (active && !config.activeByProvider?.[active.provider]) {
                config.activeByProvider = config.activeByProvider || {};
                config.activeByProvider[active.provider] = active.id;
                changed = true;
            }
        }

        if (config.lastSwitchedId) {
            const last = config.credentials.find((cred) => cred.id === config.lastSwitchedId);
            if (last && !config.activeByProvider?.[last.provider]) {
                config.activeByProvider = config.activeByProvider || {};
                config.activeByProvider[last.provider] = last.id;
                changed = true;
            }
        }

        const managedSessions = config.managedSessions || [];
        config.managedSessions = managedSessions.map((session) => {
            const status = session.status || 'unknown';
            if (status !== session.status) {
                changed = true;
            }
            return {
                ...session,
                status,
                command: session.command || 'opencode --port 0',
                startedAt: session.startedAt || Date.now(),
                terminalName: session.terminalName || `opencode-${session.id}`
            };
        });

        return { config, changed };
    }

    getCredentials(): CopilotCredential[] {
        return this.getConfig().credentials;
    }

    getProviders(): string[] {
        return [...new Set(this.getCredentials().map((cred) => cred.provider))].sort();
    }

    getCredentialsByProvider(provider: string): CopilotCredential[] {
        return this.getCredentials().filter((cred) => cred.provider === provider);
    }

    getCredentialById(id: string): CopilotCredential | undefined {
        return this.getCredentials().find((cred) => cred.id === id);
    }

    addCredential(
        name: string,
        provider: string,
        type: string,
        access: string,
        refresh: string,
        expires: number,
        raw?: Record<string, unknown>
    ): CopilotCredential {
        const config = this.getConfig();
        const credential: CopilotCredential = {
            id: randomUUID(),
            name,
            provider: provider || DEFAULT_PROVIDER,
            type,
            access,
            refresh,
            expires,
            raw,
            lastImportedAt: Date.now()
        };
        config.credentials = [...config.credentials, credential];
        this.saveConfig(config);
        return credential;
    }

    upsertCredentialByProviderRefresh(input: UpsertCredentialInput): CopilotCredential {
        const config = this.getConfig();
        const provider = input.provider || DEFAULT_PROVIDER;
        const existing = config.credentials.find((cred) => cred.provider === provider && cred.refresh === input.refresh);

        if (existing) {
            existing.type = input.type;
            existing.access = input.access;
            existing.refresh = input.refresh;
            existing.expires = input.expires;
            existing.raw = input.raw;
            existing.lastImportedAt = Date.now();
            this.saveConfig(config);
            return existing;
        }

        const name = input.name || buildDefaultImportedName(provider);
        const created: CopilotCredential = {
            id: randomUUID(),
            name,
            provider,
            type: input.type,
            access: input.access,
            refresh: input.refresh,
            expires: input.expires,
            raw: input.raw,
            lastImportedAt: Date.now()
        };
        config.credentials.push(created);
        this.saveConfig(config);
        return created;
    }

    removeCredential(id: string): boolean {
        const config = this.getConfig();
        const target = config.credentials.find((cred) => cred.id === id);
        const next = config.credentials.filter((cred) => cred.id !== id);
        if (next.length === config.credentials.length) {
            return false;
        }

        config.credentials = next;
        if (config.activeId === id) {
            delete config.activeId;
        }
        if (config.lastSwitchedId === id) {
            delete config.lastSwitchedId;
        }

        if (target?.provider && config.activeByProvider?.[target.provider] === id) {
            delete config.activeByProvider[target.provider];
        }

        this.saveConfig(config);
        return true;
    }

    renameCredential(id: string, name: string): boolean {
        const config = this.getConfig();
        const target = config.credentials.find((cred) => cred.id === id);
        if (!target) {
            return false;
        }
        target.name = name;
        this.saveConfig(config);
        return true;
    }

    setActiveByProvider(provider: string, credentialId: string): void {
        const config = this.getConfig();
        config.activeByProvider = config.activeByProvider || {};
        config.activeByProvider[provider] = credentialId;
        config.activeId = credentialId;
        this.saveConfig(config);
    }

    clearActiveByProvider(provider: string): void {
        const config = this.getConfig();
        if (config.activeByProvider && Object.prototype.hasOwnProperty.call(config.activeByProvider, provider)) {
            delete config.activeByProvider[provider];
        }
        if (config.activeId) {
            const active = config.credentials.find((item) => item.id === config.activeId);
            if (active?.provider === provider) {
                delete config.activeId;
            }
        }
        if (config.lastSwitchedId) {
            const lastSwitched = config.credentials.find((item) => item.id === config.lastSwitchedId);
            if (lastSwitched?.provider === provider) {
                delete config.lastSwitchedId;
                delete config.lastSwitchedAt;
            }
        }
        this.saveConfig(config);
    }

    clearAllActiveByProvider(): void {
        const config = this.getConfig();
        config.activeByProvider = {};
        delete config.activeId;
        delete config.lastSwitchedId;
        delete config.lastSwitchedAt;
        this.saveConfig(config);
    }

    getActiveByProvider(provider: string): string | undefined {
        const config = this.getConfig();
        return config.activeByProvider?.[provider];
    }

    getActiveByProviderMap(): Record<string, string> {
        const config = this.getConfig();
        return { ...(config.activeByProvider || {}) };
    }

    setActiveId(id: string): void {
        const config = this.getConfig();
        config.activeId = id;
        const credential = config.credentials.find((item) => item.id === id);
        if (credential) {
            config.activeByProvider = config.activeByProvider || {};
            config.activeByProvider[credential.provider] = id;
        }
        this.saveConfig(config);
    }

    getActiveId(): string | undefined {
        const config = this.getConfig();
        if (config.activeId) {
            return config.activeId;
        }
        const providers = Object.keys(config.activeByProvider || {});
        if (providers.length > 0) {
            return config.activeByProvider?.[providers[0]];
        }
        return undefined;
    }

    getLastSwitchedId(): string | undefined {
        return this.getConfig().lastSwitchedId;
    }

    getLastSwitchedAt(): number | undefined {
        return this.getConfig().lastSwitchedAt;
    }

    setLastSwitched(id: string): void {
        const config = this.getConfig();
        config.lastSwitchedId = id;
        config.lastSwitchedAt = Date.now();

        const target = config.credentials.find((cred) => cred.id === id);
        if (target) {
            target.lastUsedAt = config.lastSwitchedAt;
            config.activeByProvider = config.activeByProvider || {};
            config.activeByProvider[target.provider] = target.id;
            config.activeId = target.id;
        }

        this.saveConfig(config);
    }

    getOhMyProfiles(): OhMyProfile[] {
        return this.getConfig().ohMyProfiles || [];
    }

    getOhMyProfileById(id: string): OhMyProfile | undefined {
        return this.getOhMyProfiles().find((profile) => profile.id === id);
    }

    saveOhMyProfile(profile: OhMyProfile): void {
        const config = this.getConfig();
        const index = (config.ohMyProfiles || []).findIndex((item) => item.id === profile.id);
        if (index >= 0) {
            config.ohMyProfiles![index] = profile;
        } else {
            config.ohMyProfiles = [...(config.ohMyProfiles || []), profile];
        }
        this.saveConfig(config);
    }

    setActiveOhMyProfile(id: string): void {
        const config = this.getConfig();
        config.activeOhMyProfileId = id;
        this.saveConfig(config);
    }

    getActiveOhMyProfileId(): string | undefined {
        return this.getConfig().activeOhMyProfileId;
    }

    markOhMyProfileApplied(id: string): void {
        const config = this.getConfig();
        const profile = (config.ohMyProfiles || []).find((item) => item.id === id);
        if (!profile) {
            return;
        }
        profile.lastAppliedAt = Date.now();
        config.activeOhMyProfileId = id;
        this.saveConfig(config);
    }

    getManagedSessions(): ManagedOpencodeSession[] {
        return this.getConfig().managedSessions || [];
    }

    upsertManagedSession(session: ManagedOpencodeSession): void {
        const config = this.getConfig();
        const sessions = config.managedSessions || [];
        const index = sessions.findIndex((item) => item.id === session.id);
        if (index >= 0) {
            sessions[index] = session;
        } else {
            sessions.push(session);
        }
        config.managedSessions = sessions;
        this.saveConfig(config);
    }

    removeManagedSession(id: string): void {
        const config = this.getConfig();
        config.managedSessions = (config.managedSessions || []).filter((session) => session.id !== id);
        this.saveConfig(config);
    }

    removeManagedSessionsByTerminalName(terminalName: string): void {
        if (!terminalName) {
            return;
        }
        const config = this.getConfig();
        config.managedSessions = (config.managedSessions || []).filter((session) => session.terminalName !== terminalName);
        this.saveConfig(config);
    }

    setManagedSessions(sessions: ManagedOpencodeSession[]): void {
        const config = this.getConfig();
        config.managedSessions = [...sessions];
        this.saveConfig(config);
    }
}

function buildDefaultImportedName(provider: string): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${provider}-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}
