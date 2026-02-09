/**
 * Vue Webview HTML 模板
 * 读取 Vite 构建输出的 index.html，注入 Webview URI 与 CSP
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { SectionId } from '@ampify/shared';

/**
 * 生成 Webview HTML（从 Vite 构建产物加载）
 * 兼容回退：如果构建产物不存在，返回提示信息
 */
export function getVueHtml(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    activeSection: SectionId = 'dashboard',
    instanceKey: string = 'default'
): string {
    const nonce = getNonce();

    // Vite 构建输出目录
    const webviewOutDir = vscode.Uri.joinPath(extensionUri, 'out', 'webview');
    const indexHtmlPath = path.join(webviewOutDir.fsPath, 'index.html');

    // Codicon CSS URI
    const codiconCssUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
    );

    // 检查构建产物是否存在
    if (!fs.existsSync(indexHtmlPath)) {
        return getFallbackHtml(nonce, webview, codiconCssUri);
    }

    let html = fs.readFileSync(indexHtmlPath, 'utf-8');

    // 将相对路径的 asset 引用转换为 webview URI
    // Vite 输出形如: /assets/index-xxx.js, /assets/index-xxx.css
    // 或相对形如: ./assets/..., assets/...
    // 替换 src 和 href 中的 asset 引用为 webview URI
    // Vite 输出形如: /assets/index.js, /assets/style.css
    html = html.replace(/(src|href)="[./]*(assets\/[^"]+)"/g, (_match, attr, assetPath) => {
        const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewOutDir, assetPath));
        return `${attr}="${assetUri}"`;
    });

    // 注入 nonce 到 script 和 style 标签
    html = html.replace(/<script/g, `<script nonce="${nonce}"`);
    html = html.replace(/<link rel="stylesheet"/g, `<link rel="stylesheet" nonce="${nonce}"`);

    // 注入 CSP meta 标签（替换或插入到 <head> 后）
    const csp = `default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;`;
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

    // 如果已有 CSP meta，替换；否则注入到 <head> 后
    if (html.includes('Content-Security-Policy')) {
        html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/, cspMeta);
    } else {
        html = html.replace('<head>', `<head>\n    ${cspMeta}`);
    }

    // 注入 codicon CSS
    html = html.replace('</head>',
        `    <link rel="stylesheet" nonce="${nonce}" href="${codiconCssUri}">\n</head>`);

    // 注入初始状态数据（activeSection, instanceKey）供 Vue app 读取
    const initScript = `<script nonce="${nonce}">window.__AMPIFY_INIT__=${JSON.stringify({
        activeSection,
        instanceKey
    })};</script>`;
    html = html.replace('<body>', `<body>\n    ${initScript}`);

    return html;
}

/**
 * 构建产物不存在时的回退页面
 */
function getFallbackHtml(
    nonce: string,
    webview: vscode.Webview,
    codiconCssUri: vscode.Uri
): string {
    const csp = `default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <link rel="stylesheet" href="${codiconCssUri}">
    <style nonce="${nonce}">
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
        }
        .message { text-align: center; }
        .message i { font-size: 48px; opacity: 0.4; }
        .message p { margin-top: 12px; }
        .message code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="message">
        <i class="codicon codicon-warning"></i>
        <p>Webview build artifacts not found.</p>
        <p>Run <code>npm run compile:webview</code> to build.</p>
    </div>
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
