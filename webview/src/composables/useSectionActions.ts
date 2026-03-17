import type { SectionActionPayload, SectionId, SettingsScope } from '@shared/contracts';
import { postToExtension } from '@/services/vscode';

export function useSectionActions(section: SectionId) {
    const send = (action: SectionActionPayload) => {
        postToExtension({ type: 'sectionAction', section, action });
    };

    return {
        navigate(target: SectionId) {
            postToExtension({ type: 'navigate', section: target });
        },
        toolbar(actionId: string) {
            send({ kind: 'toolbar', actionId });
        },
        treeItemClick(nodeId: string) {
            send({ kind: 'treeItemClick', nodeId });
        },
        treeItemAction(nodeId: string, actionId: string) {
            send({ kind: 'treeItemAction', nodeId, actionId });
        },
        cardClick(cardId: string) {
            send({ kind: 'cardClick', cardId });
        },
        cardAction(cardId: string, actionId: string) {
            send({ kind: 'cardAction', cardId, actionId });
        },
        cardFileClick(cardId: string, filePath: string) {
            send({ kind: 'cardFileClick', cardId, filePath });
        },
        filterKeyword(keyword: string) {
            send({ kind: 'filterKeyword', keyword });
        },
        filterTags(tags: string[]) {
            send({ kind: 'filterTags', tags });
        },
        clearFilter() {
            send({ kind: 'clearFilter' });
        },
        toggleTag(tag: string) {
            send({ kind: 'toggleTag', tag });
        },
        dropFiles(uris: string[]) {
            send({ kind: 'dropFiles', uris });
        },
        dropEmpty() {
            send({ kind: 'dropEmpty' });
        },
        quickAction(actionId: string, targetSection: SectionId) {
            send({ kind: 'quickAction', actionId, targetSection });
        },
        executeCommand(command: string, args?: string) {
            send({ kind: 'executeCommand', command, args });
        },
        settingsAction(command: string) {
            send({ kind: 'settingsAction', command });
        },
        settingChange(scope: SettingsScope, key: string, value: string) {
            postToExtension({ type: 'settingChange', scope, key, value });
        },
        overlaySubmit(overlayId: string, values: Record<string, string>) {
            postToExtension({ type: 'overlaySubmit', overlayId, values });
        },
        overlayCancel(overlayId: string) {
            postToExtension({ type: 'overlayCancel', overlayId });
        },
        confirmResult(confirmId: string, confirmed: boolean) {
            postToExtension({ type: 'confirmResult', confirmId, confirmed });
        }
    };
}
