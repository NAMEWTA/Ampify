// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let buildReference = function (useRelativePath: boolean) {
        let msg = '无法获取文件路径';

        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage(msg);
            return '';
        }

        let doc = editor.document;
        if (doc.isUntitled) {
            vscode.window.showErrorMessage(msg);
            return '';
        }

        let output = '';
        output += useRelativePath ? getRelativePath(doc) : doc.fileName;

        let lineNumber = '';
        if (editor.selection.isEmpty) {
            lineNumber += editor.selection.active.line + 1;
        } else {
            let start = editor.selection.start.line + 1;
            let end = editor.selection.end.line + 1;
            if (start === end) {
                lineNumber += start;
            } else {
                lineNumber += start + '-' + end;
            }
        }

        output += ':' + lineNumber;

        return ' `' + output + '` ';
    };

    let getRelativePath = function (doc: vscode.TextDocument) {
        let workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
        if (!workspaceFolder) {
            return doc.fileName;
        }
        return vscode.workspace.asRelativePath(doc.uri, false);
    };

    let showMessage = function (msg: string) {
        vscode.window.setStatusBarMessage('已复制："' + msg + '"', 3000);
    };

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('扩展 "Ampify" 已激活');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let copyRelativePathLine = vscode.commands.registerCommand('ampify.copy-relative-path-line', () => {
        let msg = buildReference(true);
        if (msg !== '') {
            vscode.env.clipboard.writeText(msg).then(() => {
                showMessage(msg);
            });
        }
	});

    let copyAbsolutePathLine = vscode.commands.registerCommand('ampify.copy-absolute-path-line', () => {
        let msg = buildReference(false);
        if (msg !== '') {
            vscode.env.clipboard.writeText(msg).then(() => {
                showMessage(msg);
            });
        }
    });

    context.subscriptions.push(copyRelativePathLine, copyAbsolutePathLine);
}

// This method is called when your extension is deactivated
export function deactivate() {}
