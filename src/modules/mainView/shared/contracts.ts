/**
 * Shared contracts for the MainView extension host and webview app.
 * Keep UI payloads and message envelopes in one place so both sides stay in sync.
 */

// ==================== Navigation ====================

export type SectionId =
    | 'dashboard'
    | 'accountCenter'
    | 'launcher'
    | 'skills'
    | 'commands'
    | 'gitshare'
    | 'settings'
    | 'opencodeAuth';

export type VisibleSectionId =
    | 'dashboard'
    | 'accountCenter'
    | 'skills'
    | 'commands'
    | 'gitshare'
    | 'settings';

export interface NavigationItem {
    id: VisibleSectionId;
    label: string;
    iconId: string;
    description?: string;
}

// ==================== Shared UI building blocks ====================

export interface TreeNode {
    id: string;
    label: string;
    description?: string;
    subtitle?: string;
    badges?: string[];
    tertiary?: string;
    layout?: 'default' | 'twoLine' | 'threeLine';
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
    disabled?: boolean;
}

export interface ToolbarAction {
    id: string;
    label: string;
    iconId: string;
    command: string;
    action?: 'command' | 'overlay';
}

export interface CardFileNode {
    id: string;
    name: string;
    isDirectory: boolean;
    children?: CardFileNode[];
}

export interface CardAction {
    id: string;
    label: string;
    iconId?: string;
    danger?: boolean;
}

export interface CardItem {
    id: string;
    name: string;
    description: string;
    badges?: string[];
    iconId?: string;
    primaryFilePath?: string;
    fileTree?: CardFileNode[];
    actions?: CardAction[];
}

export type OverlayFieldKind = 'text' | 'select' | 'textarea' | 'multi-select' | 'multi-select-dropdown' | 'tags';

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

export type SettingsFieldKind = 'text' | 'select' | 'textarea';
export type SettingsScope = 'vscode' | 'git' | 'skills' | 'commands';

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
    action?: SettingsFieldAction;
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

export interface AiTaggingProgressItem {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    tags?: string[];
    error?: string;
}

export interface AiTaggingProgressData {
    target: 'skills' | 'commands';
    running: boolean;
    total: number;
    completed: number;
    percent: number;
    items: AiTaggingProgressItem[];
}

// ==================== Dashboard ====================

export interface DashboardData {
    stats: DashboardStat[];
    quickActions: QuickAction[];
    moduleHealth?: ModuleHealthItem[];
    gitInfo?: DashboardGitInfo;
    workspaceInfo?: DashboardWorkspaceInfo;
    launcher?: DashboardLauncherInfo;
    opencode?: DashboardOpenCodeInfo;
    activity?: DashboardActivityItem[];
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

export interface DashboardLabels {
    moduleHealth: string;
    gitInfo: string;
    quickActions: string;
    viewDetail: string;
    gitSync: string;
    gitPull: string;
    gitPush: string;
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
    targetSection?: SectionId;
}

export interface QuickAction {
    id: string;
    label: string;
    iconId: string;
    command?: string;
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

export interface DashboardWorkspaceInfo {
    workspaceName: string;
}

// ==================== Account Center ====================

export type AccountCenterTabId = 'launcher' | 'auth' | 'ohmy' | 'sessions';

export interface AccountCenterDashboard {
    providerCount: number;
    activeProviders: string[];
    activeOhMyName?: string;
    activeOhMyHash?: string;
    modelCount: number;
    models: string[];
}

export interface AccountCenterLabels {
    dashboardProviders: string;
    dashboardActiveProviders: string;
    dashboardActiveOhMy: string;
    dashboardModels: string;
    dashboardModelsMeaningTitle: string;
    dashboardModelsMeaningDesc: string;
    emptyData: string;
    groupGithub: string;
    groupOpenCode: string;
    toolbarRefresh: string;
    toolbarOpenConfig: string;
    toolbarActions: string;
    authZeroConfig: string;
    sourceManaged: string;
    sourceExternal: string;
}

export interface AccountCenterTabMeta {
    id: AccountCenterTabId;
    label: string;
    count: number;
    domain: 'github' | 'opencode';
}

export interface AccountCenterRowAction {
    id: string;
    label: string;
    iconId?: string;
    danger?: boolean;
    disabled?: boolean;
}

export interface AccountCenterMetaItem {
    label: string;
    value: string;
    mono?: boolean;
    full?: boolean;
}

export interface AccountCenterRow {
    id: string;
    name: string;
    description: string;
    subtitle?: string;
    metaLines?: string[];
    metaItems?: AccountCenterMetaItem[];
    badges?: string[];
    status?: 'running' | 'stopped' | 'active' | 'inactive';
    domain?: 'github' | 'opencode';
    source?: 'managed' | 'external' | 'internal';
    launchMode?: 'externalTerminal';
    pid?: number;
    actions: AccountCenterRowAction[];
}

export interface AccountCenterTabData {
    id: AccountCenterTabId;
    emptyText: string;
    rows: AccountCenterRow[];
}

export interface AccountCenterData {
    title: string;
    activeTab: AccountCenterTabId;
    tabs: AccountCenterTabMeta[];
    dashboard: AccountCenterDashboard;
    labels: AccountCenterLabels;
    sections: Record<AccountCenterTabId, AccountCenterTabData>;
    toolbar: ToolbarAction[];
}

// ==================== Section view models ====================

export interface BaseSectionViewModel {
    section: SectionId;
    title: string;
    subtitle?: string;
    toolbar?: ToolbarAction[];
}

export interface DashboardViewModel extends BaseSectionViewModel {
    section: 'dashboard';
    data: DashboardData;
}

export interface AccountCenterViewModel extends BaseSectionViewModel {
    section: 'accountCenter';
    data: AccountCenterData;
}

export interface LauncherViewModel extends BaseSectionViewModel {
    section: 'launcher';
    tree: TreeNode[];
}

export interface SkillsViewModel extends BaseSectionViewModel {
    section: 'skills';
    tree: TreeNode[];
    cards: CardItem[];
    tags: string[];
    activeTags: string[];
}

export interface CommandsViewModel extends BaseSectionViewModel {
    section: 'commands';
    tree: TreeNode[];
    cards: CardItem[];
    tags: string[];
    activeTags: string[];
}

export interface GitShareViewModel extends BaseSectionViewModel {
    section: 'gitshare';
    tree: TreeNode[];
}

export interface OpenCodeAuthViewModel extends BaseSectionViewModel {
    section: 'opencodeAuth';
    tree: TreeNode[];
    cards: CardItem[];
}

export interface SettingsViewModel extends BaseSectionViewModel {
    section: 'settings';
    data: SettingsData;
}

export type SectionViewModel =
    | DashboardViewModel
    | AccountCenterViewModel
    | LauncherViewModel
    | SkillsViewModel
    | CommandsViewModel
    | GitShareViewModel
    | OpenCodeAuthViewModel
    | SettingsViewModel;

// ==================== App shell state ====================

export interface BootstrapPayload {
    brandName: string;
    brandTagline: string;
    locale: 'en' | 'zh-cn';
    instanceKey: string;
    navItems: NavigationItem[];
    initialSection: VisibleSectionId;
}

export interface AppStatePayload {
    activeSection: VisibleSectionId;
    accountCenterTab?: AccountCenterTabId;
}

export interface NotificationPayload {
    message: string;
    level: 'info' | 'warn' | 'error';
}

// ==================== Messaging ====================

export type SectionActionPayload =
    | { kind: 'toolbar'; actionId: string }
    | { kind: 'treeItemClick'; nodeId: string }
    | { kind: 'treeItemAction'; nodeId: string; actionId: string }
    | { kind: 'cardClick'; cardId: string }
    | { kind: 'cardAction'; cardId: string; actionId: string }
    | { kind: 'cardFileClick'; cardId: string; filePath: string }
    | { kind: 'filterKeyword'; keyword: string }
    | { kind: 'filterTags'; tags: string[] }
    | { kind: 'clearFilter' }
    | { kind: 'toggleTag'; tag: string }
    | { kind: 'dropFiles'; uris: string[] }
    | { kind: 'dropEmpty' }
    | { kind: 'accountTabChange'; tab: AccountCenterTabId }
    | { kind: 'accountAction'; tab: AccountCenterTabId; actionId: string; rowId?: string }
    | { kind: 'quickAction'; actionId: string; targetSection: SectionId }
    | { kind: 'executeCommand'; command: string; args?: string }
    | { kind: 'settingsAction'; command: string };

export type WebviewMessage =
    | { type: 'appReady' }
    | { type: 'navigate'; section: SectionId }
    | { type: 'sectionAction'; section: SectionId; action: SectionActionPayload }
    | { type: 'overlaySubmit'; overlayId: string; values: Record<string, string> }
    | { type: 'overlayCancel'; overlayId: string }
    | { type: 'confirmResult'; confirmId: string; confirmed: boolean }
    | { type: 'settingChange'; scope: SettingsScope; key: string; value: string };

export type ExtensionMessage =
    | { type: 'bootstrap'; data: BootstrapPayload }
    | { type: 'sectionData'; section: SectionId; data: SectionViewModel }
    | { type: 'overlayState'; data: OverlayData | null }
    | { type: 'confirmState'; data: ConfirmData | null }
    | { type: 'progressState'; data: AiTaggingProgressData | null }
    | { type: 'notification'; data: NotificationPayload }
    | { type: 'appState'; data: AppStatePayload };
