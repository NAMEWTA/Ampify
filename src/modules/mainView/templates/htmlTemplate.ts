/**
 * HTML 妯℃澘
 * 缁勮瀹屾暣 HTML 鏂囨。
 */
import * as vscode from 'vscode';
import { getCss } from './cssTemplate';
import { getJs } from './jsTemplate';
import { SectionId } from '../protocol';
import { I18n } from '../../../common/i18n';

interface NavItem {
    id: SectionId;
    label: string;
    iconClass: string;
}

export function getHtml(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    activeSection: SectionId = 'dashboard',
    instanceKey: string = 'default'
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

    const navItems: NavItem[] = [
        { id: 'dashboard', label: I18n.get('nav.dashboard'), iconClass: 'codicon-dashboard' },
        { id: 'accountCenter', label: I18n.get('nav.accountCenter'), iconClass: 'codicon-account' },
        { id: 'skills', label: I18n.get('nav.skills'), iconClass: 'codicon-library' },
        { id: 'commands', label: I18n.get('nav.commands'), iconClass: 'codicon-terminal' },
        { id: 'gitshare', label: I18n.get('nav.gitShare'), iconClass: 'codicon-git-merge' },
        { id: 'modelProxy', label: I18n.get('nav.modelProxy'), iconClass: 'codicon-radio-tower' },
        { id: 'settings', label: I18n.get('nav.settings'), iconClass: 'codicon-settings-gear' },
    ];

    // Build nav items HTML
    const navItemsHtml = navItems.map(item => `
        <button class="nav-item${item.id === activeSection ? ' active' : ''}" data-section="${item.id}" title="${item.label}">
            <span class="nav-icon"><i class="codicon ${item.iconClass}"></i></span>
            <span class="nav-label">${item.label}</span>
        </button>
    `).join('');

    const js = getJs();
    const configuredLang = vscode.workspace.getConfiguration('ampify').get<'en' | 'zh-cn'>('language') || 'zh-cn';
    const htmlLang = configuredLang === 'zh-cn' ? 'zh-CN' : 'en';
    const i18nMap = {
        sectionDashboard: I18n.get('nav.dashboard'),
        sectionAccountCenter: I18n.get('nav.accountCenter'),
        sectionLauncher: I18n.get('dashboard.launcher'),
        sectionSkills: I18n.get('nav.skills'),
        sectionCommands: I18n.get('nav.commands'),
        sectionGitShare: I18n.get('nav.gitShare'),
        sectionModelProxy: I18n.get('nav.modelProxy'),
        sectionOpenCodeAuth: I18n.get('dashboard.opencode'),
        sectionSettings: I18n.get('nav.settings'),
        viewList: I18n.get('common.list'),
        viewCards: I18n.get('common.cards'),
        viewListTitle: I18n.get('common.listView'),
        viewCardsTitle: I18n.get('common.cardView'),
        emptySkills: I18n.get('mainView.empty.skillsTitle'),
        emptyCommands: I18n.get('mainView.empty.commandsTitle'),
        emptySkillsHint: I18n.get('mainView.empty.skillsHint'),
        emptyCommandsHint: I18n.get('mainView.empty.commandsHint'),
        noFiles: I18n.get('common.noFiles'),
        noData: I18n.get('common.noData'),
        requiredSuffix: I18n.get('common.requiredSuffix')
    };

    return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource};">
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
            <div class="account-badge" title="${instanceKey || 'default'}">
                <span class="account-letter">${(instanceKey || 'default').charAt(0).toUpperCase()}</span>
                <span class="account-label">${instanceKey || 'default'}</span>
            </div>
            <button class="nav-toggle" title="${I18n.get('nav.toggleSidebar')}">
                <i class="codicon codicon-layout-sidebar-left"></i>
            </button>
        </nav>
        <div class="content">
            <div class="toolbar">
                <span class="toolbar-title">${I18n.get('nav.dashboard')}</span>
            </div>
            <div class="content-body">
                <div class="empty-state">
                    <i class="codicon codicon-dashboard"></i>
                    <p>${I18n.get('common.loading')}</p>
                </div>
            </div>
        </div>
    </div>
    <script nonce="${nonce}">window.__ampifyI18n=${JSON.stringify(i18nMap)};</script>
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
