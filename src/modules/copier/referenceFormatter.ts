import type {
    CopySourceSnapshot,
    EditorSelectionSnapshot,
    PathTransformer
} from './copierTypes';

function toInlineReference(body: string): string {
    return `\`${body}\``;
}

function resolvePath(absolutePath: string, useRelativePath: boolean, transformPath: PathTransformer): string {
    if (!useRelativePath) {
        return absolutePath;
    }

    const transformed = transformPath(absolutePath);
    if (transformed.trim().length === 0) {
        return absolutePath;
    }

    return transformed;
}

function normalizeSelectionBounds(source: EditorSelectionSnapshot): {
    startLine: number;
    endLine: number;
    startCharacter: number;
    endCharacter: number;
} {
    const startLine = Math.min(source.startLine, source.endLine);
    const endLine = Math.max(source.startLine, source.endLine);

    if (startLine !== endLine) {
        return {
            startLine,
            endLine,
            startCharacter: source.startCharacter,
            endCharacter: source.endCharacter
        };
    }

    return {
        startLine,
        endLine,
        startCharacter: Math.min(source.startCharacter, source.endCharacter),
        endCharacter: Math.max(source.startCharacter, source.endCharacter)
    };
}

function formatEditorSelection(
    source: EditorSelectionSnapshot,
    useRelativePath: boolean,
    transformPath: PathTransformer
): string {
    const path = resolvePath(source.absolutePath, useRelativePath, transformPath);

    if (source.isEmptySelection) {
        return toInlineReference(path);
    }

    const normalized = normalizeSelectionBounds(source);
    const startLine = normalized.startLine + 1;
    const endLine = normalized.endLine + 1;

    if (startLine !== endLine) {
        return toInlineReference(`${path}:${startLine}-${endLine}`);
    }

    const startCol = normalized.startCharacter + 1;
    const endCol = normalized.endCharacter + 1;
    return toInlineReference(`${path}:${startLine}(${startCol}-${endCol})`);
}

function formatFileList(
    absolutePaths: string[],
    useRelativePath: boolean,
    transformPath: PathTransformer
): string {
    const lines = absolutePaths.map((absolutePath) => resolvePath(absolutePath, useRelativePath, transformPath));
    return `\`\`\`\n${lines.join('\n')}\n\`\`\``;
}

export function formatCopyReference(
    source: CopySourceSnapshot,
    useRelativePath: boolean,
    transformPath: PathTransformer
): string {
    if (source.kind === 'editorSelection') {
        return formatEditorSelection(source, useRelativePath, transformPath);
    }

    return formatFileList(source.absolutePaths, useRelativePath, transformPath);
}
