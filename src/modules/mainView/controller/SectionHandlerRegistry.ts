import type { SectionActionPayload, SectionId } from '../shared/contracts';
import type { MainViewSectionHandler } from './types';
import type { MainViewController } from './MainViewController';

class DashboardSectionHandler implements MainViewSectionHandler {
    readonly section: SectionId = 'dashboard';

    constructor(private readonly controller: MainViewController) {}

    getViewModel() {
        return this.controller.buildDashboardViewModel();
    }

    async handleAction(action: SectionActionPayload): Promise<void> {
        if (action.kind === 'dashboardSearch') {
            await this.controller.handleDashboardSearch(action.query);
            return;
        }
        if (action.kind === 'dashboardResultAction') {
            await this.controller.handleDashboardResultAction(action.resultId, action.actionId);
            return;
        }
        if (action.kind === 'executeCommand') {
            await this.controller.executeCommand(action.command, action.args);
        }
    }
}

class ResourceSectionHandler implements MainViewSectionHandler {
    constructor(
        public readonly section: SectionId,
        private readonly controller: MainViewController
    ) {}

    getViewModel() {
        return this.controller.buildResourceViewModel(this.section);
    }

    async handleAction(action: SectionActionPayload): Promise<void> {
        switch (action.kind) {
            case 'toolbar':
                await this.controller.handleToolbarAction(this.section, action.actionId);
                return;
            case 'treeItemClick':
                await this.controller.handleTreeItemClick(this.section, action.nodeId);
                return;
            case 'treeItemAction':
                await this.controller.handleTreeItemAction(this.section, action.nodeId, action.actionId);
                return;
            case 'cardClick':
                await this.controller.handleCardClick(this.section, action.cardId);
                return;
            case 'cardAction':
                await this.controller.handleCardAction(this.section, action.cardId, action.actionId);
                return;
            case 'cardFileClick':
                await this.controller.handleCardFileClick(action.filePath);
                return;
            case 'filterKeyword':
                await this.controller.handleFilterKeyword(this.section, action.keyword);
                return;
            case 'filterTags':
                await this.controller.handleFilterTags(this.section, action.tags);
                return;
            case 'clearFilter':
                await this.controller.handleClearFilter(this.section);
                return;
            case 'toggleTag':
                await this.controller.handleToggleTag(this.section, action.tag);
                return;
            case 'dropFiles':
                await this.controller.handleDrop(this.section, action.uris);
                return;
            case 'dropEmpty':
                await this.controller.handleDropEmpty(this.section);
                return;
            case 'executeCommand':
                await this.controller.executeCommand(action.command, action.args);
                return;
            default:
                return;
        }
    }
}

class SettingsSectionHandler implements MainViewSectionHandler {
    readonly section: SectionId = 'settings';

    constructor(private readonly controller: MainViewController) {}

    getViewModel() {
        return this.controller.buildSettingsViewModel();
    }

    async handleAction(action: SectionActionPayload): Promise<void> {
        if (action.kind === 'settingsAction') {
            await this.controller.handleSettingsAction(action.command);
        }
    }
}

export class SectionHandlerRegistry {
    private readonly handlers = new Map<SectionId, MainViewSectionHandler>();

    constructor(controller: MainViewController) {
        const entries: MainViewSectionHandler[] = [
            new DashboardSectionHandler(controller),
            new ResourceSectionHandler('skills', controller),
            new ResourceSectionHandler('commands', controller),
            new ResourceSectionHandler('agents', controller),
            new ResourceSectionHandler('rules', controller),
            new ResourceSectionHandler('gitshare', controller),
            new SettingsSectionHandler(controller)
        ];
        for (const handler of entries) {
            this.handlers.set(handler.section, handler);
        }
    }

    get(section: SectionId): MainViewSectionHandler {
        const handler = this.handlers.get(section);
        if (!handler) {
            throw new Error(`No MainView section handler registered for "${section}"`);
        }
        return handler;
    }
}
