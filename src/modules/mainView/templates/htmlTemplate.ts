import * as fs from 'fs';
import * as vscode from 'vscode';

export function getHtml(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
): string {
    const nonce = getNonce();
    const cssUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'webview-dist', 'mainView', 'main.css')
    );
    const jsUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'webview-dist', 'mainView', 'main.js')
    );
    const codiconCssUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
    );

    const cssPath = vscode.Uri.joinPath(extensionUri, 'webview-dist', 'mainView', 'main.css').fsPath;
    const jsPath = vscode.Uri.joinPath(extensionUri, 'webview-dist', 'mainView', 'main.js').fsPath;

    if (!fs.existsSync(cssPath) || !fs.existsSync(jsPath)) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <style>
        html, body { height: 100%; margin: 0; }
        body {
            display: grid;
            place-items: center;
            background: var(--vscode-sideBar-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
        }
        .fallback {
            max-width: 420px;
            padding: 24px;
            border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.25));
            border-radius: 16px;
            background: var(--vscode-editorWidget-background, rgba(255,255,255,0.03));
        }
    </style>
</head>
<body>
    <div class="fallback">
        <h3>MainView assets not built</h3>
        <p>Run <code>npm run compile</code> to generate the Vue webview bundle.</p>
    </div>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src ${webview.cspSource} 'nonce-${nonce}';">
    <link rel="stylesheet" href="${codiconCssUri}">
    <link rel="stylesheet" href="${cssUri}">
</head>
<body>
    <div id="app"></div>
    <script nonce="${nonce}">
        const ampifyGlobal = globalThis;
        ampifyGlobal.process = ampifyGlobal.process || { env: { NODE_ENV: 'production' } };
        ampifyGlobal.process.env = ampifyGlobal.process.env || { NODE_ENV: 'production' };
        ampifyGlobal.process.env.NODE_ENV = ampifyGlobal.process.env.NODE_ENV || 'production';
        ampifyGlobal.global = ampifyGlobal;
        ampifyGlobal.__VUE_OPTIONS_API__ = true;
        ampifyGlobal.__VUE_PROD_DEVTOOLS__ = false;
        ampifyGlobal.__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false;
    </script>
    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i += 1) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
