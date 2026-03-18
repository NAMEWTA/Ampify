import type { ExtensionMessage, VisibleSectionId } from '@shared/contracts';
import { ElMessage } from 'element-plus';
import { router } from '@/router';
import { postToExtension } from '@/services/vscode';
import { useAppStore } from '@/stores/app';
import { useOverlayStore } from '@/stores/overlay';
import { useProgressStore } from '@/stores/progress';
import { useSectionsStore } from '@/stores/sections';

const sectionToPath: Record<VisibleSectionId, string> = {
    dashboard: '/dashboard',
    skills: '/skills',
    commands: '/commands',
    agents: '/agents',
    rules: '/rules',
    gitshare: '/git-share',
    settings: '/settings'
};

export function useMessageBus() {
    const appStore = useAppStore();
    const sectionsStore = useSectionsStore();
    const overlayStore = useOverlayStore();
    const progressStore = useProgressStore();

    const handleMessage = async (message: ExtensionMessage) => {
        switch (message.type) {
            case 'bootstrap':
                appStore.hydrate(message.data);
                await router.replace(sectionToPath[message.data.initialSection]);
                break;
            case 'sectionData':
                sectionsStore.setSection(message.section, message.data);
                break;
            case 'overlayState':
                overlayStore.setOverlay(message.data);
                break;
            case 'confirmState':
                overlayStore.setConfirm(message.data);
                break;
            case 'progressState':
                progressStore.setProgress(message.data);
                break;
            case 'notification':
                ElMessage({
                    type: message.data.level === 'warn' ? 'warning' : message.data.level,
                    message: message.data.message,
                    duration: 2800
                });
                break;
            case 'appState':
                appStore.applyAppState(message.data);
                await router.replace(sectionToPath[message.data.activeSection]);
                break;
        }
    };

    const mount = () => {
        window.addEventListener('message', (event: MessageEvent<ExtensionMessage>) => {
            void handleMessage(event.data);
        });
        postToExtension({ type: 'appReady' });
    };

    return { mount };
}
