export interface InstanceConfig {
    dirName: string;
    description: string;
    vscodeArgs: string[];
    defaultProject?: string;
}

export interface LauncherConfig {
    instances: Record<string, InstanceConfig>;
}
