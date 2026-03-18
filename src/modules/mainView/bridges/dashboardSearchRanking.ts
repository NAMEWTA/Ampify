export interface WeightedSearchFields {
    title: string;
    tags?: string[];
    description?: string;
    subtitle?: string;
    scope?: string;
    extraKeywords?: string[];
}

export interface WeightedResult<T> {
    item: T;
    score: number;
}

interface SecondaryRankSignals {
    titlePrefixHits: number;
    titleMiddleHits: number;
    tagHitDensity: number;
    descriptionHitDensity: number;
}

const FIELD_WEIGHTS = {
    title: 1000,
    tags: 450,
    subtitle: 160,
    description: 90,
    scope: 50,
    extra: 30
} as const;

export function tokenizeQuery(query: string): string[] {
    return query
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}

export function rankByWeightedSearch<T>(
    items: T[],
    query: string,
    getFields: (item: T) => WeightedSearchFields
): WeightedResult<T>[] {
    const tokens = tokenizeQuery(query);

    if (tokens.length === 0) {
        return items.map((item, index) => ({ item, score: items.length - index }));
    }

    return items
        .map((item, index) => ({ item, index, fields: normalizeFields(getFields(item)) }))
        .filter(({ fields }) => tokens.every((token) => matchesToken(fields, token)))
        .map(({ item, index, fields }) => ({
            item,
            index,
            score: scoreFields(fields, tokens),
            secondary: buildSecondarySignals(fields, tokens)
        }))
        .sort((a, b) => compareRankedEntries(a, b, getFields))
        .map(({ item, score }) => ({ item, score }));
}

type NormalizedFields = {
    title: string;
    tags: string[];
    description: string;
    subtitle: string;
    scope: string;
    extraKeywords: string[];
    joined: string;
};

function normalizeFields(fields: WeightedSearchFields): NormalizedFields {
    const title = normalizeText(fields.title);
    const tags = (fields.tags || []).map(normalizeText).filter(Boolean);
    const description = normalizeText(fields.description || '');
    const subtitle = normalizeText(fields.subtitle || '');
    const scope = normalizeText(fields.scope || '');
    const extraKeywords = (fields.extraKeywords || []).map(normalizeText).filter(Boolean);

    return {
        title,
        tags,
        description,
        subtitle,
        scope,
        extraKeywords,
        joined: [title, ...tags, subtitle, description, scope, ...extraKeywords].join(' ')
    };
}

function normalizeText(text: string): string {
    return text.toLowerCase().trim();
}

function matchesToken(fields: NormalizedFields, token: string): boolean {
    return fields.joined.includes(token);
}

function scoreFields(fields: NormalizedFields, tokens: string[]): number {
    let total = 0;
    for (const token of tokens) {
        total += scoreTokenInFields(fields, token);
    }
    return total;
}

function scoreTokenInFields(fields: NormalizedFields, token: string): number {
    const scores = [
        scoreInText(fields.title, token, FIELD_WEIGHTS.title),
        ...fields.tags.map((tag) => scoreInText(tag, token, FIELD_WEIGHTS.tags)),
        scoreInText(fields.subtitle, token, FIELD_WEIGHTS.subtitle),
        scoreInText(fields.description, token, FIELD_WEIGHTS.description),
        scoreInText(fields.scope, token, FIELD_WEIGHTS.scope),
        ...fields.extraKeywords.map((keyword) => scoreInText(keyword, token, FIELD_WEIGHTS.extra))
    ];

    return scores.reduce((max, score) => Math.max(max, score), 0);
}

function scoreInText(text: string, token: string, weight: number): number {
    if (!text) {
        return 0;
    }

    const index = text.indexOf(token);
    if (index === -1) {
        return 0;
    }

    return weight;
}

function getStableTitle<T>(item: T, getFields: (item: T) => WeightedSearchFields): string {
    return normalizeText(getFields(item).title || '');
}

function buildSecondarySignals(fields: NormalizedFields, tokens: string[]): SecondaryRankSignals {
    return {
        titlePrefixHits: countTitlePrefixHits(fields.title, tokens),
        titleMiddleHits: countTitleMiddleHits(fields.title, tokens),
        tagHitDensity: computeTagHitDensity(fields.tags, tokens),
        descriptionHitDensity: computeDescriptionHitDensity(fields.description, tokens)
    };
}

function countTitlePrefixHits(title: string, tokens: string[]): number {
    return tokens.reduce((total, token) => total + (title.startsWith(token) ? 1 : 0), 0);
}

function countTitleMiddleHits(title: string, tokens: string[]): number {
    return tokens.reduce((total, token) => {
        const index = title.indexOf(token);
        return total + (index > 0 ? 1 : 0);
    }, 0);
}

function computeTagHitDensity(tags: string[], tokens: string[]): number {
    if (tags.length === 0 || tokens.length === 0) {
        return 0;
    }

    let matchedPairs = 0;
    for (const tag of tags) {
        for (const token of tokens) {
            if (tag.includes(token)) {
                matchedPairs += 1;
            }
        }
    }

    return matchedPairs / (tags.length * tokens.length);
}

function computeDescriptionHitDensity(description: string, tokens: string[]): number {
    if (!description || tokens.length === 0) {
        return 0;
    }

    const words = description.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return 0;
    }

    let matchedTokenCount = 0;
    for (const token of tokens) {
        if (description.includes(token)) {
            matchedTokenCount += 1;
        }
    }

    return matchedTokenCount / words.length;
}

function compareRankedEntries<T>(
    a: { item: T; index: number; score: number; secondary: SecondaryRankSignals },
    b: { item: T; index: number; score: number; secondary: SecondaryRankSignals },
    getFields: (item: T) => WeightedSearchFields
): number {
    if (b.score !== a.score) {
        return b.score - a.score;
    }

    if (b.secondary.titlePrefixHits !== a.secondary.titlePrefixHits) {
        return b.secondary.titlePrefixHits - a.secondary.titlePrefixHits;
    }

    if (b.secondary.titleMiddleHits !== a.secondary.titleMiddleHits) {
        return b.secondary.titleMiddleHits - a.secondary.titleMiddleHits;
    }

    if (b.secondary.tagHitDensity !== a.secondary.tagHitDensity) {
        return b.secondary.tagHitDensity - a.secondary.tagHitDensity;
    }

    if (b.secondary.descriptionHitDensity !== a.secondary.descriptionHitDensity) {
        return b.secondary.descriptionHitDensity - a.secondary.descriptionHitDensity;
    }

    const titleCompare = getStableTitle(a.item, getFields).localeCompare(getStableTitle(b.item, getFields));
    if (titleCompare !== 0) {
        return titleCompare;
    }

    return a.index - b.index;
}
