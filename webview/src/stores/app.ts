import type { AppStatePayload, BootstrapPayload, VisibleSectionId } from '@shared/contracts';
import { defineStore } from 'pinia';
import { getPersistedState, setPersistedState } from '@/services/vscode';

export const useAppStore = defineStore('app', {
    state: () => {
        const persisted = getPersistedState();
        return {
            bootstrap: null as BootstrapPayload | null,
            activeSection: (persisted.activeSection as VisibleSectionId) || 'dashboard',
            navCollapsed: Boolean(persisted.navCollapsed)
        };
    },
    actions: {
        hydrate(data: BootstrapPayload) {
            this.bootstrap = data;
            this.activeSection = data.initialSection;
            this.persist();
        },
        applyAppState(data: AppStatePayload) {
            this.activeSection = data.activeSection;
            this.persist();
        },
        setNavCollapsed(value: boolean) {
            this.navCollapsed = value;
            this.persist();
        },
        persist() {
            setPersistedState({
                activeSection: this.activeSection,
                navCollapsed: this.navCollapsed
            });
        }
    }
});
