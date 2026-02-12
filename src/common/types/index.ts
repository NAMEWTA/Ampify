export interface InstanceConfig {
    dirName: string;
    description: string;
    vscodeArgs: string[];
    defaultProject?: string;
    lastUsedAt?: number;
}

export interface LauncherConfig {
    instances: Record<string, InstanceConfig>;
    lastUsedKey?: string;
    lastUsedAt?: number;
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

// ==================== Model Proxy Types ====================

/**
 * API Key 绑定记录：一个 Key 对应一个模型
 */
export interface ApiKeyBinding {
    /** 绑定记录 ID（8 位 hex） */
    id: string;
    /** API Key（amp-前缀 + 64 hex） */
    apiKey: string;
    /** 绑定的模型 ID */
    modelId: string;
    /** 用户定义的绑定别名 */
    label: string;
    /** 创建时间戳（ms） */
    createdAt: number;
}

/**
 * 认证结果
 */
export interface AuthResult {
    /** 是否验证通过 */
    valid: boolean;
    /** 匹配到的绑定记录 */
    binding?: ApiKeyBinding;
}

/**
 * Model Proxy 配置
 */
export interface ProxyConfig {
    /** HTTP 服务端口 */
    port: number;
    /** API Key 绑定列表（每个 Key 对应一个模型） */
    apiKeyBindings: ApiKeyBinding[];
    /** 是否启用代理 */
    enabled: boolean;
    /** 是否启用日志 */
    logEnabled: boolean;
    /** 绑定地址 */
    bindAddress: string;
}

/**
 * 代理运行状态
 */
export interface ProxyStatus {
    /** 是否正在运行 */
    running: boolean;
    /** 当前端口 */
    port: number;
    /** 完整 URL */
    url: string;
    /** 可用模型数 */
    modelCount: number;
    /** 当前活跃模型 */
    activeModel: string;
}

/**
 * 代理日志条目
 */
export interface ProxyLogEntry {
    /** ISO 时间戳 */
    timestamp: string;
    /** 请求 UUID */
    requestId: string;
    /** 请求格式 */
    format: 'openai' | 'anthropic';
    /** 使用的模型 */
    model: string;
    /** 输入 token 估算 */
    inputTokens: number;
    /** 输出 token 估算 */
    outputTokens: number;
    /** 请求耗时 ms */
    durationMs: number;
    /** 请求状态 */
    status: 'success' | 'error';
    /** 错误信息 */
    error?: string;
    /** 输入消息内容（完整记录） */
    inputContent?: string;
    /** 输出消息内容（完整记录） */
    outputContent?: string;
    /** 实例标识（Launcher key） */
    instanceKey?: string;
    /** 绑定记录 ID */
    bindingId?: string;
    /** 绑定别名 */
    bindingLabel?: string;
}

/**
 * 可用模型信息
 */
export interface AvailableModel {
    /** 模型 ID */
    id: string;
    /** 模型名称 */
    name: string;
    /** 提供商 */
    vendor: string;
    /** 模型族 */
    family: string;
    /** 版本 */
    version: string;
    /** 最大输入 tokens */
    maxInputTokens: number;
}

// ==================== OpenCode Copilot Auth Types ====================

export interface CopilotCredential {
    id: string;
    name: string;
    provider: string;
    type: string;
    access: string;
    refresh: string;
    expires: number;
    lastUsedAt?: number;
    lastImportedAt?: number;
    /**
     * Preserve provider-specific fields from auth.json (for example accountId).
     * These fields will be merged back when applying to auth.json.
     */
    raw?: Record<string, unknown>;
}

export type ManagedSessionStatus = 'running' | 'stopped' | 'unknown';

export interface ManagedOpencodeSession {
    id: string;
    terminalName: string;
    pid?: number;
    startedAt: number;
    command: string;
    status: ManagedSessionStatus;
    workspace?: string;
}

export interface OhMyProfile {
    id: string;
    name: string;
    content: string;
    contentHash: string;
    importedAt: number;
    lastAppliedAt?: number;
}

export interface OpenCodeCopilotAuthConfig {
    credentials: CopilotCredential[];
    activeByProvider?: Record<string, string>;
    ohMyProfiles?: OhMyProfile[];
    activeOhMyProfileId?: string;
    managedSessions?: ManagedOpencodeSession[];
    activeId?: string;
    lastSwitchedId?: string;
    lastSwitchedAt?: number;
}
