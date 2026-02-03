import * as vscode from 'vscode';
import { I18n } from '../../../common/i18n';
import { FilterState, LoadedCommand } from '../../../common/types';
import { CommandConfigManager } from '../core/commandConfigManager';

/**
 * TreeItem 类型
 */
type TreeItemType = 
    | 'group'           // 分组
    | 'commandItem'     // 命令节点
    | 'commandDetailItem' // 命令详情
    | 'filterInfo'      // 过滤信息
    | 'empty';          // 空状态

/**
 * 命令 TreeItem
 */
export class CommandTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: TreeItemType,
        public readonly data?: LoadedCommand | string
    ) {
        super(label, collapsibleState);
        this.contextValue = itemType;
        this.setupItem();
    }

    private setupItem(): void {
        switch (this.itemType) {
            case 'commandItem':
                this.setupCommandItem();
                break;
            case 'commandDetailItem':
                this.setupDetailItem();
                break;
            case 'filterInfo':
                this.setupFilterInfo();
                break;
            case 'empty':
                this.setupEmpty();
                break;
        }
    }

    private setupCommandItem(): void {
        const command = this.data as LoadedCommand;
        this.tooltip = command.meta.description;
        this.iconPath = new vscode.ThemeIcon('terminal');
        this.description = command.meta.tags?.join(', ') || '';
        this.command = {
            command: 'ampify.commands.open',
            title: 'Open Command',
            arguments: [this]
        };
    }

    private setupDetailItem(): void {
        this.iconPath = new vscode.ThemeIcon('info');
    }

    private setupFilterInfo(): void {
        this.iconPath = new vscode.ThemeIcon('filter');
    }

    private setupEmpty(): void {
        this.iconPath = new vscode.ThemeIcon('info');
    }
}

/**
 * Commands TreeView Provider
 */
export class CommandTreeProvider implements 
    vscode.TreeDataProvider<CommandTreeItem>,
    vscode.TreeDragAndDropController<CommandTreeItem> 
{
    private _onDidChangeTreeData = new vscode.EventEmitter<CommandTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Drag and Drop
    readonly dropMimeTypes = ['application/vnd.code.uri-list', 'text/uri-list'];
    readonly dragMimeTypes: string[] = [];

    private configManager: CommandConfigManager;
    private filterState: FilterState = {};

    constructor() {
        this.configManager = CommandConfigManager.getInstance();
    }

    /**
     * 刷新视图
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 设置搜索过滤
     */
    setFilter(keyword?: string, tags?: string[]): void {
        this.filterState = { keyword, tags };
        this.refresh();
    }

    /**
     * 清除过滤
     */
    clearFilter(): void {
        this.filterState = {};
        this.refresh();
    }

    /**
     * 获取当前过滤状态
     */
    getFilterState(): FilterState {
        return this.filterState;
    }

    getTreeItem(element: CommandTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CommandTreeItem): Promise<CommandTreeItem[]> {
        if (!element) {
            return this.getRootChildren();
        }

        if (element.itemType === 'group') {
            return this.getGroupChildren(element);
        }

        if (element.itemType === 'commandItem') {
            return this.getCommandChildren(element);
        }

        return [];
    }

    /**
     * 获取根节点
     */
    private getRootChildren(): CommandTreeItem[] {
        const items: CommandTreeItem[] = [];

        // 显示过滤信息
        if (this.filterState.keyword || (this.filterState.tags && this.filterState.tags.length > 0)) {
            const filterText = this.filterState.keyword || this.filterState.tags?.join(', ') || '';
            items.push(new CommandTreeItem(
                I18n.get('commands.filterActive', filterText),
                vscode.TreeItemCollapsibleState.None,
                'filterInfo'
            ));
        }

        // 命令列表分组
        items.push(new CommandTreeItem(
            I18n.get('commands.commandsList'),
            vscode.TreeItemCollapsibleState.Expanded,
            'group',
            'commands'
        ));

        return items;
    }

    /**
     * 获取分组子节点
     */
    private getGroupChildren(element: CommandTreeItem): CommandTreeItem[] {
        if (element.data === 'commands') {
            return this.getCommandItems();
        }
        return [];
    }

    /**
     * 获取命令列表
     */
    private getCommandItems(): CommandTreeItem[] {
        let commands = this.configManager.loadAllCommands();

        // 应用过滤
        commands = this.applyFilter(commands);

        if (commands.length === 0) {
            if (this.filterState.keyword || (this.filterState.tags && this.filterState.tags.length > 0)) {
                return [new CommandTreeItem(
                    I18n.get('commands.noMatchingCommands'),
                    vscode.TreeItemCollapsibleState.None,
                    'empty'
                )];
            }
            return [new CommandTreeItem(
                I18n.get('commands.noCommands'),
                vscode.TreeItemCollapsibleState.None,
                'empty'
            )];
        }

        return commands.map(cmd => new CommandTreeItem(
            cmd.meta.command,
            vscode.TreeItemCollapsibleState.Collapsed,
            'commandItem',
            cmd
        ));
    }

    /**
     * 获取命令详情子节点
     */
    private getCommandChildren(element: CommandTreeItem): CommandTreeItem[] {
        const command = element.data as LoadedCommand;
        const items: CommandTreeItem[] = [];

        // 描述
        items.push(new CommandTreeItem(
            command.meta.description,
            vscode.TreeItemCollapsibleState.None,
            'commandDetailItem',
            'description'
        ));

        // 标签
        if (command.meta.tags && command.meta.tags.length > 0) {
            items.push(new CommandTreeItem(
                `${I18n.get('commands.tags')}: ${command.meta.tags.join(', ')}`,
                vscode.TreeItemCollapsibleState.None,
                'commandDetailItem',
                'tags'
            ));
        }

        return items;
    }

    /**
     * 应用过滤
     */
    private applyFilter(commands: LoadedCommand[]): LoadedCommand[] {
        let filtered = commands;

        // 关键词过滤
        if (this.filterState.keyword) {
            const keyword = this.filterState.keyword.toLowerCase();
            filtered = filtered.filter(cmd => 
                cmd.meta.command.toLowerCase().includes(keyword) ||
                cmd.meta.description.toLowerCase().includes(keyword) ||
                (cmd.meta.tags?.some(tag => tag.toLowerCase().includes(keyword)))
            );
        }

        // 标签过滤
        if (this.filterState.tags && this.filterState.tags.length > 0) {
            filtered = filtered.filter(cmd =>
                this.filterState.tags?.some(tag => cmd.meta.tags?.includes(tag))
            );
        }

        return filtered;
    }

    // ==================== Drag and Drop ====================

    async handleDrop(
        target: CommandTreeItem | undefined,
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const uriList = dataTransfer.get('application/vnd.code.uri-list') || 
                        dataTransfer.get('text/uri-list');
        
        if (!uriList) {
            return;
        }

        const uris = await this.parseUriList(uriList);
        if (uris.length === 0) {
            return;
        }

        // 动态导入以避免循环依赖
        const { CommandImporter } = await import('../core/commandImporter');
        const importer = CommandImporter.getInstance();
        
        const success = await importer.importFromUris(uris);
        if (success) {
            this.refresh();
        }
    }

    handleDrag(
        _source: readonly CommandTreeItem[],
        _dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        // 不支持从树中拖出
    }

    /**
     * 解析 URI 列表
     */
    private async parseUriList(uriList: vscode.DataTransferItem): Promise<vscode.Uri[]> {
        const text = await uriList.asString();
        const lines = text.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));
        
        return lines.map(line => {
            try {
                return vscode.Uri.parse(line.trim());
            } catch {
                return vscode.Uri.file(line.trim());
            }
        }).filter(uri => uri.fsPath.endsWith('.md'));
    }
}
