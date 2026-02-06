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
