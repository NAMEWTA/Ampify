/**
 * Webview ↔ Extension Host 消息协议
 * 统一定义所有双向通信的消息类型
 */

// ==================== 导航 Section ====================

export type SectionId = 'dashboard' | 'launcher' | 'skills' | 'commands' | 'gitshare' | 'settings';

// ==================== 通用树节点 ====================

export interface TreeNode {
    /** 唯一标识 */
    id: string;
    /** 显示标签 */
    label: string;
    /** 描述文本（显示在标签右侧） */
    description?: string;
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
}

export interface DashboardStat {
    label: string;
    value: number | string;
    iconId: string;
    color?: string;
}

export interface QuickAction {
    id: string;
    label: string;
    iconId: string;
    command: string;
    /** 'command' executes VS Code command; 'overlay' sends quickAction to provider */
    action?: 'command' | 'overlay';
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
    | { type: 'switchSection'; section: SectionId }
    | { type: 'executeCommand'; command: string; args?: string }
    | { type: 'treeItemClick'; nodeId: string; section: SectionId }
    | { type: 'treeItemAction'; nodeId: string; actionId: string; section: SectionId }
    | { type: 'toolbarAction'; actionId: string; section: SectionId }
    | { type: 'toggleNav' }
    | { type: 'ready' }
    | { type: 'dropFiles'; uris: string[]; section: SectionId }
    | { type: 'changeSetting'; key: string; value: string; scope: SettingsScope }
    | { type: 'settingsAction'; command: string }
    | { type: 'quickAction'; actionId: string }
    | { type: 'overlaySubmit'; overlayId: string; values: Record<string, string> }
    | { type: 'overlayCancel'; overlayId: string }
    | { type: 'confirmResult'; confirmId: string; confirmed: boolean }
    | { type: 'filterByKeyword'; section: SectionId; keyword: string }
    | { type: 'filterByTags'; section: SectionId; tags: string[] }
    | { type: 'clearFilter'; section: SectionId }
    | { type: 'toggleTag'; section: SectionId; tag: string };

// ==================== Extension → Webview 消息 ====================

export type ExtensionMessage =
    | { type: 'updateSection'; section: SectionId; tree: TreeNode[]; toolbar: ToolbarAction[]; tags?: string[]; activeTags?: string[] }
    | { type: 'updateDashboard'; data: DashboardData }
    | { type: 'setActiveSection'; section: SectionId }
    | { type: 'showNotification'; message: string; level: 'info' | 'warn' | 'error' }
    | { type: 'updateSettings'; data: SettingsData }
    | { type: 'showOverlay'; data: OverlayData }
    | { type: 'hideOverlay' }
    | { type: 'showConfirm'; data: ConfirmData };
