/**
 * Drag-and-drop URI extraction helper.
 * Handles multiple DataTransfer MIME types for broad compatibility
 * (OS file explorer, VS Code Explorer, intra-webview).
 */

/** MIME types to try, in priority order */
const URI_MIME_TYPES = [
    'text/uri-list',
    'application/vnd.code.uri-list',
    'text/plain',
] as const;

const VS_CODE_TREE_PREFIX = 'application/vnd.code.tree';

function normalizeToUri(raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;

    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
        return value;
    }

    // Windows absolute path -> file URI
    if (/^[a-zA-Z]:[\\/]/.test(value)) {
        const normalized = value.replace(/\\/g, '/');
        return `file:///${normalized.replace(/^\//, '')}`;
    }

    // POSIX absolute path -> file URI
    if (value.startsWith('/')) {
        return `file://${value}`;
    }

    return null;
}

function parseUriLines(text: string): string[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const result: string[] = [];
    for (const line of lines) {
        if (line.startsWith('#')) continue;
        const uri = normalizeToUri(line);
        if (uri && !result.includes(uri)) result.push(uri);
    }
    return result;
}

function parseJsonUris(text: string): string[] {
    try {
        const data = JSON.parse(text) as unknown;
        const uris: string[] = [];

        const pushUri = (value?: string) => {
            if (!value) return;
            const normalized = normalizeToUri(value);
            if (normalized && !uris.includes(normalized)) uris.push(normalized);
        };

        if (Array.isArray(data)) {
            for (const item of data) {
                if (typeof item === 'string') {
                    pushUri(item);
                } else if (item && typeof item === 'object') {
                    const maybe = (item as { resourceUri?: string }).resourceUri;
                    pushUri(maybe);
                }
            }
        } else if (data && typeof data === 'object') {
            const obj = data as { resourceUri?: string; resources?: string[] };
            pushUri(obj.resourceUri);
            if (Array.isArray(obj.resources)) {
                for (const item of obj.resources) pushUri(item);
            }
        }

        return uris;
    } catch {
        return [];
    }
}

/**
 * Extract file/folder URIs from a DragEvent.
 * Tries multiple MIME types and falls back to DataTransfer.files.
 */
export function extractDropUris(e: DragEvent): string[] {
    if (!e.dataTransfer) return [];

    const uris: string[] = [];

    // 1. Try known MIME types
    for (const mime of URI_MIME_TYPES) {
        try {
            const text = e.dataTransfer.getData(mime);
            if (!text) continue;
            const parsed = parseUriLines(text);
            for (const uri of parsed) {
                if (!uris.includes(uri)) uris.push(uri);
            }
            if (uris.length > 0) return uris;
        } catch {
            // getData may throw for some types
        }
    }

    // 2. Scan all available types for anything URI-like
    if (e.dataTransfer.types) {
        for (const type of e.dataTransfer.types) {
            if (URI_MIME_TYPES.includes(type as typeof URI_MIME_TYPES[number])) continue;
            try {
                const data = e.dataTransfer.getData(type);
                if (!data) continue;

                if (type.startsWith(VS_CODE_TREE_PREFIX)) {
                    const parsed = parseJsonUris(data);
                    for (const uri of parsed) {
                        if (!uris.includes(uri)) uris.push(uri);
                    }
                    if (uris.length > 0) return uris;
                }

                const parsed = parseUriLines(data);
                for (const uri of parsed) {
                    if (!uris.includes(uri)) uris.push(uri);
                }
                if (uris.length > 0) return uris;
            } catch {
                // getData may throw for some types
            }
        }
    }

    // 3. Fallback: DataTransfer.files (Electron webview may expose .path)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            const file = e.dataTransfer.files[i];
            // Electron File objects may have a `path` property
            const filePath = (file as File & { path?: string }).path;
            if (filePath) {
                const fileUri = normalizeToUri(filePath);
                if (fileUri && !uris.includes(fileUri)) uris.push(fileUri);
            }
        }
    }

    // 4. Fallback: DataTransfer.items
    if (uris.length === 0 && e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            const item = e.dataTransfer.items[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) {
                    const filePath = (file as File & { path?: string }).path;
                    if (filePath) {
                        const fileUri = normalizeToUri(filePath);
                        if (fileUri && !uris.includes(fileUri)) uris.push(fileUri);
                    }
                }
            }
        }
    }

    return uris;
}
