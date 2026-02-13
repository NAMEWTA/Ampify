import * as http from 'http';
import * as https from 'https';
import * as vscode from 'vscode';
import { AiTaggingConfig, AiTagLibraryItem } from '../types';
import { normalizeTags } from '../frontmatter';

export interface AiTaggingTaskItem {
    id: string;
    name: string;
    filePath: string;
}

export interface AiTaggingProgressItem {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    tags?: string[];
    error?: string;
}

export interface AiTaggingProgressSnapshot {
    running: boolean;
    total: number;
    completed: number;
    percent: number;
    items: AiTaggingProgressItem[];
}

export interface AiTaggingBatchOptions {
    config: AiTaggingConfig;
    library: AiTagLibraryItem[];
    items: AiTaggingTaskItem[];
    onProgress?: (snapshot: AiTaggingProgressSnapshot) => Promise<void> | void;
    onItemSuccess?: (item: AiTaggingTaskItem, tags: string[]) => Promise<void> | void;
}

function buildPrompt(content: string, library: AiTagLibraryItem[]): string {
    const libraryText = library.length > 0
        ? library.map(item => `- ${item.name}: ${item.description || 'no description'}`).join('\n')
        : '(empty)';

    return [
        'You are an expert metadata tagger for markdown libraries.',
        'Read the content and summarize mentally, then output tags.',
        'You must choose tags only from the provided tag library.',
        'Return strict JSON only with this schema:',
        '{"summary":"string","tags":["tag-a","tag-b"]}',
        'Tag library (name: meaning):',
        libraryText,
        'Rules:',
        '- 0 to 3 tags (maximum 3)',
        '- lowercase kebab-case',
        '- no duplicates',
        '- tags must be chosen from tag library names only',
        '',
        'Content:',
        content
    ].join('\n');
}

function parseTags(raw: string): string[] {
    const text = raw.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const payload = jsonMatch ? jsonMatch[0] : text;

    try {
        const parsed = JSON.parse(payload) as { tags?: unknown };
        if (Array.isArray(parsed.tags)) {
            return normalizeTags(parsed.tags.filter((item): item is string => typeof item === 'string'));
        }
    } catch {
        const bracket = text.match(/\[[\s\S]*\]/);
        if (bracket) {
            try {
                const arr = JSON.parse(bracket[0]) as unknown[];
                const tags = arr.filter((item): item is string => typeof item === 'string');
                return normalizeTags(tags);
            } catch {
                return [];
            }
        }
    }

    return [];
}

async function readModelOutput(response: vscode.LanguageModelChatResponse): Promise<string> {
    let output = '';
    for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
            output += part.value;
        }
    }
    return output;
}

async function inferWithVsCodeChat(config: AiTaggingConfig, prompt: string): Promise<string[]> {
    const models = await vscode.lm.selectChatModels();
    if (!models || models.length === 0) {
        throw new Error('No VS Code chat model available');
    }

    let model = models[0];
    if (config.vscodeModelId) {
        const target = config.vscodeModelId.trim().toLowerCase();
        const found = models.find(m => m.id.toLowerCase() === target || m.name.toLowerCase() === target || m.family.toLowerCase() === target);
        if (found) {
            model = found;
        }
    }

    const response = await model.sendRequest([
        vscode.LanguageModelChatMessage.User(prompt)
    ], {});
    const output = await readModelOutput(response);
    return parseTags(output);
}

function requestOpenAICompatible(baseUrl: string, apiKey: string, model: string, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const endpoint = new URL('/chat/completions', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
        const payload = JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        const isHttps = endpoint.protocol === 'https:';
        const client = isHttps ? https : http;

        const req = client.request({
            protocol: endpoint.protocol,
            hostname: endpoint.hostname,
            port: endpoint.port || (isHttps ? 443 : 80),
            path: endpoint.pathname + endpoint.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'Authorization': `Bearer ${apiKey}`
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => {
                data += chunk.toString();
            });
            res.on('end', () => {
                if ((res.statusCode || 500) >= 400) {
                    reject(new Error(`OpenAI-compatible request failed: ${res.statusCode} ${data.slice(0, 200)}`));
                    return;
                }
                try {
                    const json = JSON.parse(data) as { choices?: Array<{ message?: { content?: string } }> };
                    const content = json.choices?.[0]?.message?.content || '';
                    resolve(content);
                } catch (error) {
                    reject(new Error(`Invalid OpenAI-compatible response: ${String(error)}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });
        req.write(payload);
        req.end();
    });
}

async function inferWithOpenAICompatible(config: AiTaggingConfig, prompt: string): Promise<string[]> {
    const baseUrl = (config.openaiBaseUrl || '').trim();
    const apiKey = (config.openaiApiKey || '').trim();
    const model = (config.openaiModel || '').trim();
    if (!baseUrl || !apiKey || !model) {
        throw new Error('OpenAI-compatible provider requires baseURL, apiKey, and model');
    }
    const output = await requestOpenAICompatible(baseUrl, apiKey, model, prompt);
    return parseTags(output);
}

async function inferTags(config: AiTaggingConfig, content: string, library: AiTagLibraryItem[]): Promise<string[]> {
    const prompt = buildPrompt(content, library);
    const rawTags = config.provider === 'openai-compatible'
        ? await inferWithOpenAICompatible(config, prompt)
        : await inferWithVsCodeChat(config, prompt);

    const allowed = new Set(normalizeTags(library.map(item => item.name)));
    return normalizeTags(rawTags).filter(tag => allowed.has(tag)).slice(0, 3);
}

export async function runAiTaggingBatch(options: AiTaggingBatchOptions): Promise<{ snapshot: AiTaggingProgressSnapshot }> {

    const progressItems: AiTaggingProgressItem[] = options.items.map(item => ({
        id: item.id,
        name: item.name,
        status: 'pending'
    }));

    const emit = async (running: boolean) => {
        const completed = progressItems.filter(item => item.status === 'success' || item.status === 'failed').length;
        const total = progressItems.length;
        const snapshot: AiTaggingProgressSnapshot = {
            running,
            total,
            completed,
            percent: total > 0 ? Math.round((completed / total) * 100) : 100,
            items: progressItems.map(item => ({ ...item }))
        };
        if (options.onProgress) {
            await options.onProgress(snapshot);
        }
        return snapshot;
    };

    await emit(true);

    for (let index = 0; index < options.items.length; index++) {
        const item = options.items[index];
        const progressItem = progressItems[index];
        progressItem.status = 'running';
        await emit(true);

        try {
            const doc = await vscode.workspace.fs.readFile(vscode.Uri.file(item.filePath));
            const content = Buffer.from(doc).toString('utf8');
            const tags = await inferTags(options.config, content, options.library);

            progressItem.status = 'success';
            progressItem.tags = tags;
            progressItem.error = undefined;
            await options.onItemSuccess?.(item, tags);
        } catch (error) {
            progressItem.status = 'failed';
            progressItem.error = error instanceof Error ? error.message : String(error);
        }

        await emit(true);
    }

    const finalSnapshot = await emit(false);
    return {
        snapshot: finalSnapshot
    };
}
