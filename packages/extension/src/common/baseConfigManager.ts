import * as fs from 'fs';
import * as path from 'path';
import { ensureDir, getModuleDir } from './paths';

export abstract class BaseConfigManager<TConfig> {
    protected readonly rootDir: string;
    protected readonly configPath: string;

    protected constructor() {
        this.rootDir = getModuleDir(this.getModuleName());
        this.configPath = path.join(this.rootDir, 'config.json');
    }

    protected abstract getModuleName(): string;
    protected abstract getDefaultConfig(): TConfig;

    protected initializeDirectories(): void {
        // For subclasses to override
    }

    public ensureInit(): void {
        ensureDir(this.rootDir);
        this.initializeDirectories();

        if (!fs.existsSync(this.configPath)) {
            const defaultConfig = this.getDefaultConfig();
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        }
    }

    public getConfig(): TConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(content) as TConfig;
        } catch (error) {
            console.error(`Failed to read config for ${this.getModuleName()}`, error);
            return this.getDefaultConfig();
        }
    }

    public saveConfig(config: TConfig): void {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    public getRootDir(): string {
        return this.rootDir;
    }

    public getConfigPath(): string {
        return this.configPath;
    }
}
