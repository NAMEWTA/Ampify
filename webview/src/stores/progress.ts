import type { AiTaggingProgressData } from '@shared/contracts';
import { defineStore } from 'pinia';

export const useProgressStore = defineStore('progress', {
    state: () => ({
        map: {
            skills: null,
            commands: null
        } as Record<'skills' | 'commands', AiTaggingProgressData | null>
    }),
    actions: {
        setProgress(data: AiTaggingProgressData | null) {
            if (!data) {
                return;
            }
            this.map[data.target] = data;
        }
    }
});
