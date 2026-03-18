import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rankByWeightedSearch } from './dashboardSearchRanking';

interface MockSearchItem {
    id: string;
    title: string;
    tags?: string[];
    description?: string;
}

const fixtures: MockSearchItem[] = [
    {
        id: 'title-hit',
        title: 'UI UX Playbook',
        tags: ['design-system'],
        description: 'Checklist for product teams'
    },
    {
        id: 'tag-hit',
        title: 'Design Guide',
        tags: ['ui', 'ux'],
        description: 'Reference patterns for consistent interfaces'
    },
    {
        id: 'description-hit',
        title: 'Interaction Notes',
        tags: ['docs'],
        description: 'How to improve ui and ux across flows'
    },
    {
        id: 'and-pass',
        title: 'UI Basics',
        tags: ['patterns'],
        description: 'Practical ux workflow examples'
    },
    {
        id: 'and-fail',
        title: 'Only UI',
        tags: ['ui'],
        description: 'Missing the second keyword'
    }
];

function run(query: string): string[] {
    return rankByWeightedSearch(fixtures, query, (item) => ({
        title: item.title,
        tags: item.tags,
        description: item.description
    })).map((entry) => entry.item.id);
}

test('weights prioritize title over tags over description', () => {
    const ids = run('ui ux');

    assert.equal(ids[0], 'title-hit');
    assert.ok(ids.indexOf('tag-hit') < ids.indexOf('description-hit'));
});

test('space-separated tokens use AND semantics', () => {
    const ids = run('ui ux');

    assert.ok(ids.includes('and-pass'));
    assert.ok(!ids.includes('and-fail'));
});

test('fuzzy includes matching works for partial token', () => {
    const ids = run('interac');

    assert.ok(ids.includes('description-hit'));
});

test('tie-break prefers title prefix hit over title middle hit', () => {
    const items: MockSearchItem[] = [
        { id: 'middle', title: 'advanced ui patterns', tags: [], description: '' },
        { id: 'prefix', title: 'ui patterns advanced', tags: [], description: '' }
    ];

    const ids = rankByWeightedSearch(items, 'ui', (item) => ({
        title: item.title,
        tags: item.tags,
        description: item.description
    })).map((entry) => entry.item.id);

    assert.deepEqual(ids, ['prefix', 'middle']);
});

test('tie-break prefers higher tag hit density', () => {
    const items: MockSearchItem[] = [
        { id: 'sparse-tag', title: 'notes', tags: ['ui', 'misc', 'random'], description: '' },
        { id: 'dense-tag', title: 'notes', tags: ['ui'], description: '' }
    ];

    const ids = rankByWeightedSearch(items, 'ui', (item) => ({
        title: item.title,
        tags: item.tags,
        description: item.description
    })).map((entry) => entry.item.id);

    assert.deepEqual(ids, ['dense-tag', 'sparse-tag']);
});

test('tie-break prefers higher description hit density', () => {
    const items: MockSearchItem[] = [
        { id: 'sparse-desc', title: 'notes', tags: [], description: 'ui token with a lot of filler words here' },
        { id: 'dense-desc', title: 'notes', tags: [], description: 'ui token' }
    ];

    const ids = rankByWeightedSearch(items, 'ui', (item) => ({
        title: item.title,
        tags: item.tags,
        description: item.description
    })).map((entry) => entry.item.id);

    assert.deepEqual(ids, ['dense-desc', 'sparse-desc']);
});
