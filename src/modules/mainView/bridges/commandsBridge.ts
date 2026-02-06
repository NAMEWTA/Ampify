/**
 * Commands 数据桥接
 * 将 Commands 模块数据适配为 TreeNode[]
 */
import * as vscode from 'vscode';
import { TreeNode, ToolbarAction } from '../protocol';
import { CommandConfigManager } from '../../commands/core/commandConfigManager';
import { LoadedCommand, FilterState } from '../../../common/types';
import { I18n } from '../../../common/i18n';

export class CommandsBridge {
    private configManager: CommandConfigManager;
    private filterState: FilterState = {};

    constructor() {
        this.configManager = CommandConfigManager.getInstance();
    }

    getTreeData(): TreeNode[] {
        const nodes: TreeNode[] = [];

        // 过滤信息
        if (this.hasActiveFilter()) {
            const filterText = this.filterState.keyword || this.filterState.tags?.join(', ') || '';
            nodes.push({
                id: 'commands-filter-info',
                label: I18n.get('commands.filterActive', filterText),
                iconId: 'filter',
                nodeType: 'filterInfo',
                tooltip: 'Click to clear filter',
                inlineActions: [
                    { id: 'clearFilter', label: 'Clear Filter', iconId: 'close' }
                ]
            });
        }

        let commands = this.configManager.loadAllCommands();
        commands = this.applyFilter(commands);

        if (commands.length === 0) {
            nodes.push({
                id: 'commands-empty',
                label: this.hasActiveFilter()
                    ? I18n.get('commands.noMatchingCommands')
                    : I18n.get('commands.noCommands'),
                iconId: 'info',
                nodeType: 'empty',
                command: this.hasActiveFilter() ? undefined : 'ampify.commands.create'
            });
        } else {
            for (const cmd of commands) {
                nodes.push(this.createCommandNode(cmd));
            }
        }

        return nodes;
    }

    getToolbar(): ToolbarAction[] {
        return [
            { id: 'search', label: 'Search', iconId: 'search', command: '', action: 'overlay' },
            { id: 'refresh', label: 'Refresh', iconId: 'refresh', command: 'ampify.commands.refresh' },
            { id: 'create', label: 'Create', iconId: 'add', command: '', action: 'overlay' },
            { id: 'import', label: 'Import', iconId: 'folder-library', command: 'ampify.commands.import' },
            { id: 'openFolder', label: 'Open Folder', iconId: 'folder-opened', command: 'ampify.commands.openFolder' }
        ];
    }

    setFilter(keyword?: string, tags?: string[]): void {
        this.filterState = { keyword, tags };
    }

    clearFilter(): void {
        this.filterState = {};
    }

    getFilterState(): FilterState {
        return { ...this.filterState };
    }

    getAllTags(): string[] {
        return this.configManager.getAllTags();
    }

    getActiveTags(): string[] {
        return this.filterState.tags || [];
    }

    async executeAction(actionId: string, nodeId: string): Promise<void> {
        const cmdName = nodeId.replace('cmd-', '').replace(/-children$/, '');
        const commands = this.configManager.loadAllCommands();
        const cmd = commands.find(c => c.meta.command === cmdName);

        switch (actionId) {
            case 'apply':
                if (cmd) {
                    await vscode.commands.executeCommand('ampify.commands.apply', {
                        itemType: 'commandItem', data: cmd
                    });
                }
                break;
            case 'preview':
                if (cmd) {
                    await vscode.commands.executeCommand('ampify.commands.preview', {
                        itemType: 'commandItem', data: cmd
                    });
                }
                break;
            case 'delete':
                if (cmd) {
                    await vscode.commands.executeCommand('ampify.commands.delete', {
                        itemType: 'commandItem', data: cmd
                    });
                }
                break;
            case 'remove':
                if (cmd) {
                    await vscode.commands.executeCommand('ampify.commands.remove', {
                        itemType: 'commandItem', data: cmd
                    });
                }
                break;
            case 'open':
                if (cmd) {
                    await vscode.commands.executeCommand('ampify.commands.open', {
                        itemType: 'commandItem', data: cmd
                    });
                }
                break;
        }
    }

    async handleDrop(uris: string[]): Promise<void> {
        const { CommandImporter } = await import('../../commands/core/commandImporter');
        const importer = CommandImporter.getInstance();
        const vscodeUris = uris.map(u => vscode.Uri.parse(u));
        await importer.importFromUris(vscodeUris);
    }

    private createCommandNode(cmd: LoadedCommand): TreeNode {
        const children: TreeNode[] = [];

        // 描述
        children.push({
            id: `cmd-${cmd.meta.command}-desc`,
            label: cmd.meta.description,
            iconId: 'info',
            nodeType: 'detail'
        });

        // 标签
        if (cmd.meta.tags && cmd.meta.tags.length > 0) {
            children.push({
                id: `cmd-${cmd.meta.command}-tags`,
                label: `${I18n.get('commands.tags')}: ${cmd.meta.tags.join(', ')}`,
                iconId: 'symbol-keyword',
                nodeType: 'detail'
            });
        }

        return {
            id: `cmd-${cmd.meta.command}`,
            label: cmd.meta.command,
            description: cmd.meta.tags?.join(', ') || '',
            iconId: 'terminal',
            collapsible: true,
            children,
            nodeType: 'commandItem',
            command: 'ampify.commands.open',
            commandArgs: JSON.stringify({ command: cmd.meta.command }),
            tooltip: cmd.meta.description,
            inlineActions: [
                { id: 'apply', label: 'Apply to Project', iconId: 'play' },
                { id: 'preview', label: 'Preview', iconId: 'open-preview' }
            ],
            contextActions: [
                { id: 'remove', label: 'Remove from Project', iconId: 'close' },
                { id: 'delete', label: 'Delete', iconId: 'trash', danger: true }
            ]
        };
    }

    private hasActiveFilter(): boolean {
        return !!(this.filterState.keyword || (this.filterState.tags && this.filterState.tags.length > 0));
    }

    private applyFilter(commands: LoadedCommand[]): LoadedCommand[] {
        let filtered = commands;
        if (this.filterState.keyword) {
            const keyword = this.filterState.keyword.toLowerCase();
            filtered = filtered.filter(cmd =>
                cmd.meta.command.toLowerCase().includes(keyword) ||
                cmd.meta.description.toLowerCase().includes(keyword) ||
                (cmd.meta.tags?.some(tag => tag.toLowerCase().includes(keyword)))
            );
        }
        if (this.filterState.tags && this.filterState.tags.length > 0) {
            filtered = filtered.filter(cmd =>
                this.filterState.tags?.some(tag => cmd.meta.tags?.includes(tag))
            );
        }
        return filtered;
    }
}
