import * as path from 'node:path';
import type { CopySourceSnapshot, EditorSelectionSnapshot } from './copierTypes';

export interface EditorSnapshotInput {
    absolutePath: string;
    isUntitled: boolean;
    isEmptySelection: boolean;
    activeLine: number;
    startLine: number;
    endLine: number;
    startCharacter: number;
    endCharacter: number;
}

interface UriLike {
    fsPath?: unknown;
}

function toFsPath(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const maybeUri = value as UriLike;
    if (typeof maybeUri.fsPath !== 'string' || maybeUri.fsPath.trim().length === 0) {
        return null;
    }

    return maybeUri.fsPath;
}

function normalizeExplorerPaths(explorerInput: unknown): string[] {
    if (Array.isArray(explorerInput)) {
        return explorerInput
            .map((item) => toFsPath(item))
            .filter((path): path is string => Boolean(path));
    }

    const singlePath = toFsPath(explorerInput);
    return singlePath ? [singlePath] : [];
}

function toEditorSelection(editor: EditorSnapshotInput): EditorSelectionSnapshot {
    return {
        kind: 'editorSelection',
        absolutePath: editor.absolutePath,
        isEmptySelection: editor.isEmptySelection,
        activeLine: editor.activeLine,
        startLine: editor.startLine,
        endLine: editor.endLine,
        startCharacter: editor.startCharacter,
        endCharacter: editor.endCharacter
    };
}

function normalizeFilePath(filePath: string): string {
    const normalized = path.normalize(filePath);
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isSameFilePath(left: string, right: string): boolean {
    return normalizeFilePath(left) === normalizeFilePath(right);
}

export function resolveCopySource(
    explorerInput: unknown,
    editorInput?: EditorSnapshotInput,
    explorerProvided = false
): CopySourceSnapshot | null {
    const explorerPaths = normalizeExplorerPaths(explorerInput);
    if (explorerPaths.length > 0) {
        // VS Code passes a URI from both explorer/context and editor/context.
        // If the URI matches the active editor document, treat it as editor selection
        // so line/column references are not downgraded to a file-list block.
        if (explorerPaths.length === 1 && editorInput && !editorInput.isUntitled) {
            if (isSameFilePath(explorerPaths[0], editorInput.absolutePath)) {
                return toEditorSelection(editorInput);
            }
        }

        return {
            kind: 'fileList',
            absolutePaths: explorerPaths
        };
    }

    // Explorer has explicit priority. If explorer args were provided but invalid,
    // stop here to avoid copying an unrelated active editor reference.
    if (explorerProvided) {
        return null;
    }

    if (!editorInput || editorInput.isUntitled) {
        return null;
    }

    return toEditorSelection(editorInput);
}
