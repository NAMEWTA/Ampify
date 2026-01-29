import * as vscode from 'vscode';
import { ConfigManager } from '../core/configManager';
import { InstanceConfig } from '../../../common/types';
import { I18n } from '../../../common/i18n';

export class InstanceTreeProvider implements vscode.TreeDataProvider<InstanceItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<InstanceItem | undefined | null | void> = new vscode.EventEmitter<InstanceItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<InstanceItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private configManager: ConfigManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InstanceItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: InstanceItem): Thenable<InstanceItem[]> {
        if (element) {
            return Promise.resolve([]);
        }
        
        const config = this.configManager.getConfig();
        const entries = Object.entries(config.instances);
        
        if (entries.length === 0) {
            const emptyItem = new InstanceItem(
                I18n.get('launcher.noInstances'),
                I18n.get('launcher.addInstancePlaceholder'),
                vscode.TreeItemCollapsibleState.None,
                undefined,
                "empty_placeholder"
            );
            emptyItem.contextValue = "empty";
            emptyItem.command = {
                command: 'ampify.launcher.add',
                title: 'Add Instance',
            };
            emptyItem.iconPath = new vscode.ThemeIcon('info');
            return Promise.resolve([emptyItem]);
        }

        const items = entries.map(([key, instance]) => {
            return new InstanceItem(
                instance.description || key,
                instance.dirName,
                vscode.TreeItemCollapsibleState.None,
                instance,
                key
            );
        });
        
        return Promise.resolve(items);
    }
}

export class InstanceItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly instanceConfig: InstanceConfig | undefined,
        public readonly key: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} (${this.description})`;
        this.description = description;
        this.iconPath = new vscode.ThemeIcon('account');
        this.contextValue = 'instance';
        
        if (instanceConfig) {
            this.command = {
                command: 'ampify.launcher.launch',
                title: 'Launch',
                arguments: [this]
            };
        }
    }
}
