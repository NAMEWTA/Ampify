/**
 * Webview ↔ Extension Host 消息协议
 * 统一定义所有双向通信的消息类型
 */

// ==================== 导航 Section ====================

export type SectionId = 'dashboard' | 'launcher' | 'skills' | 'commands' | 'gitshare' | 'modelProxy' | 'settings' | 'opencodeAuth';

// ==================== 通用树节点 ====================

export interface TreeNode {
    /** 唯一标识 */
    id: string;
    /** 显示标签 */
    label: string;
    /** 描述文本（显示在标签右侧） */
    description?: string;
    /** 第二行文本（twoLine 布局） */
    subtitle?: string;
    /** 徽标（标签） */
    badges?: string[];
    /** 第三行文本（threeLine 布局） */
    tertiary?: string;
    /** 布局模式 */
    layout?: 'default' | 'twoLine' | 'threeLine';
    /** 固定显示的行内操作 */
    pinnedActionId?: string;
    /** Codicon 图标 ID，如 'account', 'extensions' */
    iconId?: string;
    /** 图标颜色 CSS（通过 ThemeColor name 或 hex） */
    iconColor?: string;
    /** 是否可折叠 */
    collapsible?: boolean;
    /** 默认展开 */
    expanded?: boolean;
    /** 子节点 */
    children?: TreeNode[];
    /** 右键上下文操作 */
    contextActions?: TreeAction[];
    /** 行内操作按钮（显示在右侧） */
    inlineActions?: TreeAction[];
    /** 点击触发的命令 */
    command?: string;
    /** 命令参数（JSON 序列化） */
    commandArgs?: string;
    /** 节点类型标识 */
    nodeType?: string;
    /** tooltip 文本 */
    tooltip?: string;
}

export interface TreeAction {
    /** 操作 ID */
    id: string;
    /** 显示标签 */
    label: string;
    /** Codicon 图标 ID */
    iconId?: string;
    /** 是否为危险操作（红色显示） */
    danger?: boolean;
}

// ==================== 仪表盘数据 ====================

export interface DashboardData {
    stats: DashboardStat[];
    quickActions: QuickAction[];
    moduleHealth?: ModuleHealthItem[];
    gitInfo?: DashboardGitInfo;
    proxyInfo?: DashboardProxyInfo;
    workspaceInfo?: DashboardWorkspaceInfo;
    recentLogs?: ModelProxyLogInfo[];
    launcher?: DashboardLauncherInfo;
    opencode?: DashboardOpenCodeInfo;
    activity?: DashboardActivityItem[];
    modelProxy?: DashboardModelProxyInfo;
    labels: DashboardLabels;
}

export interface DashboardLauncherInfo {
    total: number;
    lastKey?: string;
    lastLabel?: string;
    lastAt?: number;
    nextKey?: string;
    nextLabel?: string;
}

export interface DashboardOpenCodeInfo {
    total: number;
    lastId?: string;
    lastLabel?: string;
    lastAt?: number;
    nextId?: string;
    nextLabel?: string;
}

export type DashboardActivityType = 'skill' | 'command';

export interface DashboardActivityItem {
    id: string;
    type: DashboardActivityType;
    label: string;
    description?: string;
    timestamp: number;
}

export interface DashboardModelProxyInfo {
    running: boolean;
    baseUrl?: string;
    lastError?: string;
    lastErrorAt?: number;
}

export interface DashboardLabels {
    moduleHealth: string;
    gitInfo: string;
    proxyPanel: string;
    proxyRunning: string;
    quickActions: string;
    viewDetail: string;
    copyBaseUrl: string;
    gitSync: string;
    gitPull: string;
    gitPush: string;
    recentLogs: string;
    viewAllLogs: string;
    noLogs: string;
    logTime: string;
    nextUp: string;
    launcher: string;
    opencode: string;
    switchNow: string;
    lastSwitched: string;
    nextAccount: string;
    activeAccount: string;
}

export interface DashboardStat {
    label: string;
    value: number | string;
    iconId: string;
    color?: string;
    /** 点击跳转到的 Section */
    targetSection?: SectionId;
}

export interface QuickAction {
    id: string;
    label: string;
    iconId: string;
    command?: string;
    /** 'command' executes VS Code command; 'toolbar' routes to toolbar action */
    action?: 'command' | 'toolbar';
    section?: SectionId;
    actionId?: string;
}

export type ModuleHealthStatus = 'active' | 'inactive' | 'warning' | 'error';

export interface ModuleHealthItem {
    moduleId: SectionId;
    label: string;
    status: ModuleHealthStatus;
    detail: string;
    iconId: string;
    color: string;
}

export interface DashboardGitInfo {
    initialized: boolean;
    branch: string;
    remoteUrl: string;
    hasRemote: boolean;
    unpushedCount: number;
    hasChanges: boolean;
    changedFileCount: number;
}

export interface DashboardProxyInfo {
    running: boolean;
    port: number;
    baseUrl: string;
    todayRequests: number;
    todayTokens: number;
    todayErrors: number;
    avgLatencyMs: number;
    bindingCount: number;
}

export interface DashboardWorkspaceInfo {
    workspaceName: string;
}

// ==================== 工具栏操作 ====================

export interface ToolbarAction {
    id: string;
    label: string;
    iconId: string;
    command: string;
    /** 'command' executes VS Code command; 'overlay' sends toolbarAction to open overlay */
    action?: 'command' | 'overlay';
}

// ==================== Overlay Panel ====================

export type OverlayFieldKind = 'text' | 'select' | 'textarea' | 'multi-select' | 'tags';

export interface OverlayField {
    key: string;
    label: string;
    kind: OverlayFieldKind;
    value?: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
    description?: string;
}

export interface OverlayData {
    overlayId: string;
    title: string;
    fields: OverlayField[];
    submitLabel: string;
    cancelLabel: string;
}

export interface ConfirmData {
    confirmId: string;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    danger?: boolean;
}

// ==================== Settings ====================

export type SettingsFieldKind = 'text' | 'select' | 'textarea';
export type SettingsScope = 'vscode' | 'git';

// ==================== Model Proxy Dashboard ====================

export interface ModelProxyDashboardData {
    /** 是否运行中 */
    running: boolean;
    /** 端口号 */
    port: number;
    /** 绑定地址 */
    bindAddress: string;
    /** 完整 Base URL */
    baseUrl: string;
    /** API Key 绑定列表 */
    bindings: ModelProxyBindingInfo[];
    /** 今日请求数 */
    todayRequests: number;
    /** 今日 Token 数 */
    todayTokens: number;
    /** 今日错误数 */
    todayErrors: number;
    /** 平均延迟 ms */
    avgLatencyMs: number;
    /** 可用模型列表 */
    models: ModelProxyModelInfo[];
    /** 最近日志 */
    recentLogs: ModelProxyLogInfo[];
    /** i18n 标签 */
    labels: ModelProxyLabels;
}

/** API Key 绑定信息（传递给 Webview） */
export interface ModelProxyBindingInfo {
    id: string;
    maskedKey: string;
    fullKey: string;
    modelId: string;
    modelName: string;
    label: string;
    createdAt: number;
}

export interface ModelProxyLabels {
    statusRunning: string;
    statusStopped: string;
    offline: string;
    requests: string;
    tokens: string;
    errorRate: string;
    avgLatency: string;
    connection: string;
    baseUrl: string;
    apiKey: string;
    copy: string;
    regenerate: string;
    bindings?: string;
    availableModels: string;
    noModels: string;
    addBinding: string;
    removeBinding: string;
    noBindings: string;
    recentLogs: string;
    tokensMax: string;
    openLogsFolder: string;
    logDetailTitle: string;
    logInput: string;
    logOutput: string;
    logError: string;
    logRequestId: string;
    logDuration: string;
    logClose: string;
    viewAllLogs: string;
    logViewerTitle: string;
    logYear: string;
    logMonth: string;
    logDay: string;
    logAll: string;
    logSuccess: string;
    logErrors: string;
    logSearchPlaceholder: string;
    logSelectDate: string;
    logNoResults: string;
    logTotalEntries: string;
    logTime: string;
    noLogs: string;
}

export interface ModelProxyModelInfo {
    id: string;
    name: string;
    vendor: string;
    family: string;
    maxInputTokens: number;
}

export interface ModelProxyLogInfo {
    timestamp: string;
    requestId: string;
    format: string;
    model: string;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    status: string;
    error?: string;
    inputContent?: string;
    outputContent?: string;
}

/** 日志文件信息（按日期） */
export interface LogFileInfo {
    year: string;
    month: string;
    day: string;
    /** YYYY-MM-DD */
    date: string;
    fileSize: number;
    entryCount: number;
}

/** 日志查询结果 */
export interface LogQueryResult {
    entries: ModelProxyLogInfo[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ==================== Card Item (Skills / Commands grid view) ====================

export interface CardFileNode {
    /** Unique id (absolute path for files) */
    id: string;
    /** Display name */
    name: string;
    /** Is this a directory? */
    isDirectory: boolean;
    /** Children (for directories) */
    children?: CardFileNode[];
}

export interface CardAction {
    id: string;
    label: string;
    iconId?: string;
    danger?: boolean;
}

export interface CardItem {
    /** Unique id, e.g. "skill-my-skill" or "cmd-build-project" */
    id: string;
    /** Display name */
    name: string;
    /** Description text */
    description: string;
    /** Tag badges */
    badges?: string[];
    /** Icon codicon id */
    iconId?: string;
    /** Primary file to open on click (e.g. SKILL.md path) */
    primaryFilePath?: string;
    /** File tree for dialog (Skills only, Commands are single files) */
    fileTree?: CardFileNode[];
    /** Action buttons */
    actions?: CardAction[];
}

export interface SettingsOption {
    label: string;
    value: string;
}

export interface SettingsFieldAction {
    label: string;
    iconId?: string;
    command: string;
}

export interface SettingsField {
    key: string;
    label: string;
    value: string;
    kind: SettingsFieldKind;
    scope: SettingsScope;
    description?: string;
    placeholder?: string;
    options?: SettingsOption[];
    /** 输入框右侧的操作按钮 */
    action?: SettingsFieldAction;
    /** 只读显示 */
    readOnly?: boolean;
}

export interface SettingsSection {
    id: string;
    title: string;
    fields: SettingsField[];
}

export interface SettingsData {
    sections: SettingsSection[];
}

// ==================== Webview → Extension 消息 ====================

export type WebviewMessage =
    | { type: 'request'; id: string; method: string; params?: unknown }
    | { type: 'switchSection'; section: SectionId }
    | { type: 'executeCommand'; command: string; args?: string }
    | { type: 'treeItemClick'; nodeId: string; section: SectionId }
    | { type: 'treeItemAction'; nodeId: string; actionId: string; section: SectionId }
    | { type: 'toolbarAction'; actionId: string; section: SectionId }
    | { type: 'toggleNav' }
    | { type: 'ready' }
    | { type: 'dropFiles'; uris: string[]; section: SectionId }
    | { type: 'dropEmpty'; section: SectionId }
    | { type: 'changeSetting'; key: string; value: string; scope: SettingsScope }
    | { type: 'settingsAction'; command: string }
    | { type: 'quickAction'; actionId: string; section: SectionId }
    | { type: 'overlaySubmit'; overlayId: string; values: Record<string, string> }
    | { type: 'overlayCancel'; overlayId: string }
    | { type: 'confirmResult'; confirmId: string; confirmed: boolean }
    | { type: 'filterByKeyword'; section: SectionId; keyword: string }
    | { type: 'filterByTags'; section: SectionId; tags: string[] }
    | { type: 'clearFilter'; section: SectionId }
    | { type: 'toggleTag'; section: SectionId; tag: string }
    | { type: 'selectProxyModel'; modelId: string }
    | { type: 'proxyAction'; actionId: string }
    | { type: 'addProxyBinding' }
    | { type: 'removeProxyBinding'; bindingId: string }
    | { type: 'copyProxyBindingKey'; bindingId: string }
    | { type: 'requestLogFiles' }
    | { type: 'queryLogs'; date: string; page: number; pageSize: number; statusFilter: 'all' | 'success' | 'error'; keyword?: string }
    | { type: 'cardClick'; section: SectionId; cardId: string }
    | { type: 'cardAction'; section: SectionId; cardId: string; actionId: string }
    | { type: 'cardFileClick'; section: SectionId; cardId: string; filePath: string };

// ==================== Extension → Webview 消息 ====================

export type ExtensionMessage =
    | { type: 'response'; id: string; result?: unknown; error?: string }
    | { type: 'event'; event: string; data?: unknown }
    | { type: 'updateSection'; section: SectionId; tree: TreeNode[]; toolbar: ToolbarAction[]; tags?: string[]; activeTags?: string[]; cards?: CardItem[] }
    | { type: 'updateDashboard'; data: DashboardData }
    | { type: 'setActiveSection'; section: SectionId }
    | { type: 'showNotification'; message: string; level: 'info' | 'warn' | 'error' }
    | { type: 'updateSettings'; data: SettingsData }
    | { type: 'showOverlay'; data: OverlayData }
    | { type: 'hideOverlay' }
    | { type: 'showConfirm'; data: ConfirmData }
    | { type: 'updateModelProxy'; data: ModelProxyDashboardData }
    | { type: 'updateLogFiles'; files: LogFileInfo[] }
    | { type: 'updateLogQuery'; result: LogQueryResult; date: string; statusFilter: string; keyword?: string };
