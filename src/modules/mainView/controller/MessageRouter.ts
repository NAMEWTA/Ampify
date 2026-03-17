import type { WebviewMessage } from '../shared/contracts';
import type { MainViewController } from './MainViewController';

export class MessageRouter {
    constructor(private readonly controller: MainViewController) {}

    async route(message: WebviewMessage): Promise<void> {
        switch (message.type) {
            case 'appReady':
                await this.controller.handleAppReady();
                return;
            case 'navigate':
                await this.controller.handleNavigate(message.section);
                return;
            case 'sectionAction':
                await this.controller.handleSectionAction(message.section, message.action);
                return;
            case 'overlaySubmit':
                await this.controller.handleOverlaySubmit(message.overlayId, message.values);
                return;
            case 'overlayCancel':
                this.controller.handleOverlayCancel(message.overlayId);
                return;
            case 'confirmResult':
                await this.controller.handleConfirmResult(message.confirmId, message.confirmed);
                return;
            case 'settingChange':
                await this.controller.handleSettingChange(message.scope, message.key, message.value);
                return;
        }
    }
}
