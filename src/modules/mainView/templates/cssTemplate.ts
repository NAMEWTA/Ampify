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

/* Account badge */
.account-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 8px;
    flex-shrink: 0;
    border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border, rgba(128,128,128,0.2)));
    color: var(--vscode-descriptionForeground, rgba(204,204,204,0.7));
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    gap: 6px;
    cursor: default;
}

.account-badge .account-letter {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    background: #d97757;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    text-transform: uppercase;
    line-height: 1;
}

.account-badge .account-label {
    opacity: 0;
    width: 0;
    overflow: hidden;
    transition: opacity 0.15s ease, width 0.15s ease;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.5px;
}

.nav-rail.expanded .account-badge .account-label {
    opacity: 1;
    width: auto;
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
    padding: 14px;
    background: radial-gradient(circle at 12% 8%, rgba(217,119,87,0.08), transparent 42%),
        radial-gradient(circle at 85% 12%, rgba(106,155,204,0.10), transparent 48%),
        var(--vscode-sideBar-background);
}

.dash-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
}

.dash-title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.4px;
    font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
}

.dash-subtitle {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.55;
}

.dash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
}

.dash-panel {
    background: var(--vscode-editor-background, rgba(255,255,255,0.03));
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.15));
    border-radius: 10px;
    padding: 10px;
}

.dash-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.dash-panel-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.6;
    font-weight: 600;
}

.dash-next {
    grid-column: 1 / -1;
}

.dash-next-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
}

.dash-next-card {
    padding: 10px;
    border-radius: 8px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(128,128,128,0.12);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.dash-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
}

.dash-card-title {
    font-size: 12px;
    font-weight: 600;
}

.dash-link-btn {
    border: none;
    background: transparent;
    color: var(--vscode-textLink-foreground);
    font-size: 10px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    cursor: pointer;
}

.dash-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.dash-meta-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 10px;
}

.dash-meta-label {
    text-transform: uppercase;
    letter-spacing: 0.6px;
    opacity: 0.5;
}

.dash-meta-value {
    text-align: right;
    max-width: 60%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dash-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 6px;
    border: 1px solid rgba(217,119,87,0.4);
    background: rgba(217,119,87,0.15);
    color: var(--vscode-foreground);
    font-size: 11px;
    padding: 6px 8px;
    cursor: pointer;
    transition: all 0.12s ease;
}

.dash-action-btn:hover {
    border-color: rgba(217,119,87,0.7);
    background: rgba(217,119,87,0.25);
}

.dashboard-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
    opacity: 0.9;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 8px;
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
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 6px;
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

.dash-activity-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.dash-activity-row {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    gap: 8px;
    align-items: center;
    font-size: 11px;
}

.dash-activity-icon {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: rgba(106,155,204,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}

.dash-activity-body {
    min-width: 0;
}

.dash-activity-title {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dash-activity-meta {
    opacity: 0.6;
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dash-activity-time {
    opacity: 0.5;
    font-size: 10px;
    white-space: nowrap;
}

.dash-empty {
    padding: 12px;
    font-size: 11px;
    opacity: 0.6;
}

.dash-health-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-bottom: 8px;
}

.dash-health-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #888;
}

.dash-health-status.ok .dash-health-dot {
    background: #788c5d;
}

.dash-health-status.off .dash-health-dot {
    background: #888;
}

.dash-health-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    padding: 4px 0;
}

.dash-health-label {
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.6;
}

.dash-health-value {
    max-width: 65%;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dash-health-error .dash-health-value {
    color: #d97757;
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

/* ==================== Vue UI Parity Overrides ==================== */
.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
    min-height: 32px;
}

.toolbar-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--vscode-foreground, #cccccc);
    letter-spacing: 0.5px;
}

.toolbar-actions {
    display: flex;
    gap: 2px;
}

.toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--vscode-foreground, #cccccc);
    cursor: pointer;
    border-radius: 3px;
    opacity: 0.8;
}

.toolbar-btn--view-toggle {
    width: auto;
    padding: 0 6px;
    gap: 4px;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.25));
}

.toolbar-btn-text {
    font-size: 10px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
}

.toolbar-btn:hover {
    background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    opacity: 1;
}

.content-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    position: relative;
}

/* ===== Tag Chips ===== */
.tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
}

.tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border: 1px solid var(--vscode-panel-border, #454545);
    background: transparent;
    color: var(--vscode-foreground, #cccccc);
    font-size: 11px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.1s;
}

.tag-chip:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.tag-chip.active {
    background: #d97757;
    color: #fff;
    border-color: #d97757;
}

.tag-chip.clear-chip {
    color: var(--vscode-errorForeground, #f48771);
    border-color: var(--vscode-errorForeground, #f48771);
}

/* ===== Cards (Skills / Commands) ===== */
.cards-container {
    flex: 1;
    overflow-y: auto;
    position: relative;
    padding: 6px;
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
}

.item-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    border-radius: 6px;
    background: var(--vscode-editorWidget-background, #252526);
    border: 1px solid var(--vscode-editorWidget-border, #454545);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    min-height: 0;
    overflow: hidden;
}

.item-card:hover {
    border-color: #d97757;
    background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.item-card:hover .card-actions {
    opacity: 1;
}

.card-icon {
    font-size: 18px;
    opacity: 0.75;
    color: #d97757;
    line-height: 1;
}

.card-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground, #cccccc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-desc {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #717171);
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex-shrink: 1;
    min-height: 0;
}

.card-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 2px;
}

.card-badge {
    font-size: 10px;
    padding: 0 5px;
    border-radius: 7px;
    background: var(--vscode-badge-background, #4d4d4d);
    color: var(--vscode-badge-foreground, #ffffff);
    white-space: nowrap;
    line-height: 16px;
}

.card-badge--more {
    background: transparent;
    color: var(--vscode-descriptionForeground, #717171);
    padding: 0 2px;
}

.card-actions {
    display: flex;
    gap: 2px;
    margin-top: auto;
    padding-top: 4px;
    opacity: 0;
    transition: opacity 0.15s;
}

.empty-hint {
    margin-top: 4px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #717171);
}

.card-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: var(--vscode-foreground, #cccccc);
    cursor: pointer;
    border-radius: 3px;
    font-size: 12px;
}

.card-action-btn:hover {
    background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
}

.card-action-btn.danger {
    color: var(--vscode-errorForeground, #f48771);
}

/* Drop overlay */
.drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    border: 2px dashed #d97757;
    border-radius: 4px;
    pointer-events: none;
}

.drop-overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #d97757;
    font-size: 12px;
    font-weight: 500;
}

.drop-overlay-content .codicon { font-size: 32px; }

/* ===== Tree View ===== */
.tree-container {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
}

.tree-row {
    display: flex;
    align-items: center;
    padding: 3px 8px 3px 4px;
    cursor: pointer;
    border-radius: 3px;
    height: auto;
    min-height: 24px;
    gap: 4px;
}

.tree-row:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.tree-row.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771);
    color: var(--vscode-list-activeSelectionForeground, #ffffff);
}

.tree-row--three-line {
    align-items: flex-start;
    padding-top: 4px;
    padding-bottom: 4px;
}

.tree-row--two-line {
    align-items: flex-start;
    padding-top: 4px;
    padding-bottom: 4px;
}

.tree-row--compact .tree-label--compact {
    min-width: 0;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
}

.tree-compact-content {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
}

.tree-row--compact .tree-badges--compact {
    justify-self: end;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
}

.tree-row--compact .tree-description--compact {
    min-width: 0;
    margin-left: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
}

.tree-row--compact {
    align-items: flex-start;
}

.tree-row--compact .tree-compact-content {
    align-items: flex-start;
}

.tree-row--compact.compact-hide-desc .tree-description--compact {
    display: none;
}

.tree-row--compact.compact-hide-tags .tree-badges--compact {
    display: none;
}

.tree-chevron,
.tree-chevron-placeholder {
    width: 16px;
    min-width: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
}

.tree-chevron {
    cursor: pointer;
}

.tree-icon {
    display: flex;
    align-items: center;
    font-size: 14px;
    min-width: 16px;
    opacity: 0.85;
}

.tree-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    gap: 2px;
}

.tree-label--primary {
    font-weight: 600;
}

.tree-subtitle {
    color: var(--vscode-descriptionForeground, #717171);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tree-tertiary {
    color: var(--vscode-descriptionForeground, #717171);
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tree-badges {
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
}

.tree-badge {
    font-size: 10px;
    padding: 0 5px;
    border-radius: 7px;
    background: var(--vscode-badge-background, #4d4d4d);
    color: var(--vscode-badge-foreground, #ffffff);
    white-space: nowrap;
    line-height: 16px;
}

.tree-badge--more {
    background: transparent;
    color: var(--vscode-descriptionForeground, #717171);
    padding: 0 2px;
}

.tree-description {
    margin-left: auto;
    color: var(--vscode-descriptionForeground, #717171);
    font-size: 11px;
    white-space: nowrap;
}

.tree-row--compact .tree-description--compact {
    margin-left: 6px;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tree-inline-actions {
    display: flex;
    gap: 2px;
    margin-left: auto;
}

.tree-inline-actions .tree-action-btn {
    opacity: 0;
    transition: opacity 0.12s;
}

.tree-row:hover .tree-action-btn {
    opacity: 1;
}

.tree-action-btn--pinned {
    opacity: 1 !important;
}

.tree-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: var(--vscode-foreground, #cccccc);
    cursor: pointer;
    border-radius: 3px;
    font-size: 12px;
}

.tree-action-btn:hover {
    background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
}

.tree-action-btn.danger {
    color: var(--vscode-errorForeground, #f48771);
}

.tree-children.collapsed { display: none; }

/* ===== Dashboard ===== */
.dashboard-view {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.dashboard-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    scroll-behavior: smooth;
}

.section-block {
    margin-bottom: 16px;
}

.section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground, #717171);
    margin-bottom: 8px;
    letter-spacing: 0.5px;
}

.health-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.health-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-foreground, #cccccc);
    border-radius: 16px;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
}

.health-pill:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
    border-color: var(--vscode-focusBorder, #007fd4);
}

.health-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
}

.health-active { background: #89d185; }
.health-inactive { background: #717171; }
.health-warning { background: #d97757; }
.health-error { background: #f48771; }

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 6px;
    text-align: left;
    color: inherit;
    font: inherit;
    cursor: default;
    transition: background 0.1s, border-color 0.1s;
}

.stat-card.clickable {
    cursor: pointer;
}

.stat-card.clickable:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
    border-color: var(--vscode-focusBorder, #007fd4);
}

.stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    font-size: 16px;
    flex-shrink: 0;
}

.stat-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.stat-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-foreground, #cccccc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stat-label {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #717171);
}

.git-info-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 6px;
    font-size: 12px;
}

.git-info-bar.git-has-changes {
    border-color: #d9775744;
    background: #d977570a;
}

.git-info-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    min-width: 0;
}

.git-branch,
.git-remote {
    display: flex;
    align-items: center;
    gap: 4px;
}

.git-remote {
    color: var(--vscode-descriptionForeground, #717171);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.git-badge {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--vscode-badge-background, #4d4d4d);
    color: var(--vscode-badge-foreground, #ffffff);
    font-size: 11px;
}

.git-badge-warn {
    background: #d9775733;
    color: #d97757;
}

.git-info-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

.icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--vscode-foreground, #cccccc);
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.1s;
}

.icon-btn:hover {
    background: var(--vscode-toolbar-hoverBackground, #5a5d5e50);
}

.proxy-mini-panel {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 6px;
    font-size: 12px;
    flex-wrap: wrap;
}

.proxy-mini-status {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #89d185;
    font-weight: 500;
}

.proxy-mini-stats {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--vscode-descriptionForeground, #717171);
}

.proxy-mini-stat {
    display: flex;
    align-items: center;
    gap: 3px;
}

.proxy-mini-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
}

.text-link {
    background: none;
    border: none;
    color: var(--vscode-textLink-foreground, #3794ff);
    cursor: pointer;
    font-size: 11px;
    white-space: nowrap;
}

.text-link:hover {
    text-decoration: underline;
}

.quick-action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
}

.quick-action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-foreground, #cccccc);
    cursor: pointer;
    border-radius: 4px;
    font-size: 12px;
    transition: background 0.1s;
}

.quick-action-btn:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
    border-color: #d97757;
}

.quick-action-btn .codicon {
    color: #d97757;
    font-size: 14px;
}

.recent-logs-table {
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 6px;
    overflow: hidden;
}

.log-row {
    display: flex;
    align-items: center;
    padding: 4px 10px;
    font-size: 11px;
    border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
}

.log-row:last-of-type {
    border-bottom: none;
}

.log-row.log-header {
    font-weight: 600;
    color: var(--vscode-descriptionForeground, #717171);
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.3px;
}

.log-col {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.log-col-time { width: 70px; flex-shrink: 0; }
.log-col-model { flex: 1; min-width: 0; }
.log-col-status { width: 36px; flex-shrink: 0; text-align: center; }
.log-col-duration { width: 48px; flex-shrink: 0; text-align: right; }
.log-col-tokens { width: 56px; flex-shrink: 0; text-align: right; }

.log-status-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
}

.log-status-ok { background: #89d185; }
.log-status-err { background: #f48771; }

.log-view-all {
    display: block;
    width: 100%;
    padding: 6px 10px;
    text-align: center;
    background: none;
    border: none;
    border-top: 1px solid var(--vscode-panel-border, #2b2b2b);
    color: var(--vscode-textLink-foreground, #3794ff);
    cursor: pointer;
    font-size: 11px;
}

.log-view-all:hover {
    text-decoration: underline;
}

.recent-logs-empty {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 6px;
    background: var(--vscode-editor-background, #1e1e1e);
}

.next-up-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
}

.next-up-card {
    background: var(--vscode-editor-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 6px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.next-up-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 12px;
    color: var(--vscode-foreground, #cccccc);
}

.next-up-info {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #717171);
}

.next-up-value {
    color: var(--vscode-foreground, #cccccc);
    font-weight: 500;
}

.next-up-actions {
    display: flex;
    justify-content: flex-end;
}

.next-up-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    background: transparent;
    color: var(--vscode-foreground, #cccccc);
    cursor: pointer;
    font-size: 11px;
}

.next-up-btn:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
    border-color: #d97757;
}

/* ===== File Tree Dialog ===== */
.file-tree-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.file-tree-panel {
    width: 420px;
    max-height: 70vh;
    background: var(--vscode-editorWidget-background, #252526);
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.file-tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
    font-size: 12px;
    font-weight: 600;
}

.file-tree-body {
    padding: 6px 0;
    overflow-y: auto;
}

.file-tree-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 3px;
    min-height: 24px;
    cursor: default;
    font-size: 12px;
}

.file-tree-row--clickable {
    cursor: pointer;
}

.file-tree-row:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.file-tree-chevron,
.file-tree-chevron-placeholder {
    width: 16px;
    min-width: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
}

.file-tree-icon {
    display: flex;
    align-items: center;
    font-size: 14px;
    min-width: 16px;
    opacity: 0.8;
}

.file-tree-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ==================== Account Center ==================== */
.account-center-view {
    --ac-github-accent: #d97757;
    --ac-github-soft: rgba(217, 119, 87, 0.12);
    --ac-opencode-accent: #4ea3ff;
    --ac-opencode-soft: rgba(78, 163, 255, 0.12);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 12px 14px;
}

.account-center-dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
}

.account-stat-card {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    background: var(--vscode-editor-background, #1e1e1e);
    border-radius: 6px;
    padding: 8px 10px;
}

.account-stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground, #717171);
}

.account-stat-value {
    margin-top: 4px;
    font-size: 17px;
    font-weight: 700;
    color: var(--vscode-foreground, #cccccc);
}

.account-stat-value--text {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.account-stat-value--list {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.45;
    white-space: normal;
    word-break: break-word;
}

.account-models-panel {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 6px;
    background: var(--vscode-editor-background, #1e1e1e);
    padding: 8px 10px;
}

.account-models-note-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground, #cccccc);
}

.account-models-note-desc {
    margin-top: 3px;
    font-size: 10px;
    line-height: 1.45;
    color: var(--vscode-descriptionForeground, #717171);
}

.account-models {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

.account-model-chip {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 10px;
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-descriptionForeground, #717171);
    font-size: 10px;
    padding: 1px 7px;
}

.account-domain-strips {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
}

.account-domain-strip {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    border-radius: 7px;
    padding: 6px 9px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    flex: 1 1 0;
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #717171);
    background: var(--vscode-editor-background, #1e1e1e);
}

.account-domain-strip .account-domain-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
}

.account-domain-strip span:last-child {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.account-domain-strip--github .account-domain-dot {
    background: var(--ac-github-accent);
}

.account-domain-strip--opencode .account-domain-dot {
    background: var(--ac-opencode-accent);
}

.account-domain-strip.active.account-domain-strip--github {
    border-color: var(--ac-github-accent);
    background: var(--ac-github-soft);
    color: var(--vscode-foreground, #cccccc);
}

.account-domain-strip.active.account-domain-strip--opencode {
    border-color: var(--ac-opencode-accent);
    background: var(--ac-opencode-soft);
    color: var(--vscode-foreground, #cccccc);
}

.account-tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.account-tab-btn {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-foreground, #cccccc);
    border-radius: 6px;
    padding: 5px 10px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 12px;
}

.account-tab-btn--github {
    border-color: color-mix(in srgb, var(--ac-github-accent) 38%, var(--vscode-panel-border, #2b2b2b) 62%);
}

.account-tab-btn--opencode {
    border-color: color-mix(in srgb, var(--ac-opencode-accent) 38%, var(--vscode-panel-border, #2b2b2b) 62%);
}

.account-tab-btn.active.account-tab-btn--github {
    border-color: var(--ac-github-accent);
    background: var(--ac-github-soft);
}

.account-tab-btn.active.account-tab-btn--opencode {
    border-color: var(--ac-opencode-accent);
    background: var(--ac-opencode-soft);
}

.account-tab-count {
    border-radius: 9px;
    padding: 0 6px;
    font-size: 10px;
    background: var(--vscode-badge-background, #4d4d4d);
    color: var(--vscode-badge-foreground, #ffffff);
}

.account-inline-toolbar-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--vscode-descriptionForeground, #717171);
}

.account-inline-toolbar {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.account-toolbar-btn {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-foreground, #cccccc);
    border-radius: 6px;
    padding: 5px 8px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    font-size: 11px;
}

.account-toolbar-btn:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.account-toolbar-btn--github {
    border-color: color-mix(in srgb, var(--ac-github-accent) 35%, var(--vscode-panel-border, #2b2b2b) 65%);
}

.account-toolbar-btn--opencode {
    border-color: color-mix(in srgb, var(--ac-opencode-accent) 35%, var(--vscode-panel-border, #2b2b2b) 65%);
}

.account-toolbar-btn--github:hover {
    border-color: var(--ac-github-accent);
    background: var(--ac-github-soft);
}

.account-toolbar-btn--opencode:hover {
    border-color: var(--ac-opencode-accent);
    background: var(--ac-opencode-soft);
}

.account-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.account-internal-panel {
    border: 1px solid color-mix(in srgb, var(--ac-opencode-accent) 38%, var(--vscode-panel-border, #2b2b2b) 62%);
    border-radius: 8px;
    background: color-mix(in srgb, var(--ac-opencode-soft) 42%, var(--vscode-editor-background, #1e1e1e) 58%);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.account-internal-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--ac-opencode-accent) 28%, var(--vscode-panel-border, #2b2b2b) 72%);
}

.account-internal-panel-title-wrap {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.account-internal-panel-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--vscode-foreground, #cccccc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.account-internal-panel-url {
    font-size: 10px;
    color: var(--vscode-descriptionForeground, #717171);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.account-internal-panel-body {
    min-height: 380px;
    background: var(--vscode-editor-background, #1e1e1e);
}

.account-internal-iframe {
    width: 100%;
    height: 460px;
    border: none;
    background: #0f0f0f;
}

.account-row {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    background: var(--vscode-editor-background, #1e1e1e);
    border-radius: 6px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.account-row--github {
    border-color: color-mix(in srgb, var(--ac-github-accent) 28%, var(--vscode-panel-border, #2b2b2b) 72%);
}

.account-row--opencode {
    border-color: color-mix(in srgb, var(--ac-opencode-accent) 28%, var(--vscode-panel-border, #2b2b2b) 72%);
}

.account-row--active.account-row--github {
    border-color: var(--ac-github-accent);
    background: var(--ac-github-soft);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ac-github-accent) 45%, transparent 55%);
}

.account-row--active.account-row--opencode {
    border-color: var(--ac-opencode-accent);
    background: var(--ac-opencode-soft);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ac-opencode-accent) 45%, transparent 55%);
}

.account-row-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(120px, 42%);
    align-items: start;
    gap: 10px;
}

.account-row-name-wrap {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    flex-wrap: nowrap;
}

.account-row-name {
    min-width: 0;
    font-size: 12px;
    font-weight: 700;
    color: var(--vscode-foreground, #cccccc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.account-row-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--vscode-badge-background, #4d4d4d);
    color: var(--vscode-badge-foreground, #ffffff);
    flex-shrink: 0;
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.account-row-desc {
    justify-self: end;
    min-width: 0;
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #717171);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
    max-width: 100%;
}

.account-row-subtitle {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #717171);
    white-space: normal;
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: anywhere;
}

.account-row-kv-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 10px;
    border: 1px dashed color-mix(in srgb, var(--ac-opencode-accent) 25%, var(--vscode-panel-border, #2b2b2b) 75%);
    border-radius: 6px;
    background: color-mix(in srgb, var(--ac-opencode-soft) 24%, var(--vscode-editor-background, #1e1e1e) 76%);
    padding: 6px 8px;
}

.account-row-kv-item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    border: 1px solid color-mix(in srgb, var(--ac-opencode-accent) 22%, var(--vscode-panel-border, #2b2b2b) 78%);
    border-radius: 5px;
    padding: 6px 8px;
    background: color-mix(in srgb, var(--ac-opencode-soft) 18%, var(--vscode-editor-background, #1e1e1e) 82%);
}

.account-row-kv-item--full {
    grid-column: 1 / -1;
    background: color-mix(in srgb, var(--ac-opencode-soft) 14%, var(--vscode-editor-background, #1e1e1e) 86%);
}

.account-row-kv-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground, #717171);
    text-transform: uppercase;
    letter-spacing: 0.25px;
}

.account-row-kv-value {
    min-width: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground, #cccccc);
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
}

.account-row-kv-item:not(.account-row-kv-item--full) .account-row-kv-value {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.account-row-kv-item--full .account-row-kv-value {
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
}

.account-row-kv-value--mono {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.45;
}

.account-row-meta-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.account-row-meta {
    font-size: 10px;
    color: var(--vscode-descriptionForeground, #717171);
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.account-row-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 5px;
}

.account-row-action {
    border: 1px solid var(--vscode-panel-border, #2b2b2b);
    background: transparent;
    color: var(--vscode-foreground, #cccccc);
    border-radius: 4px;
    padding: 3px 8px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 11px;
}

.account-row-action:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.account-row-action--github {
    border-color: color-mix(in srgb, var(--ac-github-accent) 35%, var(--vscode-panel-border, #2b2b2b) 65%);
}

.account-row-action--opencode {
    border-color: color-mix(in srgb, var(--ac-opencode-accent) 35%, var(--vscode-panel-border, #2b2b2b) 65%);
}

.account-row-action--github:hover {
    border-color: var(--ac-github-accent);
    background: var(--ac-github-soft);
}

.account-row-action--opencode:hover {
    border-color: var(--ac-opencode-accent);
    background: var(--ac-opencode-soft);
}

.account-row-action.danger {
    color: var(--vscode-errorForeground, #f48771);
    border-color: #f4877166;
}

.account-row-action.disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

@media (max-width: 640px) {
    .account-center-dashboard {
        grid-template-columns: 1fr;
    }

    .account-row-head {
        grid-template-columns: minmax(0, 1fr);
        gap: 5px;
    }

    .account-row-desc {
        justify-self: start;
        text-align: left;
    }

    .account-row-kv-list {
        grid-template-columns: minmax(0, 1fr);
    }
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
