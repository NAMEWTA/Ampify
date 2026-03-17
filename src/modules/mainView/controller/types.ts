import type { SectionActionPayload, SectionId, SectionViewModel } from '../shared/contracts';

export interface MainViewSectionHandler {
    readonly section: SectionId;
    getViewModel(): Promise<SectionViewModel>;
    handleAction(action: SectionActionPayload): Promise<void>;
}
