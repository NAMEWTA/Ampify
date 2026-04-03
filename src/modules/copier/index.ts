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

type ExplorerInput = vscode.Uri | vscode.Uri[];

function isValidUri(value: unknown): value is vscode.Uri {
    const uriCtor = vscode.Uri as unknown as {
        isUri?: (candidate: unknown) => candidate is vscode.Uri;
    };

    if (typeof uriCtor.isUri === 'function') {
        return uriCtor.isUri(value);
    }

    return value instanceof vscode.Uri;
}

function toExplorerInput(value: unknown): ExplorerInput | undefined {
    if (Array.isArray(value)) {
        const uris = value.filter((item): item is vscode.Uri => isValidUri(item));
        return uris.length > 0 ? uris : undefined;
    }

    if (isValidUri(value)) {
        return value;
    }

    return undefined;
}

function pickExplorerInput(args: unknown[]): { explorerInput: ExplorerInput | undefined; explorerProvided: boolean } {
    if (args.length === 0) {
        return { explorerInput: undefined, explorerProvided: false };
    }

    const multiSelectionArg = args[1];
    if (Array.isArray(multiSelectionArg)) {
        const explorerInput = toExplorerInput(multiSelectionArg);
        return {
            explorerInput,
            explorerProvided: true
        };
    }

    const primaryArg = args[0];
    if (Array.isArray(primaryArg) || isValidUri(primaryArg)) {
        const explorerInput = toExplorerInput(primaryArg);
        return {
            explorerInput,
            explorerProvided: true
        };
    }

    return {
        explorerInput: undefined,
        explorerProvided: false
    };
}

export function registerCopier(context: vscode.ExtensionContext) {
    const transformPath: PathTransformer = (absolutePath) => vscode.workspace.asRelativePath(absolutePath, false);

    const showCopiedMessage = (msg: string) => {
        vscode.window.setStatusBarMessage(I18n.get('copier.copied', msg), 3000);
    };

    const showCopyFailedMessage = (error: unknown) => {
        const reason = error instanceof Error && error.message.trim().length > 0 ? error.message : String(error ?? '-');
        vscode.window.showErrorMessage(I18n.get('copier.copyFailed', reason));
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
