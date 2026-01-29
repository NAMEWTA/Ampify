import * as vscode from 'vscode';
import { I18n } from '../../common/i18n';

export function registerCopier(context: vscode.ExtensionContext) {
    let buildReference = function (useRelativePath: boolean) {
        let msg = I18n.get('copier.noFilePath');

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
        vscode.window.setStatusBarMessage(I18n.get('copier.copied', msg), 3000);
    };

    console.log('Module "Copier" loaded');

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
