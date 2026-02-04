import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SkillConfigManager } from '../core/skillConfigManager';
import { LoadedSkill, FilterState } from '../../../common/types';
import { I18n } from '../../../common/i18n';

/**
 * TreeView 节点类型
 */
type TreeItemType = 
    | 'group' 
    | 'skillItem' 
    | 'skillDetailItem' 
    | 'skillFilesGroup'
    | 'skillFileItem'
    | 'filterInfo'
    | 'empty';

/**
 * Skill TreeItem
 */
export class SkillTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: TreeItemType,
        public readonly data?: unknown
    ) {
        super(label, collapsibleState);
        this.contextValue = itemType;
    }
}

/**
 * Skills Tree Data Provider
 */
export class SkillTreeProvider implements vscode.TreeDataProvider<SkillTreeItem>, vscode.TreeDragAndDropController<SkillTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SkillTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // 拖拽支持
    readonly dropMimeTypes = ['application/vnd.code.tree.explorer', 'text/uri-list'];
    readonly dragMimeTypes: string[] = [];

    // 过滤状态
    private filterState: FilterState = {};
    constructor(
        private configManager: SkillConfigManager
    ) {}

    /**
     * 刷新 TreeView
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 设置搜索关键词
     */
    setSearchKeyword(keyword: string | undefined): void {
        this.filterState.keyword = keyword;
        this.refresh();
    }

    /**
     * 设置标签过滤
     */
    setTagFilter(tags: string[] | undefined): void {
        this.filterState.tags = tags;
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
        return { ...this.filterState };
    }

    /**
     * 是否有活跃的过滤
     */
    hasActiveFilter(): boolean {
        return !!(this.filterState.keyword || (this.filterState.tags && this.filterState.tags.length > 0));
    }

    getTreeItem(element: SkillTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SkillTreeItem): Promise<SkillTreeItem[]> {
        if (!element) {
            // 根节点
            return this.getRootChildren();
        }

        // 子节点
        switch (element.itemType) {
            case 'group':
                if (element.label === I18n.get('skills.skillsList')) {
                    return this.getSkillsListChildren();
                }
                break;
            case 'skillItem':
                return this.getSkillDetailChildren(element.data as LoadedSkill);
            case 'skillFilesGroup':
                return this.getSkillFileChildren(element.data as LoadedSkill);
        }

        return [];
    }

    /**
     * 获取根节点
     */
    private async getRootChildren(): Promise<SkillTreeItem[]> {
        const items: SkillTreeItem[] = [];

        // 过滤信息（如果有）
        if (this.hasActiveFilter()) {
            const filterDesc = this.getFilterDescription();
            const filterItem = new SkillTreeItem(
                `🔍 ${filterDesc}`,
                vscode.TreeItemCollapsibleState.None,
                'filterInfo'
            );
            filterItem.iconPath = new vscode.ThemeIcon('filter');
            filterItem.command = {
                command: 'ampify.skills.clearFilter',
                title: 'Clear Filter'
            };
            filterItem.tooltip = 'Click to clear filter';
            items.push(filterItem);
        }

        // Skills 分组
        const skillsItem = new SkillTreeItem(
            I18n.get('skills.skillsList'),
            vscode.TreeItemCollapsibleState.Expanded,
            'group'
        );
        skillsItem.iconPath = new vscode.ThemeIcon('library');
        items.push(skillsItem);

        return items;
    }

    private getSkillsListChildren(): SkillTreeItem[] {
        let skills = this.configManager.loadAllSkills();

        // 应用过滤
        if (this.hasActiveFilter()) {
            skills = this.filterSkills(skills);
        }

        if (skills.length === 0) {
            const emptyItem = new SkillTreeItem(
                this.hasActiveFilter() 
                    ? I18n.get('skills.noMatchingSkills')
                    : I18n.get('skills.noSkills'),
                vscode.TreeItemCollapsibleState.None,
                'empty'
            );
            emptyItem.iconPath = new vscode.ThemeIcon('info');
            
            if (!this.hasActiveFilter()) {
                emptyItem.command = {
                    command: 'ampify.skills.create',
                    title: 'Create Skill'
                };
                emptyItem.tooltip = I18n.get('skills.addSkillPlaceholder');
            }
            
            return [emptyItem];
        }

        return skills.map(skill => this.createSkillItem(skill));
    }

    /**
     * 创建 Skill 节点
     */
    private createSkillItem(skill: LoadedSkill): SkillTreeItem {
        const item = new SkillTreeItem(
            skill.meta.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            'skillItem',
            skill
        );

        // 描述
        item.description = skill.meta.description.length > 50 
            ? skill.meta.description.substring(0, 50) + '...'
            : skill.meta.description;

        // 图标
        item.iconPath = new vscode.ThemeIcon('extensions');

        // Tooltip
        const tooltipLines = [
            `**${skill.meta.name}** v${skill.meta.version}`,
            '',
            skill.meta.description
        ];

        if (skill.meta.tags && skill.meta.tags.length > 0) {
            tooltipLines.push('', `Tags: ${skill.meta.tags.join(', ')}`);
        }

        item.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));

        // 点击打开 SKILL.md
        if (skill.skillMdPath) {
            item.command = {
                command: 'ampify.skills.preview',
                title: 'Preview',
                arguments: [skill]
            };
        }

        return item;
    }

    /**
     * 获取 Skill 详情子节点
     */
    private getSkillDetailChildren(skill: LoadedSkill): SkillTreeItem[] {
        const items: SkillTreeItem[] = [];

        // 版本
        const versionItem = new SkillTreeItem(
            `${I18n.get('skills.version')}: ${skill.meta.version}`,
            vscode.TreeItemCollapsibleState.None,
            'skillDetailItem'
        );
        versionItem.iconPath = new vscode.ThemeIcon('tag');
        items.push(versionItem);

        // 标签
        if (skill.meta.tags && skill.meta.tags.length > 0) {
            const tagsItem = new SkillTreeItem(
                `${I18n.get('skills.tags')}: ${skill.meta.tags.join(', ')}`,
                vscode.TreeItemCollapsibleState.None,
                'skillDetailItem'
            );
            tagsItem.iconPath = new vscode.ThemeIcon('symbol-keyword');
            items.push(tagsItem);
        }

        // 前置依赖
        if (skill.meta.prerequisites && skill.meta.prerequisites.length > 0) {
            const prereqItem = new SkillTreeItem(
                I18n.get('skills.prerequisites'),
                vscode.TreeItemCollapsibleState.None,
                'skillDetailItem'
            );
            prereqItem.description = skill.meta.prerequisites.map(p => p.name).join(', ');
            prereqItem.iconPath = new vscode.ThemeIcon('package');
            items.push(prereqItem);
        }

        // Files 目录按钮
        const filesGroup = new SkillTreeItem(
            'Files',
            vscode.TreeItemCollapsibleState.Collapsed,
            'skillFilesGroup',
            skill
        );
        filesGroup.iconPath = new vscode.ThemeIcon('folder');
        items.push(filesGroup);

        return items;
    }

    /**
     * 获取 Skill 文件列表
     */
    private getSkillFileChildren(skill: LoadedSkill): SkillTreeItem[] {
        const files = this.listAllFiles(skill.path);
        return files.map(filePath => {
            const relativePath = path.relative(skill.path, filePath);
            const item = new SkillTreeItem(
                relativePath,
                vscode.TreeItemCollapsibleState.None,
                'skillFileItem',
                { filePath }
            );
            item.iconPath = new vscode.ThemeIcon('file');
            item.command = {
                command: 'ampify.skills.openFile',
                title: 'Open Skill File',
                arguments: [filePath]
            };
            return item;
        });
    }

    /**
     * 递归列出所有文件
     */
    private listAllFiles(dir: string): string[] {
        const results: string[] = [];
        if (!fs.existsSync(dir)) return results;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...this.listAllFiles(fullPath));
            } else {
                results.push(fullPath);
            }
        }
        return results;
    }

    /**
     * 过滤 Skills
     */
    private filterSkills(skills: LoadedSkill[]): LoadedSkill[] {
        return skills.filter(skill => {
            // 关键词过滤
            if (this.filterState.keyword) {
                const keyword = this.filterState.keyword.toLowerCase();
                const matchName = skill.meta.name.toLowerCase().includes(keyword);
                const matchDesc = skill.meta.description.toLowerCase().includes(keyword);
                const matchTags = skill.meta.tags?.some(tag => 
                    tag.toLowerCase().includes(keyword)
                ) || false;

                if (!matchName && !matchDesc && !matchTags) {
                    return false;
                }
            }

            // 标签过滤
            if (this.filterState.tags && this.filterState.tags.length > 0) {
                if (!skill.meta.tags || skill.meta.tags.length === 0) {
                    return false;
                }
                const hasMatchingTag = this.filterState.tags.some(filterTag =>
                    skill.meta.tags!.includes(filterTag)
                );
                if (!hasMatchingTag) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * 获取过滤描述
     */
    private getFilterDescription(): string {
        const parts: string[] = [];

        if (this.filterState.keyword) {
            parts.push(`"${this.filterState.keyword}"`);
        }
        if (this.filterState.tags && this.filterState.tags.length > 0) {
            parts.push(this.filterState.tags.join(', '));
        }

        return parts.join(' + ');
    }

    // ==================== 拖拽支持 ====================

    handleDrag(_source: readonly SkillTreeItem[], _dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): void {
        // 不支持拖出
    }

    async handleDrop(_target: SkillTreeItem | undefined, dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): Promise<void> {
        // 处理拖入的文件/文件夹
        const uriList = dataTransfer.get('text/uri-list');
        
        if (uriList) {
            const uriString = await uriList.asString();
            const uris = uriString.split('\n')
                .filter(line => line.trim())
                .map(line => vscode.Uri.parse(line.trim()));

            if (uris.length > 0) {
                // 触发导入命令
                vscode.commands.executeCommand('ampify.skills.importFromUris', uris);
            }
        }
    }
}
