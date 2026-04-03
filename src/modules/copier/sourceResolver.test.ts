import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolveCopySource } from './sourceResolver';
import type { CopySourceSnapshot } from './copierTypes';

function createEditorInput(overrides: Partial<{
    absolutePath: string;
    isUntitled: boolean;
    isEmptySelection: boolean;
    activeLine: number;
    startLine: number;
    endLine: number;
    startCharacter: number;
    endCharacter: number;
}> = {}) {
    return {
        absolutePath: 'D:\\repo\\editor.ts',
        isUntitled: false,
        isEmptySelection: true,
        activeLine: 9,
        startLine: 9,
        endLine: 9,
        startCharacter: 0,
        endCharacter: 0,
        ...overrides
    };
}

test('explorer uris take priority over active editor snapshot', () => {
    const source = resolveCopySource(
        [{ fsPath: 'D:\\repo\\a.ts' }, { fsPath: 'D:\\repo\\b.ts' }],
        createEditorInput(),
        true
    );

    assert.deepEqual(source, {
        kind: 'fileList',
        absolutePaths: ['D:\\repo\\a.ts', 'D:\\repo\\b.ts']
    } satisfies CopySourceSnapshot);
});

test('supports single explorer uri input (non-array)', () => {
    const source = resolveCopySource({ fsPath: 'D:\\repo\\single.ts' }, createEditorInput(), true);

    assert.deepEqual(source, {
        kind: 'fileList',
        absolutePaths: ['D:\\repo\\single.ts']
    } satisfies CopySourceSnapshot);
});

test('falls back to editor when explorer input is not provided', () => {
    const source = resolveCopySource(undefined, createEditorInput(), false);

    assert.deepEqual(source, {
        kind: 'editorSelection',
        absolutePath: 'D:\\repo\\editor.ts',
        isEmptySelection: true,
        activeLine: 9,
        startLine: 9,
        endLine: 9,
        startCharacter: 0,
        endCharacter: 0
    } satisfies CopySourceSnapshot);
});

test('returns null when explorer argument exists but has no valid fsPath', () => {
    const source = resolveCopySource([{ nope: 'x' }], createEditorInput(), true);
    assert.equal(source, null);
});

test('returns null when explorer fsPath is whitespace only', () => {
    const source = resolveCopySource({ fsPath: '   \t  ' }, createEditorInput(), true);
    assert.equal(source, null);
});

test('returns null when explorer argument is an empty array with explorerProvided=true', () => {
    const source = resolveCopySource([], createEditorInput(), true);
    assert.equal(source, null);
});

test('prefers editor selection when single URI matches active editor path', () => {
    const source = resolveCopySource(
        { fsPath: 'D:\\repo\\editor.ts' },
        createEditorInput({
            absolutePath: 'D:\\repo\\editor.ts',
            isEmptySelection: false,
            startLine: 4,
            endLine: 7,
            startCharacter: 2,
            endCharacter: 9
        }),
        true
    );

    assert.deepEqual(source, {
        kind: 'editorSelection',
        absolutePath: 'D:\\repo\\editor.ts',
        isEmptySelection: false,
        activeLine: 9,
        startLine: 4,
        endLine: 7,
        startCharacter: 2,
        endCharacter: 9
    } satisfies CopySourceSnapshot);
});

test('returns null when no explorer source and no editor snapshot', () => {
    const source = resolveCopySource(undefined, undefined, false);
    assert.equal(source, null);
});

test('returns null when editor snapshot is untitled', () => {
    const source = resolveCopySource(undefined, createEditorInput({ isUntitled: true }), false);
    assert.equal(source, null);
});

test('preserves explorer selection order for multiple items', () => {
    const source = resolveCopySource(
        [{ fsPath: 'D:\\repo\\z.ts' }, { fsPath: 'D:\\repo\\a.ts' }],
        undefined,
        true
    );

    assert.deepEqual(source, {
        kind: 'fileList',
        absolutePaths: ['D:\\repo\\z.ts', 'D:\\repo\\a.ts']
    } satisfies CopySourceSnapshot);
});
