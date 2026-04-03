export interface EditorSelectionSnapshot {
    kind: 'editorSelection';
    // Absolute path to the active editor file.
    absolutePath: string;
    isEmptySelection: boolean;
    // 0-based line index.
    activeLine: number;
    // 0-based selection bounds from VS Code; may be reversed and require normalization.
    startLine: number;
    endLine: number;
    // 0-based character bounds; for single-line selection these may be reversed and require normalization.
    startCharacter: number;
    endCharacter: number;
}

export interface FileListSnapshot {
    kind: 'fileList';
    absolutePaths: string[];
}

export type CopySourceSnapshot = EditorSelectionSnapshot | FileListSnapshot;

export type PathTransformer = (absolutePath: string) => string;
