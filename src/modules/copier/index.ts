import * as vscode from 'vscode';
import { I18n } from '../../common/i18n';
import type { PathTransformer } from './copierTypes';
import { formatCopyReference } from './referenceFormatter';
import { resolveCopySource, type EditorSnapshotInput } from './sourceResolver';

function toEditorSnapshot(editor: vscode.TextEditor | undefined): EditorSnapshotInput | undefined {
    if (!editor) {
        return undefined;
    }

    const selection = editor.selection;
    return {
        absolutePath: editor.document.fileName,
        isUntitled: editor.document.isUntitled,
        isEmptySelection: selection.isEmpty,
        activeLine: selection.active.line,
        startLine: selection.start.line,
        endLine: selection.end.line,
        startCharacter: selection.start.character,
        endCharacter: selection.end.character
    };
}

function pickExplorerInput(args: unknown[]): { explorerInput: unknown; explorerProvided: boolean } {
    if (args.length === 0) {
        return { explorerInput: undefined, explorerProvided: false };
    }

    const multiSelectionArg = args[1];
    if (Array.isArray(multiSelectionArg)) {
        return {
            explorerInput: multiSelectionArg,
            explorerProvided: true
        };
    }

    return {
        explorerInput: args[0],
        explorerProvided: true
    };
}

export function registerCopier(context: vscode.ExtensionContext) {
    const transformPath: PathTransformer = (absolutePath) => vscode.workspace.asRelativePath(absolutePath, false);

    const showCopiedMessage = (msg: string) => {
        vscode.window.setStatusBarMessage(I18n.get('copier.copied', msg), 3000);
    };

    const showCopyFailedMessage = (error: unknown) => {
        if (error instanceof Error && error.message.trim().length > 0) {
            vscode.window.showErrorMessage(error.message);
            return;
        }

        vscode.window.showErrorMessage('Failed to copy reference to clipboard.');
    };

    const runCopyCommand = async (useRelativePath: boolean, args: unknown[]) => {
        const { explorerInput, explorerProvided } = pickExplorerInput(args);
        const source = resolveCopySource(explorerInput, toEditorSnapshot(vscode.window.activeTextEditor), explorerProvided);

        if (!source) {
            vscode.window.showErrorMessage(I18n.get('copier.noFilePath'));
            return;
        }

        const msg = formatCopyReference(source, useRelativePath, transformPath);

        try {
            await vscode.env.clipboard.writeText(msg);
            showCopiedMessage(msg);
        } catch (error) {
            showCopyFailedMessage(error);
        }
    };

    console.log('Module "Copier" loaded');

    const copyRelativePathLine = vscode.commands.registerCommand('ampify.copy-relative-path-line', (...args: unknown[]) => {
        return runCopyCommand(true, args);
    });

    const copyAbsolutePathLine = vscode.commands.registerCommand('ampify.copy-absolute-path-line', (...args: unknown[]) => {
        return runCopyCommand(false, args);
    });

    context.subscriptions.push(copyRelativePathLine, copyAbsolutePathLine);
}
