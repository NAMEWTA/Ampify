export interface ChatModelLike {
    id: string;
    name: string;
}

export interface ChatModelResolveResult<TModel extends ChatModelLike> {
    models: readonly TModel[];
    timedOut: boolean;
    failed: boolean;
}

export async function resolveChatModels<TModel extends ChatModelLike>(
    selectChatModels: () => PromiseLike<readonly TModel[]>,
    timeoutMs = 1800
): Promise<ChatModelResolveResult<TModel>> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
        const raceResult = await Promise.race<
            | { kind: 'models'; models: readonly TModel[] }
            | { kind: 'timeout' }
            | { kind: 'error' }
        >([
            Promise.resolve(selectChatModels())
                .then((models) => ({ kind: 'models' as const, models }))
                .catch(() => ({ kind: 'error' as const })),
            new Promise<{ kind: 'timeout' }>((resolve) => {
                timeoutHandle = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs);
            })
        ]);

        if (raceResult.kind === 'models') {
            return { models: raceResult.models, timedOut: false, failed: false };
        }

        if (raceResult.kind === 'timeout') {
            return { models: [], timedOut: true, failed: false };
        }

        return { models: [], timedOut: false, failed: true };
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}
