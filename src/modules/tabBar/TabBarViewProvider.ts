import * as vscode from 'vscode';

export type TabId = 'launcher' | 'skills' | 'commands';

interface TabConfig {
    id: TabId;
    label: string;
    icon: string;
}

const TABS: TabConfig[] = [
    { id: 'launcher', label: 'Launcher', icon: '🚀' },
    { id: 'skills', label: 'Skills', icon: '📚' },
    { id: 'commands', label: 'Commands', icon: '⌨️' }
];

export class TabBarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ampify-tab-bar';

    private _view?: vscode.WebviewView;
    private _activeTab: TabId = 'launcher';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(message => {
            if (message.command === 'switchTab') {
                vscode.commands.executeCommand('ampify.switchTab', message.tab);
            }
        });
    }

    public setActiveTab(tab: TabId): void {
        this._activeTab = tab;
        if (this._view) {
            this._view.webview.postMessage({ command: 'setActiveTab', tab });
        }
    }

    public getActiveTab(): TabId {
        return this._activeTab;
    }

    private _getHtmlForWebview(_webview: vscode.Webview): string {
        const tabButtons = TABS.map(tab => `
            <button 
                class="tab-btn ${tab.id === this._activeTab ? 'active' : ''}" 
                data-tab="${tab.id}"
                title="${tab.label}"
            >
                <span class="icon">${tab.icon}</span>
                <span class="label">${tab.label}</span>
            </button>
        `).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        html, body {
            height: 36px;
            max-height: 36px;
            overflow: hidden;
            background: transparent;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        .tab-bar {
            display: flex;
            height: 32px;
            background: var(--vscode-sideBar-background);
            border-radius: 6px;
            padding: 2px;
            gap: 2px;
        }
        .tab-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            height: 28px;
            border: none;
            border-radius: 4px;
            background: transparent;
            color: var(--vscode-foreground);
            cursor: pointer;
            transition: background-color 0.15s ease;
            font-size: 11px;
            padding: 0 8px;
            opacity: 0.7;
        }
        .tab-btn:hover {
            background: var(--vscode-list-hoverBackground);
            opacity: 1;
        }
        .tab-btn.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            opacity: 1;
        }
        .tab-btn .icon {
            font-size: 12px;
        }
        .tab-btn .label {
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="tab-bar">
        ${tabButtons}
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                vscode.postMessage({ command: 'switchTab', tab });
            });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'setActiveTab') {
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-tab') === message.tab);
                });
            }
        });
    </script>
</body>
</html>`;
    }
}
