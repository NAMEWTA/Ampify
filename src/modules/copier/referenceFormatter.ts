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

function formatEditorSelection(
    source: EditorSelectionSnapshot,
    useRelativePath: boolean,
    transformPath: PathTransformer
): string {
    const path = resolvePath(source.absolutePath, useRelativePath, transformPath);

    if (source.isEmptySelection) {
        return toInlineReference(`${path}:${source.activeLine + 1}`);
    }

    const startLine = source.startLine + 1;
    const endLine = source.endLine + 1;

    if (startLine !== endLine) {
        return toInlineReference(`${path}:${startLine}-${endLine}`);
    }

    const startCol = source.startCharacter + 1;
    const endCol = source.endCharacter + 1;
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
