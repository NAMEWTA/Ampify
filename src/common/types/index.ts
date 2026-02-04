export interface InstanceConfig {
    dirName: string;
    description: string;
    vscodeArgs: string[];
    defaultProject?: string;
}

export interface LauncherConfig {
    instances: Record<string, InstanceConfig>;
}

// ==================== Skills Manager Types ====================

/**
 * 前置依赖类型
 */
export type PrerequisiteType = 'runtime' | 'tool' | 'extension' | 'manual';

/**
 * 前置依赖配置
 */
export interface Prerequisite {
    /** 依赖类型 */
    type: PrerequisiteType;
    /** 依赖名称，如 "Node.js 18+", "Python 3.10+" */
    name: string;
    /** 检测命令，如 "node -v" */
    checkCommand?: string;
    /** 安装提示，如 "brew install node" */
    installHint?: string;
}

/**
 * Skill 元数据 (SKILL.md frontmatter)
 */
export interface SkillMeta {
    /** Skill 名称，小写字母+连字符，≤64字符 */
    name: string;
    /** 简短描述，≤1024字符 */
    description: string;
    /** 标签列表 */
    tags?: string[];
    /** 限制可用工具 */
    allowedTools?: string[];
    /** 前置依赖列表 */
    prerequisites?: Prerequisite[];
    /** 相对路径（相对于 injectTarget） */
    relativePath?: string;
    /** 子 Skill 列表（层级结构） */
    children?: SkillMeta[];
}

/**
 * Git 配置
 */
export interface GitConfig {
    userName?: string;
    userEmail?: string;
    remoteUrl?: string;
    remoteUrls?: string[];
}

/**
 * Skills Manager 全局配置 (config.json)
 */
export interface SkillsManagerConfig {
    /** 默认注入目标目录 */
    injectTarget?: string;
}

/**
 * 加载的 Skill 完整信息
 */
export interface LoadedSkill {
    /** Skill 目录名 */
    dirName: string;
    /** Skill 目录完整路径 */
    path: string;
    /** SKILL.md frontmatter 元数据 */
    meta: SkillMeta;
    /** SKILL.md 是否存在 */
    hasSkillMd: boolean;
    /** SKILL.md 文件路径 */
    skillMdPath?: string;
    /** 相对路径（相对于 skills 根目录） */
    relativePath?: string;
    /** 子 Skill 列表（层级结构） */
    children?: LoadedSkill[];
}

/**
 * 过滤状态
 */
export interface FilterState {
    /** 搜索关键词 */
    keyword?: string;
    /** 选中的标签 */
    tags?: string[];
}

/**
 * Git 状态信息
 */
export interface GitStatus {
    /** 是否已初始化 */
    initialized: boolean;
    /** 是否配置了远程仓库 */
    hasRemote: boolean;
    /** 远程仓库 URL */
    remoteUrl?: string;
    /** 当前分支 */
    branch?: string;
    /** 是否有未暂存的更改 */
    hasUnstagedChanges: boolean;
    /** 是否有未提交的更改 */
    hasUncommittedChanges: boolean;
    /** 是否有未推送的提交 */
    unpushedCommitCount: number;
    /** 变更文件数 */
    changedFiles: number;
}

/**
 * Diff 文件信息
 */
export interface DiffFile {
    /** 文件相对路径 */
    path: string;
    /** 变更类型 */
    status: 'added' | 'modified' | 'deleted' | 'renamed';
}

// ==================== Commands Manager Types ====================

/**
 * Command 元数据 (MD frontmatter)
 */
export interface CommandMeta {
    /** 命令名称，小写字母+连字符，≤64字符 */
    command: string;
    /** 简短描述，≤1024字符 */
    description: string;
    /** 标签列表 */
    tags?: string[];
}

/**
 * Commands Manager 全局配置 (config.json)
 */
export interface CommandsManagerConfig {
    /** 默认注入目标目录 */
    injectTarget?: string;
}

/**
 * 加载的 Command 完整信息
 */
export interface LoadedCommand {
    /** 命令文件名（不含扩展名） */
    fileName: string;
    /** 命令文件完整路径 */
    path: string;
    /** MD frontmatter 元数据 */
    meta: CommandMeta;
    /** 命令正文内容 */
    content?: string;
}
