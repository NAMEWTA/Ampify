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
    if (typeof maybeUri.fsPath !== 'string' || maybeUri.fsPath.length === 0) {
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

export function resolveCopySource(
    explorerInput: unknown,
    editorInput?: EditorSnapshotInput,
    explorerProvided = false
): CopySourceSnapshot | null {
    const explorerPaths = normalizeExplorerPaths(explorerInput);
    if (explorerPaths.length > 0) {
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
