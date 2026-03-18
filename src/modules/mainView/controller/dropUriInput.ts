import * as path from 'path';

export type DroppedUriInput =
    | { kind: 'filePath'; value: string }
    | { kind: 'uri'; value: string };

export function normalizeDroppedUriInput(value: string): DroppedUriInput | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    if (path.win32.isAbsolute(trimmed) || path.posix.isAbsolute(trimmed)) {
        return {
            kind: 'filePath',
            value: trimmed
        };
    }

    return {
        kind: 'uri',
        value: trimmed
    };
}
