export interface EditorSelectionSnapshot {
    kind: 'editorSelection';
    absolutePath: string;
    isEmptySelection: boolean;
    activeLine: number;
    startLine: number;
    endLine: number;
    startCharacter: number;
    endCharacter: number;
}

export interface FileListSnapshot {
    kind: 'fileList';
    absolutePaths: string[];
}

export type CopySourceSnapshot = EditorSelectionSnapshot | FileListSnapshot;

export type PathTransformer = (absolutePath: string) => string;
