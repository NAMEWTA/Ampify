/**
 * Shared contracts for the MainView extension host and webview app.
 * Keep UI payloads and message envelopes in one place so both sides stay in sync.
 */

// ==================== Navigation ====================

export type SectionId =
    | 'dashboard'
    | 'skills'
    | 'commands'
    | 'agents'
    | 'rules'
    | 'gitshare'
    | 'settings';

export type VisibleSectionId =
    | 'dashboard'
    | 'skills'
    | 'commands'
    | 'agents'
    | 'rules'
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
export type SettingsScope = 'vscode' | 'git' | 'skills' | 'commands' | 'agents' | 'rules';

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

// ==================== Dashboard Search ====================

export type DashboardSearchScope = 'skills' | 'commands' | 'agents' | 'rules' | 'gitshare' | 'settings';

export type DashboardResultActionKind = 'openFile' | 'navigate' | 'command';

export interface DashboardResultAction {
    id: string;
    label: string;
    iconId: string;
    kind: DashboardResultActionKind;
}

export interface DashboardSearchResult {
    id: string;
    title: string;
    description?: string;
    subtitle?: string;
    iconId: string;
    scope: DashboardSearchScope;
    badges?: string[];
    actions: DashboardResultAction[];
}

export interface DashboardData {
    query: string;
    placeholder: string;
    hint: string;
    total: number;
    emptyTitle: string;
    emptyDescription: string;
    results: DashboardSearchResult[];
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

export interface AgentsViewModel extends BaseSectionViewModel {
    section: 'agents';
    tree: TreeNode[];
    cards: CardItem[];
    tags: string[];
    activeTags: string[];
}

export interface RulesViewModel extends BaseSectionViewModel {
    section: 'rules';
    tree: TreeNode[];
    cards: CardItem[];
    tags: string[];
    activeTags: string[];
}

export interface GitShareViewModel extends BaseSectionViewModel {
    section: 'gitshare';
    tree: TreeNode[];
}

export interface SettingsViewModel extends BaseSectionViewModel {
    section: 'settings';
    data: SettingsData;
}

export type SectionViewModel =
    | DashboardViewModel
    | SkillsViewModel
    | CommandsViewModel
    | AgentsViewModel
    | RulesViewModel
    | GitShareViewModel
    | SettingsViewModel;

// ==================== App shell state ====================

export interface BootstrapPayload {
    brandName: string;
    brandTagline: string;
    locale: 'en' | 'zh-cn';
    navItems: NavigationItem[];
    initialSection: VisibleSectionId;
}

export interface AppStatePayload {
    activeSection: VisibleSectionId;
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
    | { kind: 'dashboardSearch'; query: string }
    | { kind: 'dashboardResultAction'; resultId: string; actionId: string }
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
