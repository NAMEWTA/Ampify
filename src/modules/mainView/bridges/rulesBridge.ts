import * as vscode from 'vscode';
import { CardItem, TreeNode, ToolbarAction } from '../shared/contracts';
import { RuleConfigManager } from '../../rules/core/ruleConfigManager';
import { LoadedRule, FilterState } from '../../../common/types';
import { I18n } from '../../../common/i18n';

export class RulesBridge {
    private configManager: RuleConfigManager;
    private filterState: FilterState = {};

    constructor() {
        this.configManager = RuleConfigManager.getInstance();
    }

    getTreeData(): TreeNode[] {
        const nodes: TreeNode[] = [];

        if (this.hasActiveFilter()) {
            const filterText = this.filterState.keyword || this.filterState.tags?.join(', ') || '';
            nodes.push({
                id: 'rules-filter-info',
                label: I18n.get('rules.filterActive', filterText),
                iconId: 'filter',
                nodeType: 'filterInfo',
                tooltip: I18n.get('common.clickClearFilter'),
                inlineActions: [
                    { id: 'clearFilter', label: I18n.get('common.clearFilter'), iconId: 'close' }
                ]
            });
        }

        let rules = this.configManager.loadAllRules();
        rules = this.applyFilter(rules);

        if (rules.length === 0) {
            nodes.push({
                id: 'rules-empty',
                label: this.hasActiveFilter() ? I18n.get('rules.noMatchingRules') : I18n.get('rules.noRules'),
                iconId: 'info',
                nodeType: 'empty',
                command: this.hasActiveFilter() ? undefined : 'ampify.rules.create'
            });
        } else {
            for (const rule of rules) {
                nodes.push(this.createRuleNode(rule));
            }
        }

        return nodes;
    }

    getCardData(): CardItem[] {
        let rules = this.configManager.loadAllRules();
        if (this.hasActiveFilter()) {
            rules = this.applyFilter(rules);
        }

        return rules.map(rule => this.createCardItem(rule));
    }

    getToolbar(): ToolbarAction[] {
        return [
            { id: 'search', label: I18n.get('common.search'), iconId: 'search', command: '', action: 'overlay' },
            { id: 'refresh', label: I18n.get('common.refresh'), iconId: 'refresh', command: 'ampify.rules.refresh' },
            { id: 'create', label: I18n.get('common.create'), iconId: 'add', command: '', action: 'overlay' },
            { id: 'import', label: I18n.get('common.import'), iconId: 'folder-library', command: 'ampify.rules.import' },
            { id: 'openFolder', label: I18n.get('common.openFolder'), iconId: 'folder-opened', command: 'ampify.rules.openFolder' }
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
        const ruleName = nodeId.replace('rule-', '').replace(/-children$/, '');
        const rules = this.configManager.loadAllRules();
        const rule = rules.find(item => item.meta.rule === ruleName);

        switch (actionId) {
            case 'apply':
                if (rule) {
                    await vscode.commands.executeCommand('ampify.rules.apply', { itemType: 'ruleItem', data: rule });
                }
                break;
            case 'preview':
                if (rule) {
                    await vscode.commands.executeCommand('ampify.rules.preview', { itemType: 'ruleItem', data: rule });
                }
                break;
            case 'delete':
                if (rule) {
                    await vscode.commands.executeCommand('ampify.rules.delete', { itemType: 'ruleItem', data: rule });
                }
                break;
            case 'remove':
                if (rule) {
                    await vscode.commands.executeCommand('ampify.rules.remove', { itemType: 'ruleItem', data: rule });
                }
                break;
            case 'open':
                if (rule) {
                    await vscode.commands.executeCommand('ampify.rules.open', { itemType: 'ruleItem', data: rule });
                }
                break;
        }
    }

    private createCardItem(rule: LoadedRule): CardItem {
        return {
            id: `rule-${rule.meta.rule}`,
            name: rule.meta.rule,
            description: rule.meta.description,
            badges: rule.meta.tags || [],
            iconId: 'law',
            primaryFilePath: rule.path,
            actions: [
                { id: 'apply', label: I18n.get('common.copyToRules'), iconId: 'play' },
                { id: 'preview', label: I18n.get('common.preview'), iconId: 'open-preview' },
                { id: 'delete', label: I18n.get('common.delete'), iconId: 'trash', danger: true }
            ]
        };
    }

    private createRuleNode(rule: LoadedRule): TreeNode {
        return {
            id: `rule-${rule.meta.rule}`,
            label: rule.meta.rule,
            subtitle: rule.meta.description,
            badges: rule.meta.tags || [],
            layout: 'twoLine',
            pinnedActionId: 'apply',
            iconId: 'law',
            collapsible: false,
            nodeType: 'ruleItem',
            command: 'ampify.rules.open',
            commandArgs: JSON.stringify({ rule: rule.meta.rule }),
            tooltip: rule.meta.description,
            inlineActions: [
                { id: 'apply', label: I18n.get('common.copyToRules'), iconId: 'play' },
                { id: 'preview', label: I18n.get('common.preview'), iconId: 'open-preview' }
            ],
            contextActions: [
                { id: 'remove', label: I18n.get('common.removeFromProject'), iconId: 'close' },
                { id: 'delete', label: I18n.get('common.delete'), iconId: 'trash', danger: true }
            ]
        };
    }

    private hasActiveFilter(): boolean {
        return !!(this.filterState.keyword || (this.filterState.tags && this.filterState.tags.length > 0));
    }

    private applyFilter(rules: LoadedRule[]): LoadedRule[] {
        let filtered = rules;
        if (this.filterState.keyword) {
            const keyword = this.filterState.keyword.toLowerCase();
            filtered = filtered.filter(rule =>
                rule.meta.rule.toLowerCase().includes(keyword) ||
                rule.meta.description.toLowerCase().includes(keyword) ||
                rule.meta.tags?.some(tag => tag.toLowerCase().includes(keyword))
            );
        }
        if (this.filterState.tags && this.filterState.tags.length > 0) {
            filtered = filtered.filter(rule =>
                this.filterState.tags?.some(tag => rule.meta.tags?.includes(tag))
            );
        }
        return filtered;
    }
}
