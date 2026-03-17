import type { SectionId, SectionViewModel } from '@shared/contracts';
import { defineStore } from 'pinia';

export const useSectionsStore = defineStore('sections', {
    state: () => ({
        sections: {} as Partial<Record<SectionId, SectionViewModel>>
    }),
    actions: {
        setSection(section: SectionId, data: SectionViewModel) {
            this.sections[section] = data;
        }
    }
});
