import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LauncherConfig } from '../../../common/types';

export class ConfigManager {
    private configPath: string;
    private rootDir: string;

    constructor() {
        this.rootDir = path.join(os.homedir(), '.vscodemultilauncher');
        this.configPath = path.join(this.rootDir, 'config.json');
        this.ensureInit();
    }

    private ensureInit() {
        this.ensureDir(this.rootDir);
        this.ensureDir(path.join(this.rootDir, 'userdata'));
        this.ensureDir(path.join(this.rootDir, 'shareExtensions'));

        if (!fs.existsSync(this.configPath)) {
            const defaultConfig: LauncherConfig = {
                instances: {}
            };
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        }
    }

    private ensureDir(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    public getConfig(): LauncherConfig {
        try {
            const content = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to read config', error);
            return { instances: {} };
        }
    }

    public saveConfig(config: LauncherConfig): void {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    public getRootDir(): string {
        return this.rootDir;
    }
    
    public getConfigPath(): string {
        return this.configPath;
    }

    public getInstancePath(dirName: string): string {
        return path.join(this.rootDir, 'userdata', dirName);
    }

    public ensureInstanceDir(dirName: string): string {
        const instanceDir = this.getInstancePath(dirName);
        this.ensureDir(instanceDir);
        return instanceDir;
    }
    
    public getSharedExtensionsDir(): string {
        return path.join(this.rootDir, 'shareExtensions');
    }
}
