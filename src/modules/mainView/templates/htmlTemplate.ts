/**
 * HTML 模板
 * 组装完整 HTML 文档
 */
import * as vscode from 'vscode';
import { getCss } from './cssTemplate';
import { getJs } from './jsTemplate';
import { SectionId } from '../protocol';

interface NavItem {
    id: SectionId;
    label: string;
    iconClass: string;
}

const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', iconClass: 'codicon-dashboard' },
    { id: 'launcher', label: 'Launcher', iconClass: 'codicon-rocket' },
    { id: 'skills', label: 'Skills', iconClass: 'codicon-library' },
    { id: 'commands', label: 'Commands', iconClass: 'codicon-terminal' },
    { id: 'gitshare', label: 'Git Sync', iconClass: 'codicon-git-merge' },
    { id: 'settings', label: 'Settings', iconClass: 'codicon-settings-gear' },
];

export function getHtml(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    activeSection: SectionId = 'dashboard'
): string {
    // Nonce for CSP
    const nonce = getNonce();

    // Codicon font & CSS URIs
    const codiconFontUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.ttf')
    );
    const codiconCssUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
    );

    // Build CSS with codicon font URI injected
    const css = getCss().replace('{codiconUri}', codiconFontUri.toString());

    // Build nav items HTML
    const navItemsHtml = NAV_ITEMS.map(item => `
        <button class="nav-item${item.id === activeSection ? ' active' : ''}" data-section="${item.id}" title="${item.label}">
            <span class="nav-icon"><i class="codicon ${item.iconClass}"></i></span>
            <span class="nav-label">${item.label}</span>
        </button>
    `).join('');

    const js = getJs();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${codiconCssUri}">
    <style nonce="${nonce}">${css}</style>
</head>
<body>
    <div class="app">
        <nav class="nav-rail">
            <div class="nav-header">
                <span class="logo-letter">A</span>
                <span class="logo">mpify</span>
            </div>
            <div class="nav-items">
                ${navItemsHtml}
            </div>
            <button class="nav-toggle" title="Toggle sidebar">
                <i class="codicon codicon-layout-sidebar-left"></i>
            </button>
        </nav>
        <div class="content">
            <div class="toolbar">
                <span class="toolbar-title">DASHBOARD</span>
            </div>
            <div class="content-body">
                <div class="empty-state">
                    <i class="codicon codicon-dashboard"></i>
                    <p>Loading...</p>
                </div>
            </div>
        </div>
    </div>
    <script nonce="${nonce}">${js}</script>
</body>
</html>`;
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
