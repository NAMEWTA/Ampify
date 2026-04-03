import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { formatCopyReference } from './referenceFormatter';
import type { CopySourceSnapshot } from './copierTypes';

const repoRoot = 'D:\\Data\\01-Code\\toolCode\\Ampify\\';

function toRelativePath(absolutePath: string): string {
    if (absolutePath.startsWith(repoRoot)) {
        return absolutePath.slice(repoRoot.length);
    }

    return absolutePath;
}

test('empty selection outputs `path:line` with inline backticks', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: true,
        activeLine: 54,
        startLine: 54,
        endLine: 54,
        startCharacter: 8,
        endCharacter: 8
    };

    const text = formatCopyReference(source, true, toRelativePath);
    assert.equal(text, '`src\\modules\\copier\\index.ts:55`');
});

test('editor selection uses absolute path when useRelativePath is false', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: true,
        activeLine: 10,
        startLine: 10,
        endLine: 10,
        startCharacter: 0,
        endCharacter: 0
    };

    const text = formatCopyReference(source, false, () => {
        throw new Error('transformer should not be called when useRelativePath=false');
    });

    assert.equal(text, '`D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts:11`');
});

test('single-line non-empty selection outputs `path:line(colStart-colEnd)`', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: false,
        activeLine: 53,
        startLine: 53,
        endLine: 53,
        startCharacter: 8,
        endCharacter: 28
    };

    const text = formatCopyReference(source, true, toRelativePath);
    assert.equal(text, '`src\\modules\\copier\\index.ts:54(9-29)`');
});

test('single-line selection normalizes reversed column bounds', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: false,
        activeLine: 53,
        startLine: 53,
        endLine: 53,
        startCharacter: 28,
        endCharacter: 8
    };

    const text = formatCopyReference(source, true, toRelativePath);
    assert.equal(text, '`src\\modules\\copier\\index.ts:54(9-29)`');
});

test('multi-line selection outputs `path:start-end`', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: false,
        activeLine: 53,
        startLine: 53,
        endLine: 62,
        startCharacter: 0,
        endCharacter: 5
    };

    const text = formatCopyReference(source, true, toRelativePath);
    assert.equal(text, '`src\\modules\\copier\\index.ts:54-63`');
});

test('multi-line selection normalizes reversed line bounds before formatting range', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: false,
        activeLine: 62,
        startLine: 62,
        endLine: 53,
        startCharacter: 5,
        endCharacter: 0
    };

    const text = formatCopyReference(source, true, toRelativePath);
    assert.equal(text, '`src\\modules\\copier\\index.ts:54-63`');
});

test('file list outputs fenced block and preserves order', () => {
    const source: CopySourceSnapshot = {
        kind: 'fileList',
        absolutePaths: [
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\gitShare',
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts'
        ]
    };

    const text = formatCopyReference(source, true, toRelativePath);
    assert.equal(
        text,
        '```\nsrc\\modules\\copier\\index.ts\nsrc\\modules\\gitShare\nsrc\\extension.ts\n```'
    );
});

test('file list uses absolute paths when useRelativePath is false', () => {
    const source: CopySourceSnapshot = {
        kind: 'fileList',
        absolutePaths: [
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts'
        ]
    };

    const text = formatCopyReference(source, false, () => {
        throw new Error('transformer should not be called when useRelativePath=false');
    });

    assert.equal(
        text,
        '```\nD:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts\nD:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts\n```'
    );
});

test('single-item file list still outputs fenced block with one line', () => {
    const source: CopySourceSnapshot = {
        kind: 'fileList',
        absolutePaths: ['D:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts']
    };

    const text = formatCopyReference(source, true, toRelativePath);
    assert.equal(text, '```\nsrc\\extension.ts\n```');
});

test('falls back to absolute path when relative transformer returns empty string', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: true,
        activeLine: 10,
        startLine: 10,
        endLine: 10,
        startCharacter: 0,
        endCharacter: 0
    };

    const text = formatCopyReference(source, true, () => '');
    assert.equal(text, '`D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts:11`');
});

test('falls back to absolute path when relative transformer returns whitespace only', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: true,
        activeLine: 1,
        startLine: 1,
        endLine: 1,
        startCharacter: 0,
        endCharacter: 0
    };

    const text = formatCopyReference(source, true, () => '   ');
    assert.equal(text, '`D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts:2`');
});

test('file list branch falls back to absolute path for empty and whitespace transformer results', () => {
    const source: CopySourceSnapshot = {
        kind: 'fileList',
        absolutePaths: [
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts'
        ]
    };

    const text = formatCopyReference(source, true, (absolutePath) => {
        return absolutePath.endsWith('index.ts') ? '' : '   ';
    });

    assert.equal(
        text,
        '```\nD:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts\nD:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts\n```'
    );
});
