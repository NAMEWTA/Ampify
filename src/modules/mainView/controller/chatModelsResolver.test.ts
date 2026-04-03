import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolveChatModels } from './chatModelsResolver';

test('returns models when selection resolves before timeout', async () => {
    const result = await resolveChatModels(async () => [
        { id: 'm1', name: 'Model 1' }
    ], 80);

    assert.equal(result.timedOut, false);
    assert.equal(result.failed, false);
    assert.deepEqual(result.models, [{ id: 'm1', name: 'Model 1' }]);
});

test('falls back with timedOut when selection does not resolve in time', async () => {
    const result = await resolveChatModels(async () => await new Promise<never>(() => {}), 20);

    assert.equal(result.timedOut, true);
    assert.equal(result.failed, false);
    assert.deepEqual(result.models, []);
});

test('falls back with failed when selection throws', async () => {
    const result = await resolveChatModels(async () => {
        throw new Error('lm unavailable');
    }, 80);

    assert.equal(result.timedOut, false);
    assert.equal(result.failed, true);
    assert.deepEqual(result.models, []);
});
