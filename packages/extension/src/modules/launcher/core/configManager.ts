import * as path from 'path';
import { LauncherConfig } from '../../../common/types';
import { BaseConfigManager } from '../../../common/baseConfigManager';
import { ensureDir } from '../../../common/paths';

export class ConfigManager extends BaseConfigManager<LauncherConfig> {

    constructor() {
        super();
        this.ensureInit();
    }

    protected getModuleName(): string {
        return 'vscodemultilauncher';
    }

    protected getDefaultConfig(): LauncherConfig {
        return {
            instances: {}
        };
    }

    protected initializeDirectories(): void {
        ensureDir(path.join(this.rootDir, 'userdata'));
        ensureDir(path.join(this.rootDir, 'shareExtensions'));
    }

    public getInstancePath(dirName: string): string {
        return path.join(this.rootDir, 'userdata', dirName);
    }

    public ensureInstanceDir(dirName: string): string {
        const instanceDir = this.getInstancePath(dirName);
        ensureDir(instanceDir);
        return instanceDir;
    }
    
    public getSharedExtensionsDir(): string {
        return path.join(this.rootDir, 'shareExtensions');
    }

    public setLastUsed(key: string): void {
        const config = this.getConfig();
        config.lastUsedKey = key;
        config.lastUsedAt = Date.now();
        this.saveConfig(config);
    }

    public getLastUsedKey(): string | undefined {
        return this.getConfig().lastUsedKey;
    }

    public getLastUsedAt(): number | undefined {
        return this.getConfig().lastUsedAt;
    }
}
