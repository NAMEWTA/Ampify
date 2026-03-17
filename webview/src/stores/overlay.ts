import type { ConfirmData, OverlayData } from '@shared/contracts';
import { defineStore } from 'pinia';

export const useOverlayStore = defineStore('overlay', {
    state: () => ({
        overlay: null as OverlayData | null,
        confirm: null as ConfirmData | null
    }),
    actions: {
        setOverlay(data: OverlayData | null) {
            this.overlay = data;
        },
        setConfirm(data: ConfirmData | null) {
            this.confirm = data;
        }
    }
});
