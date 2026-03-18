import * as fs from 'fs';
import * as path from 'path';
import { getGitShareModuleDir, ensureDir } from '../../../common/paths';
import { AgentsManagerConfig, LoadedAgent } from '../../../common/types';
import { parseAgentMd } from '../templates/agentMdTemplate';
import { updateFrontmatterTags } from '../../../common/frontmatter';
import { getDefaultInjectTargetValue, normalizeInjectTargetValue } from '../../../common/injectTarget';

export class AgentConfigManager {
    private static instance: AgentConfigManager;

    protected readonly configPath: string;
    protected readonly gitShareDir: string;
    private agentsDir: string;

    private constructor() {
        this.gitShareDir = getGitShareModuleDir(this.getModuleName());
        this.configPath = path.join(this.gitShareDir, 'config.json');
        this.agentsDir = path.join(this.gitShareDir, 'agents');
    }

    public static getInstance(): AgentConfigManager {
        if (!AgentConfigManager.instance) {
            AgentConfigManager.instance = new AgentConfigManager();
        }
        return AgentConfigManager.instance;
    }

    protected getModuleName(): string {
        return 'vscodeagentmanager';
    }

    protected getDefaultConfig(): AgentsManagerConfig {
        return {
            injectTarget: getDefaultInjectTargetValue('agents')
        };
    }

    public ensureInit(): void {
        ensureDir(this.gitShareDir);
        ensureDir(this.agentsDir);

        if (!fs.existsSync(this.configPath)) {
            fs.writeFileSync(this.configPath, JSON.stringify(this.getDefaultConfig(), null, 2), 'utf8');
        }
    }

    public getConfig(): AgentsManagerConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(content) as AgentsManagerConfig;
            const fallback = this.getDefaultConfig().injectTarget ?? getDefaultInjectTargetValue('agents');
            const normalized = normalizeInjectTargetValue(config.injectTarget ?? fallback, 'agents');
            if (normalized !== config.injectTarget) {
                config.injectTarget = normalized;
                this.saveConfig(config);
            }
            return config;
        } catch (error) {
            console.error('Failed to read agents config', error);
            return this.getDefaultConfig();
        }
    }

    public saveConfig(config: AgentsManagerConfig): void {
        config.injectTarget = normalizeInjectTargetValue(config.injectTarget, 'agents');
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    public updateAgentTags(agentPath: string, tags: string[]): boolean {
        if (!fs.existsSync(agentPath)) {
            return false;
        }
        const content = fs.readFileSync(agentPath, 'utf8');
        const updated = updateFrontmatterTags(content, tags);
        if (!updated) {
            return false;
        }
        fs.writeFileSync(agentPath, updated, 'utf8');
        return true;
    }

    public getGitShareDir(): string {
        return this.gitShareDir;
    }

    public getConfigPath(): string {
        return this.configPath;
    }

    public getAgentsDir(): string {
        return this.agentsDir;
    }

    public getAgentRelativePath(agentName: string): string {
        return `${this.getModuleName()}/agents/${agentName}.md`;
    }

    public loadAllAgents(): LoadedAgent[] {
        const agents: LoadedAgent[] = [];

        if (!fs.existsSync(this.agentsDir)) {
            return agents;
        }

        const files = fs.readdirSync(this.agentsDir);
        for (const file of files) {
            if (!file.endsWith('.md')) {
                continue;
            }

            const filePath = path.join(this.agentsDir, file);
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
                continue;
            }

            const agent = this.loadAgentFromFile(filePath);
            if (agent) {
                agents.push(agent);
            }
        }

        return agents.sort((a, b) => a.meta.agent.localeCompare(b.meta.agent));
    }

    public loadAgentFromFile(filePath: string): LoadedAgent | null {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const { meta, body } = parseAgentMd(content);

            if (!meta) {
                return null;
            }

            const fileName = path.basename(filePath, '.md');
            if (fileName !== meta.agent) {
                console.warn(`Agent file name mismatch: ${fileName} vs ${meta.agent}`);
                return null;
            }

            return {
                fileName,
                path: filePath,
                meta,
                content: body
            };
        } catch (error) {
            console.error(`Failed to load agent from ${filePath}`, error);
            return null;
        }
    }

    public getAgent(agentName: string): LoadedAgent | null {
        const filePath = path.join(this.agentsDir, `${agentName}.md`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return this.loadAgentFromFile(filePath);
    }

    public saveAgentMd(agentName: string, content: string): void {
        const filePath = path.join(this.agentsDir, `${agentName}.md`);
        fs.writeFileSync(filePath, content, 'utf8');
    }

    public deleteAgent(agentName: string): boolean {
        const filePath = path.join(this.agentsDir, `${agentName}.md`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }

    public agentExists(agentName: string): boolean {
        const filePath = path.join(this.agentsDir, `${agentName}.md`);
        return fs.existsSync(filePath);
    }

    public getAllTags(): string[] {
        const agents = this.loadAllAgents();
        const tagSet = new Set<string>();

        for (const agent of agents) {
            if (agent.meta.tags) {
                agent.meta.tags.forEach(tag => tagSet.add(tag));
            }
        }

        return Array.from(tagSet).sort();
    }

    public static validateAgentName(name: string): boolean {
        const pattern = /^[a-z0-9-]+$/;
        return pattern.test(name) && name.length <= 64 && name.length > 0;
    }
}
