import * as vscode from 'vscode';
import { MainViewController } from './controller/MainViewController';
import type { SectionId } from './shared/contracts';

export class AmpifyViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ampify-main-view';

    private readonly controller: MainViewController;

    constructor(extensionUri: vscode.Uri) {
        this.controller = new MainViewController(extensionUri);
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void {
        this.controller.resolveWebviewView(webviewView, context, token);
    }

    async refresh(section?: SectionId): Promise<void> {
        await this.controller.refresh(section);
    }
}
