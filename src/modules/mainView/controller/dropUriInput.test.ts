import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { normalizeDroppedUriInput } from './dropUriInput';

test('treats Windows markdown file paths as file inputs', () => {
    assert.deepEqual(normalizeDroppedUriInput('C:\\workspace\\agents\\reviewer.md'), {
        kind: 'filePath',
        value: 'C:\\workspace\\agents\\reviewer.md'
    });
});

test('treats UNC paths as file inputs', () => {
    assert.deepEqual(normalizeDroppedUriInput('\\\\server\\share\\rules\\style.md'), {
        kind: 'filePath',
        value: '\\\\server\\share\\rules\\style.md'
    });
});

test('keeps file URIs as URIs', () => {
    assert.deepEqual(normalizeDroppedUriInput('file:///C:/workspace/agents/reviewer.md'), {
        kind: 'uri',
        value: 'file:///C:/workspace/agents/reviewer.md'
    });
});

test('ignores blank inputs', () => {
    assert.equal(normalizeDroppedUriInput('   '), null);
});
