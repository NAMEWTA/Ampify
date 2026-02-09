/**
 * Webview ↔ Extension Host message protocol types.
 */

// ==================== Navigation Section ====================

export type SectionId = 'dashboard' | 'launcher' | 'skills' | 'commands' | 'gitshare' | 'modelProxy' | 'settings' | 'opencodeAuth';

// ==================== Generic Tree Node ====================

export interface TreeNode {
    id: string;
    label: string;
    description?: string;
    /** Second line text (used in twoLine layout) */
    subtitle?: string;
    /** Badge labels shown as small pills */
    badges?: string[];
    /** Layout mode: 'default' = single-line, 'twoLine' = name + subtitle */
    layout?: 'default' | 'twoLine';
    /** Mark an inline action as always visible (by action id) */
    pinnedActionId?: string;
    iconId?: string;
    iconColor?: string;
    collapsible?: boolean;
    expanded?: boolean;
    children?: TreeNode[];
    contextActions?: TreeAction[];
    inlineActions?: TreeAction[];
    command?: string;
    commandArgs?: string;
    nodeType?: string;
    tooltip?: string;
}

export interface TreeAction {
    id: string;
    label: string;
    iconId?: string;
    danger?: boolean;
}

// ==================== Dashboard ====================

export interface DashboardData {
    stats: DashboardStat[];
    quickActions: QuickAction[];
    moduleHealth: ModuleHealthItem[];
    gitInfo: DashboardGitInfo;
    proxyInfo: DashboardProxyInfo;
    workspaceInfo: DashboardWorkspaceInfo;
    recentLogs: ModelProxyLogInfo[];
    launcher?: DashboardLauncherInfo;
    opencode?: DashboardOpenCodeInfo;
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

export interface DashboardStat {
    label: string;
    value: number | string;
    iconId: string;
    color?: string;
    /** Click navigates to this section */
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
    viewLauncher: string;
    viewOpenCode: string;
}

// ==================== Toolbar ====================

export interface ToolbarAction {
    id: string;
    label: string;
    iconId: string;
    command: string;
    /** 'command' executes VS Code command; 'overlay' sends toolbarAction to open overlay */
    action?: 'command' | 'overlay';
}

// ==================== Overlay ====================

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
    /** Input right-side action button */
    action?: SettingsFieldAction;
    /** If true, field is displayed as read-only */
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

// ==================== Model Proxy ====================

export interface ModelProxyBindingInfo {
    id: string;
    maskedKey: string;
    fullKey: string;
    modelId: string;
    modelName: string;
    label: string;
    createdAt: number;
}

export interface ModelProxyDashboardData {
    running: boolean;
    port: number;
    bindAddress: string;
    baseUrl: string;
    bindings: ModelProxyBindingInfo[];
    todayRequests: number;
    todayTokens: number;
    todayErrors: number;
    avgLatencyMs: number;
    models: ModelProxyModelInfo[];
    recentLogs: ModelProxyLogInfo[];
    labels: ModelProxyLabels;
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

export interface LogFileInfo {
    year: string;
    month: string;
    day: string;
    date: string;
    fileSize: number;
    entryCount: number;
}

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

// ==================== RPC Protocol ====================

export interface RpcRequest {
    type: 'request';
    id: string;
    method: string;
    params?: unknown;
}

export interface RpcResponse {
    type: 'response';
    id: string;
    result?: unknown;
    error?: string;
}

export interface RpcEvent {
    type: 'event';
    event: string;
    data?: unknown;
}

// ==================== Webview → Extension Messages ====================

export type WebviewMessage =
    | RpcRequest
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

// ==================== Extension → Webview Messages ====================

export type ExtensionMessage =
    | RpcResponse
    | RpcEvent
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
