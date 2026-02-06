/**
 * CSS 模板
 * 统一界面的全部样式定义
 */
export function getCss(): string {
    return `
/* ==================== Reset & Base ==================== */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html, body {
    height: 100%;
    overflow: hidden;
    background: var(--vscode-sideBar-background);
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    line-height: 1.4;
}

/* ==================== Layout ==================== */
.app {
    display: flex;
    height: 100vh;
    overflow: hidden;
}

/* ==================== Nav Rail ==================== */
.nav-rail {
    display: flex;
    flex-direction: column;
    width: 40px;
    min-width: 40px;
    background: var(--vscode-sideBar-background);
    border-right: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border, rgba(128,128,128,0.2)));
    transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    flex-shrink: 0;
    user-select: none;
}

.nav-rail.expanded {
    width: 130px;
    min-width: 130px;
}

.nav-header {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 8px;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border, rgba(128,128,128,0.2)));
    flex-shrink: 0;
}

.nav-header .logo {
    font-size: 11px;
    font-weight: 700;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    opacity: 0;
    width: 0;
    transition: opacity 0.15s ease, width 0.15s ease;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.nav-rail.expanded .nav-header .logo {
    opacity: 1;
    width: auto;
    margin-left: 4px;
}

.nav-header .logo-letter {
    font-size: 13px;
    font-weight: 700;
    color: #d97757;
    flex-shrink: 0;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.nav-items {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 4px 0;
    gap: 1px;
    overflow-y: auto;
    overflow-x: hidden;
}

.nav-item {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 0 0 10px;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    opacity: 0.7;
    border-left: 2px solid transparent;
    transition: all 0.15s ease;
    width: 100%;
    text-align: left;
    font-size: var(--vscode-font-size);
    font-family: var(--vscode-font-family);
    white-space: nowrap;
    overflow: hidden;
    position: relative;
}

.nav-item:hover {
    background: var(--vscode-list-hoverBackground);
    opacity: 1;
}

.nav-item.active {
    opacity: 1;
    border-left-color: #d97757;
    background: var(--vscode-list-activeSelectionBackground, rgba(255,255,255,0.06));
}

.nav-item .nav-icon {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 14px;
}

.nav-item .nav-label {
    margin-left: 8px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    opacity: 0;
    width: 0;
    transition: opacity 0.15s ease 0.05s, width 0.15s ease;
}

.nav-rail.expanded .nav-item .nav-label {
    opacity: 1;
    width: auto;
}

.nav-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    opacity: 0.5;
    cursor: pointer;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
    font-family: var(--vscode-font-family);
    border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border, rgba(128,128,128,0.2)));
}

.nav-toggle:hover {
    opacity: 1;
    background: var(--vscode-list-hoverBackground);
}

/* ==================== Content ==================== */
.content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
}

/* ==================== Toolbar ==================== */
.toolbar {
    display: flex;
    align-items: center;
    height: 30px;
    padding: 0 8px;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border, rgba(128,128,128,0.2)));
    flex-shrink: 0;
    gap: 2px;
    background: var(--vscode-sideBar-background);
}

.toolbar-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.8;
    margin-right: auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    opacity: 0.7;
    transition: all 0.12s ease;
    font-size: 14px;
    flex-shrink: 0;
}

.toolbar-btn:hover {
    background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    opacity: 1;
}

/* ==================== Content Body ==================== */
.content-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0;
}

/* ==================== Dashboard ==================== */
.dashboard {
    padding: 12px;
}

.dashboard-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
    opacity: 0.9;
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border-radius: 6px;
    background: var(--vscode-editor-background, rgba(255,255,255,0.03));
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    transition: border-color 0.15s ease;
}

.stat-card:hover {
    border-color: rgba(128,128,128,0.3);
}

.stat-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 14px;
    flex-shrink: 0;
}

.stat-info {
    flex: 1;
    min-width: 0;
}

.stat-value {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.2;
}

.stat-label {
    font-size: 10px;
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.quick-actions-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.6;
    margin-bottom: 8px;
}

.quick-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.quick-action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    background: var(--vscode-editor-background, rgba(255,255,255,0.03));
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    transition: background 0.12s ease;
    text-align: left;
    width: 100%;
    border: 1px solid transparent;
}

.quick-action-btn:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: rgba(128,128,128,0.2);
}

.quick-action-btn .codicon {
    font-size: 14px;
    opacity: 0.8;
}

/* ==================== Tree ==================== */
.tree-container {
    padding: 2px 0;
}

.tree-node {
    display: flex;
    flex-direction: column;
}

.tree-row {
    display: flex;
    align-items: center;
    height: 22px;
    padding-right: 8px;
    cursor: pointer;
    transition: background 0.08s ease;
    position: relative;
}

.tree-row:hover {
    background: var(--vscode-list-hoverBackground);
}

.tree-row.selected {
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground, var(--vscode-foreground));
}

.tree-indent {
    flex-shrink: 0;
}

.tree-chevron {
    width: 16px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.6;
    font-size: 14px;
    transition: transform 0.15s ease;
}

.tree-chevron.expanded {
    transform: rotate(90deg);
}

.tree-chevron.hidden {
    visibility: hidden;
}

.tree-icon {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 4px;
    font-size: 14px;
}

.tree-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    min-width: 0;
}

.tree-description {
    margin-left: 6px;
    font-size: 11px;
    opacity: 0.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
    min-width: 0;
}

.tree-actions {
    display: none;
    align-items: center;
    gap: 2px;
    margin-left: auto;
    flex-shrink: 0;
    padding-left: 4px;
}

.tree-row:hover .tree-actions {
    display: flex;
}

.tree-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    opacity: 0.7;
    font-size: 12px;
    transition: all 0.1s ease;
}

.tree-action-btn:hover {
    background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
    opacity: 1;
}

.tree-action-btn.danger:hover {
    color: var(--vscode-errorForeground, #f44);
}

.tree-children {
    overflow: hidden;
}

.tree-children.collapsed {
    display: none;
}

/* ==================== Context Menu ==================== */
.context-menu {
    position: fixed;
    min-width: 160px;
    background: var(--vscode-menu-background, var(--vscode-editor-background));
    border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border, rgba(128,128,128,0.3)));
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    padding: 4px 0;
    font-size: 12px;
}

.context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    cursor: pointer;
    color: var(--vscode-menu-foreground, var(--vscode-foreground));
    transition: background 0.08s ease;
}

.context-menu-item:hover {
    background: var(--vscode-menu-selectionBackground, var(--vscode-list-activeSelectionBackground));
    color: var(--vscode-menu-selectionForeground, var(--vscode-list-activeSelectionForeground, var(--vscode-foreground)));
}

.context-menu-item.danger {
    color: var(--vscode-errorForeground, #f44);
}

.context-menu-item .codicon {
    font-size: 14px;
    width: 16px;
    text-align: center;
}

.context-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999;
}

/* ==================== Drop Zone ==================== */
.drop-zone-active {
    outline: 2px dashed #d97757;
    outline-offset: -2px;
    background: rgba(217, 119, 87, 0.05);
}

/* ==================== Empty State ==================== */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    text-align: center;
    opacity: 0.6;
}

.empty-state .codicon {
    font-size: 24px;
    margin-bottom: 8px;
    opacity: 0.4;
}

.empty-state p {
    font-size: 12px;
}

/* ==================== Settings ==================== */
.settings {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.settings-section {
    border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.2));
    border-radius: 6px;
    padding: 10px;
    background: var(--vscode-sideBar-background);
}

.settings-section-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    opacity: 0.85;
}

.settings-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 0;
    border-top: 1px dashed var(--vscode-panel-border, rgba(128, 128, 128, 0.2));
}

.settings-field:first-of-type {
    border-top: none;
    padding-top: 0;
}

.settings-label {
    font-size: 12px;
    font-weight: 600;
}

.settings-input {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(128, 128, 128, 0.3));
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
}

.settings-input:focus {
    outline: 1px solid var(--vscode-focusBorder);
}

.settings-input textarea,
.settings-input select,
.settings-input input {
    font-family: var(--vscode-font-family);
}

.settings-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    white-space: nowrap;
    align-self: flex-start;
}

.settings-action-btn:hover {
    background: var(--vscode-button-hoverBackground);
}

.settings-action-btn .codicon {
    font-size: 12px;
}

.settings-hint {
    font-size: 11px;
    opacity: 0.7;
}

/* ==================== Model Proxy Dashboard ==================== */
.proxy-dashboard {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.proxy-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.proxy-stats-grid > :last-child:nth-child(odd) {
    grid-column: span 2;
}

.proxy-stat-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border-radius: 6px;
    background: var(--vscode-editor-background, rgba(255,255,255,0.03));
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    transition: border-color 0.15s ease;
}

.proxy-stat-card:hover {
    border-color: rgba(128,128,128,0.3);
}

.proxy-stat-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 14px;
    flex-shrink: 0;
}

.proxy-stat-info {
    flex: 1;
    min-width: 0;
}

.proxy-stat-value {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
}

.proxy-stat-label {
    font-size: 10px;
    opacity: 0.55;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.proxy-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.6;
    display: flex;
    align-items: center;
    gap: 6px;
    user-select: none;
}

.proxy-section-hint {
    font-weight: 400;
    font-size: 10px;
    opacity: 0.6;
    text-transform: none;
    letter-spacing: 0;
}

/* Connection Info */
.proxy-connection {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    border-radius: 6px;
    background: var(--vscode-editor-background, rgba(255,255,255,0.03));
    overflow: hidden;
}

.proxy-conn-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    font-size: 12px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.1));
}

.proxy-conn-row:last-child {
    border-bottom: none;
}

.proxy-conn-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    opacity: 0.7;
    white-space: nowrap;
    min-width: 66px;
}

.proxy-conn-label .codicon {
    font-size: 12px;
}

.proxy-conn-value {
    flex: 1;
    font-size: 11px;
    font-family: var(--vscode-editor-font-family, monospace);
    opacity: 0.85;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.proxy-conn-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    opacity: 0.5;
    font-size: 12px;
    flex-shrink: 0;
    transition: all 0.12s ease;
}

.proxy-conn-btn:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
}

/* Model List (compact collapsible) */
.proxy-models-toggle {
    cursor: pointer;
    user-select: none;
}

.proxy-models-toggle:hover {
    opacity: 0.85;
}

.proxy-models-chevron {
    font-size: 12px;
    transition: transform 0.15s ease;
    display: inline-block;
}

.proxy-models-chevron.rotated {
    transform: rotate(90deg);
}

.proxy-models-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    border-radius: 6px;
    overflow: hidden;
    background: var(--vscode-editor-background, rgba(255,255,255,0.03));
}

.proxy-models-list.collapsed {
    display: none;
}

.proxy-model-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    font-size: 11px;
    cursor: pointer;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.08));
    transition: background 0.1s ease;
}

.proxy-model-row:last-child {
    border-bottom: none;
}

.proxy-model-row:hover {
    background: var(--vscode-list-hoverBackground);
}

.proxy-model-row.selected {
    background: rgba(217,119,87,0.06);
}

.proxy-model-radio {
    font-size: 14px;
    flex-shrink: 0;
    opacity: 0.5;
}

.proxy-model-row.selected .proxy-model-radio {
    opacity: 1;
}

.proxy-model-name {
    font-size: 11px;
    font-weight: 600;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.proxy-model-tag {
    display: inline-flex;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    background: var(--vscode-badge-background, rgba(128,128,128,0.15));
    color: var(--vscode-badge-foreground, var(--vscode-descriptionForeground));
    white-space: nowrap;
    flex-shrink: 0;
}

.proxy-model-tokens {
    font-size: 10px;
    opacity: 0.5;
    flex-shrink: 0;
    white-space: nowrap;
}

.proxy-empty-models {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px;
    font-size: 12px;
    opacity: 0.6;
    justify-content: center;
}

/* Recent Logs */
.proxy-logs-title {
    cursor: pointer;
}

.proxy-logs-title:hover {
    opacity: 0.85;
}

.proxy-logs-chevron {
    font-size: 12px;
    transition: transform 0.15s ease;
}

.proxy-logs-chevron.rotated {
    transform: rotate(180deg);
}

.proxy-logs-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    border-radius: 6px;
    overflow: hidden;
    background: var(--vscode-editor-background, rgba(255,255,255,0.03));
}

.proxy-logs-list.collapsed {
    display: none;
}

.proxy-log-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    font-size: 11px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.08));
}

.proxy-log-row:last-child {
    border-bottom: none;
}

.proxy-log-row .codicon {
    font-size: 12px;
    flex-shrink: 0;
}

.proxy-log-time {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10px;
    opacity: 0.6;
    flex-shrink: 0;
}

.proxy-log-format {
    padding: 0 4px;
    border-radius: 2px;
    background: rgba(106,155,204,0.15);
    color: #6a9bcc;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    flex-shrink: 0;
}

.proxy-log-model {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.75;
}

.proxy-log-duration {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10px;
    opacity: 0.6;
    flex-shrink: 0;
}

.proxy-log-tokens {
    font-size: 10px;
    opacity: 0.45;
    flex-shrink: 0;
    white-space: nowrap;
}

.proxy-log-row {
    cursor: pointer;
}

/* Logs folder button */
.proxy-logs-folder-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: none;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    border-radius: 3px;
    opacity: 0.6;
    margin-left: 4px;
    vertical-align: middle;
    padding: 0;
    font-size: 12px;
}

.proxy-logs-folder-btn:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
}

/* Log Detail Popup */
.proxy-log-detail-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
}

.proxy-log-detail-panel {
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.3));
    border-radius: 8px;
    width: 100%;
    max-width: 560px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.proxy-log-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    flex-shrink: 0;
}

.proxy-log-detail-title {
    font-size: 13px;
    font-weight: 600;
}

.proxy-log-detail-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    border-radius: 3px;
    opacity: 0.7;
}

.proxy-log-detail-close:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground);
}

.proxy-log-detail-body {
    overflow-y: auto;
    padding: 10px 14px;
    flex: 1;
}

.proxy-log-detail-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
}

.proxy-log-detail-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 11px;
}

.proxy-log-detail-label {
    flex-shrink: 0;
    width: 80px;
    opacity: 0.6;
    text-align: right;
}

.proxy-log-detail-value {
    flex: 1;
    min-width: 0;
    word-break: break-all;
}

.proxy-log-detail-value.mono {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10px;
}

.proxy-log-detail-section {
    margin-top: 8px;
}

.proxy-log-detail-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.7;
    margin-bottom: 4px;
}

.proxy-log-detail-pre {
    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.1));
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.12));
    border-radius: 4px;
    padding: 8px 10px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
    margin: 0;
}

.proxy-log-detail-pre.error {
    border-color: rgba(217,119,87,0.3);
    color: #d97757;
}

/* ==================== Log Viewer Panel ==================== */

.proxy-logs-actions {
    display: inline-flex;
    gap: 2px;
    margin-left: auto;
}

.proxy-logs-empty {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    font-size: 11px;
    opacity: 0.5;
}

.proxy-view-all-logs-btn {
    font-size: 13px;
}

.log-viewer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.55);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
}

.log-viewer-panel {
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.3));
    border-radius: 8px;
    width: 100%;
    max-width: 700px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.log-viewer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    flex-shrink: 0;
}

.log-viewer-title {
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
}

.log-viewer-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    border-radius: 3px;
    opacity: 0.7;
}

.log-viewer-close:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground);
}

.log-viewer-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.1));
    flex-wrap: wrap;
    flex-shrink: 0;
}

.log-viewer-select {
    background: var(--vscode-input-background, #3c3c3c);
    color: var(--vscode-input-foreground, #ccc);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.25));
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    outline: none;
    cursor: pointer;
    min-width: 60px;
}

.log-viewer-select:focus {
    border-color: var(--vscode-focusBorder);
}

.log-viewer-select:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.log-viewer-search {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--vscode-input-background, #3c3c3c);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.25));
    border-radius: 4px;
    padding: 2px 8px;
    flex: 1;
    min-width: 100px;
}

.log-viewer-search .codicon {
    font-size: 12px;
    opacity: 0.5;
    flex-shrink: 0;
}

.log-viewer-search:focus-within {
    border-color: var(--vscode-focusBorder);
}

.log-viewer-input {
    background: transparent;
    border: none;
    color: var(--vscode-input-foreground, #ccc);
    font-size: 11px;
    outline: none;
    width: 100%;
    padding: 2px 0;
}

.log-viewer-content {
    flex: 1;
    overflow-y: auto;
    min-height: 120px;
}

.log-viewer-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 36px 12px;
    font-size: 12px;
    opacity: 0.45;
    text-align: center;
    gap: 4px;
}

.log-viewer-empty .codicon {
    font-size: 28px;
    margin-bottom: 4px;
}

.log-viewer-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 14px;
    font-size: 11px;
    opacity: 0.7;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.08));
}

.log-viewer-summary-count {
    font-weight: 500;
}

.log-viewer-table {
    display: flex;
    flex-direction: column;
}

.log-viewer-thead {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 14px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.5;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.12));
    flex-shrink: 0;
    position: sticky;
    top: 0;
    background: var(--vscode-editor-background, #1e1e1e);
    z-index: 1;
}

.log-viewer-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    font-size: 11px;
    cursor: pointer;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.06));
    transition: background 0.1s;
}

.log-viewer-row:hover {
    background: var(--vscode-list-hoverBackground, rgba(255,255,255,0.04));
}

.log-viewer-row:last-child {
    border-bottom: none;
}

.lv-col-status {
    width: 18px;
    flex-shrink: 0;
    text-align: center;
}

.lv-col-time {
    width: 65px;
    flex-shrink: 0;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10px;
    opacity: 0.65;
}

.lv-col-format {
    width: 60px;
    flex-shrink: 0;
}

.lv-col-model {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.8;
}

.lv-col-duration {
    width: 50px;
    flex-shrink: 0;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10px;
    text-align: right;
    opacity: 0.65;
}

.lv-col-tokens {
    width: 80px;
    flex-shrink: 0;
    font-size: 10px;
    opacity: 0.5;
    text-align: right;
    white-space: nowrap;
}

/* Pagination */
.log-viewer-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 14px;
    border-top: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    flex-shrink: 0;
}

.lv-page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 24px;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    background: transparent;
    color: var(--vscode-foreground);
    font-size: 11px;
    border-radius: 4px;
    cursor: pointer;
    padding: 0 6px;
    transition: all 0.1s;
}

.lv-page-btn:hover:not(:disabled) {
    background: var(--vscode-toolbar-hoverBackground, rgba(255,255,255,0.08));
    border-color: var(--vscode-focusBorder);
}

.lv-page-btn.active {
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
    border-color: var(--vscode-button-background, #0e639c);
    font-weight: 600;
}

.lv-page-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.lv-page-ellipsis {
    font-size: 11px;
    opacity: 0.4;
    padding: 0 2px;
}

.lv-page-info {
    font-size: 10px;
    opacity: 0.5;
    margin-left: 8px;
}

/* ==================== Scrollbar ==================== */
.content-body::-webkit-scrollbar {
    width: 6px;
}

.content-body::-webkit-scrollbar-track {
    background: transparent;
}

.content-body::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 3px;
}

.content-body::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-hoverBackground);
}

/* ==================== Tag Chips Bar ==================== */
.tag-chips-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
    background: var(--vscode-sideBar-background);
    align-items: center;
}

.tag-chips-label {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-right: 2px;
    user-select: none;
    flex-shrink: 0;
}

.tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.12));
    background: transparent;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    transition: all 0.12s ease;
    user-select: none;
    white-space: nowrap;
}

.tag-chip:hover {
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-foreground);
}

.tag-chip.active {
    background: var(--vscode-badge-background, #007acc);
    color: var(--vscode-badge-foreground, #fff);
    border-color: var(--vscode-badge-background, #007acc);
}

.tag-chip.active:hover {
    opacity: 0.85;
}

.tag-chip-clear {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    transition: all 0.12s ease;
    user-select: none;
    white-space: nowrap;
    margin-left: 2px;
}

.tag-chip-clear:hover {
    color: var(--vscode-errorForeground, #f44);
    background: rgba(244, 68, 68, 0.1);
}

/* ==================== Overlay Panel ==================== */
.overlay-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 2000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    animation: overlay-fadein 0.12s ease;
}

@keyframes overlay-fadein {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes overlay-slidein {
    from { opacity: 0; transform: translateY(-8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.overlay-panel {
    background: var(--vscode-editor-background, var(--vscode-sideBar-background));
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, rgba(128,128,128,0.3)));
    border-radius: 8px;
    width: 92%;
    max-width: 380px;
    max-height: 75vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    animation: overlay-slidein 0.15s ease;
    overflow: hidden;
}

.overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    flex-shrink: 0;
}

.overlay-title {
    font-size: 13px;
    font-weight: 600;
}

.overlay-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    opacity: 0.6;
    font-size: 14px;
}

.overlay-close:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground));
}

.overlay-body {
    padding: 12px 14px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.overlay-body::-webkit-scrollbar {
    width: 5px;
}

.overlay-body::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 3px;
}

.overlay-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.overlay-field-label {
    font-size: 12px;
    font-weight: 600;
}

.overlay-field-label .required {
    color: var(--vscode-errorForeground, #f44);
    margin-left: 2px;
}

.overlay-field-input {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    width: 100%;
}

.overlay-field-input:focus {
    outline: 1px solid var(--vscode-focusBorder);
}

.overlay-field-input.textarea {
    min-height: 60px;
    resize: vertical;
}

.overlay-field-hint {
    font-size: 11px;
    opacity: 0.6;
}

.overlay-field-error {
    font-size: 11px;
    color: var(--vscode-errorForeground, #f44);
    display: none;
}

.overlay-field-error.visible {
    display: block;
}

/* Multi-select (checkboxes) */
.overlay-multi-select {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 140px;
    overflow-y: auto;
    padding: 4px 0;
}

.overlay-multi-select::-webkit-scrollbar {
    width: 4px;
}
.overlay-multi-select::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 2px;
}

.overlay-check-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.25));
    background: var(--vscode-editor-background, transparent);
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    transition: all 0.1s ease;
    user-select: none;
}

.overlay-check-tag:hover {
    border-color: rgba(128,128,128,0.5);
}

.overlay-check-tag.checked {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
}

.overlay-check-tag input[type="checkbox"] {
    display: none;
}

/* Tags input */
.overlay-tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
    border-radius: 4px;
    background: var(--vscode-input-background);
    min-height: 32px;
    cursor: text;
}

.overlay-tags-container:focus-within {
    outline: 1px solid var(--vscode-focusBorder);
}

.overlay-tag-item {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--vscode-badge-background, rgba(128,128,128,0.2));
    color: var(--vscode-badge-foreground, var(--vscode-foreground));
    font-size: 11px;
}

.overlay-tag-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 10px;
    opacity: 0.7;
    border-radius: 2px;
}

.overlay-tag-remove:hover {
    opacity: 1;
    background: rgba(128,128,128,0.3);
}

.overlay-tags-input {
    border: none;
    outline: none;
    background: transparent;
    color: var(--vscode-input-foreground);
    font-size: 12px;
    font-family: var(--vscode-font-family);
    flex: 1;
    min-width: 60px;
    padding: 2px 0;
}

.overlay-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    flex-shrink: 0;
}

.overlay-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 14px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s ease;
}

.overlay-btn-primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
}

.overlay-btn-primary:hover {
    background: var(--vscode-button-hoverBackground);
}

.overlay-btn-secondary {
    background: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.2));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
}

.overlay-btn-secondary:hover {
    background: var(--vscode-button-secondaryHoverBackground, rgba(128,128,128,0.3));
}

.overlay-btn-danger {
    background: var(--vscode-errorForeground, #c33);
    color: #fff;
}

.overlay-btn-danger:hover {
    opacity: 0.9;
}

/* ==================== Confirm Dialog ==================== */
.confirm-panel {
    background: var(--vscode-editor-background, var(--vscode-sideBar-background));
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, rgba(128,128,128,0.3)));
    border-radius: 8px;
    width: 88%;
    max-width: 340px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    animation: overlay-slidein 0.15s ease;
    overflow: hidden;
}

.confirm-header {
    padding: 12px 14px 0;
    font-size: 13px;
    font-weight: 600;
}

.confirm-body {
    padding: 10px 14px;
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.85;
}

.confirm-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 14px 12px;
}

/* ==================== Codicon Font (fallback, main CSS loaded via <link>) ==================== */
@font-face {
    font-family: "codicon";
    src: url("{codiconUri}") format("truetype");
}

.codicon {
    font-family: "codicon";
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
`;
}
