import type { WebviewMessage } from '@shared/contracts';

export interface PersistedState {
    activeSection?: string;
    navCollapsed?: boolean;
}

const vscodeApi = acquireVsCodeApi<PersistedState>();

export function getPersistedState(): PersistedState {
    return vscodeApi.getState() || {};
}

export function setPersistedState(state: PersistedState): void {
    vscodeApi.setState(state);
}

export function postToExtension(message: WebviewMessage): void {
    vscodeApi.postMessage(message);
}
