/**
 * Shared protocol types between Extension Host and Webview.
 * This file is a copy of the types from src/modules/mainView/protocol.ts
 * kept in sync manually. Only data types are included here (no VS Code imports).
 */

// ==================== Navigation Section ====================

export type SectionId = 'dashboard' | 'launcher' | 'skills' | 'commands' | 'gitshare' | 'modelProxy' | 'settings'

// ==================== Generic Tree Node ====================

export interface TreeNode {
  id: string
  label: string
  description?: string
  iconId?: string
  iconColor?: string
  collapsible?: boolean
  expanded?: boolean
  children?: TreeNode[]
  contextActions?: TreeAction[]
  inlineActions?: TreeAction[]
  command?: string
  commandArgs?: string
  nodeType?: string
  tooltip?: string
}

export interface TreeAction {
  id: string
  label: string
  iconId?: string
  danger?: boolean
}

// ==================== Dashboard ====================

export interface DashboardData {
  stats: DashboardStat[]
  quickActions: QuickAction[]
}

export interface DashboardStat {
  label: string
  value: number | string
  iconId: string
  color?: string
}

export interface QuickAction {
  id: string
  label: string
  iconId: string
  command?: string
  action?: 'command' | 'toolbar'
  section?: SectionId
  actionId?: string
}

// ==================== Toolbar ====================

export interface ToolbarAction {
  id: string
  label: string
  iconId: string
  command: string
  action?: 'command' | 'overlay'
}

// ==================== Overlay ====================

export type OverlayFieldKind = 'text' | 'select' | 'textarea' | 'multi-select' | 'tags'

export interface OverlayField {
  key: string
  label: string
  kind: OverlayFieldKind
  value?: string
  placeholder?: string
  options?: { label: string; value: string }[]
  required?: boolean
  description?: string
}

export interface OverlayData {
  overlayId: string
  title: string
  fields: OverlayField[]
  submitLabel: string
  cancelLabel: string
}

export interface ConfirmData {
  confirmId: string
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
}

// ==================== Settings ====================

export type SettingsFieldKind = 'text' | 'select' | 'textarea'
export type SettingsScope = 'vscode' | 'git'

export interface SettingsOption {
  label: string
  value: string
}

export interface SettingsFieldAction {
  label: string
  iconId?: string
  command: string
}

export interface SettingsField {
  key: string
  label: string
  value: string
  kind: SettingsFieldKind
  scope: SettingsScope
  description?: string
  placeholder?: string
  options?: SettingsOption[]
  action?: SettingsFieldAction
}

export interface SettingsSection {
  id: string
  title: string
  fields: SettingsField[]
}

export interface SettingsData {
  sections: SettingsSection[]
}

// ==================== Model Proxy ====================

export interface ModelProxyBindingInfo {
  id: string
  maskedKey: string
  fullKey: string
  modelId: string
  modelName: string
  label: string
  createdAt: number
}

export interface ModelProxyDashboardData {
  running: boolean
  port: number
  bindAddress: string
  baseUrl: string
  bindings: ModelProxyBindingInfo[]
  todayRequests: number
  todayTokens: number
  todayErrors: number
  avgLatencyMs: number
  models: ModelProxyModelInfo[]
  recentLogs: ModelProxyLogInfo[]
  labels: ModelProxyLabels
}

export interface ModelProxyLabels {
  statusRunning: string
  statusStopped: string
  offline: string
  requests: string
  tokens: string
  errorRate: string
  avgLatency: string
  connection: string
  baseUrl: string
  apiKey: string
  copy: string
  regenerate: string
  availableModels: string
  noModels: string
  addBinding: string
  removeBinding: string
  noBindings: string
  recentLogs: string
  tokensMax: string
  openLogsFolder: string
  logDetailTitle: string
  logInput: string
  logOutput: string
  logError: string
  logRequestId: string
  logDuration: string
  logClose: string
  viewAllLogs: string
  logViewerTitle: string
  logYear: string
  logMonth: string
  logDay: string
  logAll: string
  logSuccess: string
  logErrors: string
  logSearchPlaceholder: string
  logSelectDate: string
  logNoResults: string
  logTotalEntries: string
  logTime: string
  noLogs: string
}

export interface ModelProxyModelInfo {
  id: string
  name: string
  vendor: string
  family: string
  maxInputTokens: number
}

export interface ModelProxyLogInfo {
  timestamp: string
  requestId: string
  format: string
  model: string
  durationMs: number
  inputTokens: number
  outputTokens: number
  status: string
  error?: string
  inputContent?: string
  outputContent?: string
}

export interface LogFileInfo {
  year: string
  month: string
  day: string
  date: string
  fileSize: number
  entryCount: number
}

export interface LogQueryResult {
  entries: ModelProxyLogInfo[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ==================== RPC Protocol ====================

/** Webview → Extension: RPC request */
export interface RpcRequest {
  type: 'request'
  id: string
  method: string
  params?: unknown
}

/** Extension → Webview: RPC response */
export interface RpcResponse {
  type: 'response'
  id: string
  result?: unknown
  error?: string
}

/** Extension → Webview: Push event */
export interface RpcEvent {
  type: 'event'
  event: string
  data?: unknown
}

// Legacy messages (kept for backward compatibility during migration)
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

export type ExtensionMessage =
  | RpcResponse
  | RpcEvent
  | { type: 'updateSection'; section: SectionId; tree: TreeNode[]; toolbar: ToolbarAction[]; tags?: string[]; activeTags?: string[] }
  | { type: 'updateDashboard'; data: DashboardData }
  | { type: 'setActiveSection'; section: SectionId }
  | { type: 'showNotification'; message: string; level: 'info' | 'warn' | 'error' }
  | { type: 'updateSettings'; data: SettingsData }
  | { type: 'showOverlay'; data: OverlayData }
  | { type: 'hideOverlay' }
  | { type: 'showConfirm'; data: ConfirmData }
  | { type: 'updateModelProxy'; data: ModelProxyDashboardData }
  | { type: 'updateLogFiles'; files: LogFileInfo[] }
  | { type: 'updateLogQuery'; result: LogQueryResult; date: string; statusFilter: string; keyword?: string }
