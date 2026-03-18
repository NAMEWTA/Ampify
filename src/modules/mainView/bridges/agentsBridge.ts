import * as vscode from 'vscode';
import { CardItem, TreeNode, ToolbarAction } from '../shared/contracts';
import { AgentConfigManager } from '../../agents/core/agentConfigManager';
import { LoadedAgent, FilterState } from '../../../common/types';
import { I18n } from '../../../common/i18n';

export class AgentsBridge {
    private configManager: AgentConfigManager;
    private filterState: FilterState = {};

    constructor() {
        this.configManager = AgentConfigManager.getInstance();
    }

    getTreeData(): TreeNode[] {
        const nodes: TreeNode[] = [];

        if (this.hasActiveFilter()) {
            const filterText = this.filterState.keyword || this.filterState.tags?.join(', ') || '';
            nodes.push({
                id: 'agents-filter-info',
                label: I18n.get('agents.filterActive', filterText),
                iconId: 'filter',
                nodeType: 'filterInfo',
                tooltip: I18n.get('common.clickClearFilter'),
                inlineActions: [
                    { id: 'clearFilter', label: I18n.get('common.clearFilter'), iconId: 'close' }
                ]
            });
        }

        let agents = this.configManager.loadAllAgents();
        agents = this.applyFilter(agents);

        if (agents.length === 0) {
            nodes.push({
                id: 'agents-empty',
                label: this.hasActiveFilter() ? I18n.get('agents.noMatchingAgents') : I18n.get('agents.noAgents'),
                iconId: 'info',
                nodeType: 'empty',
                command: this.hasActiveFilter() ? undefined : 'ampify.agents.create'
            });
        } else {
            for (const agent of agents) {
                nodes.push(this.createAgentNode(agent));
            }
        }

        return nodes;
    }

    getCardData(): CardItem[] {
        let agents = this.configManager.loadAllAgents();
        if (this.hasActiveFilter()) {
            agents = this.applyFilter(agents);
        }

        return agents.map(agent => this.createCardItem(agent));
    }

    getToolbar(): ToolbarAction[] {
        return [
            { id: 'search', label: I18n.get('common.search'), iconId: 'search', command: '', action: 'overlay' },
            { id: 'refresh', label: I18n.get('common.refresh'), iconId: 'refresh', command: 'ampify.agents.refresh' },
            { id: 'create', label: I18n.get('common.create'), iconId: 'add', command: '', action: 'overlay' },
            { id: 'import', label: I18n.get('common.import'), iconId: 'folder-library', command: 'ampify.agents.import' },
            { id: 'openFolder', label: I18n.get('common.openFolder'), iconId: 'folder-opened', command: 'ampify.agents.openFolder' }
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
        const agentName = nodeId.replace('agent-', '').replace(/-children$/, '');
        const agents = this.configManager.loadAllAgents();
        const agent = agents.find(item => item.meta.agent === agentName);

        switch (actionId) {
            case 'apply':
                if (agent) {
                    await vscode.commands.executeCommand('ampify.agents.apply', { itemType: 'agentItem', data: agent });
                }
                break;
            case 'preview':
                if (agent) {
                    await vscode.commands.executeCommand('ampify.agents.preview', { itemType: 'agentItem', data: agent });
                }
                break;
            case 'delete':
                if (agent) {
                    await vscode.commands.executeCommand('ampify.agents.delete', { itemType: 'agentItem', data: agent });
                }
                break;
            case 'remove':
                if (agent) {
                    await vscode.commands.executeCommand('ampify.agents.remove', { itemType: 'agentItem', data: agent });
                }
                break;
            case 'open':
                if (agent) {
                    await vscode.commands.executeCommand('ampify.agents.open', { itemType: 'agentItem', data: agent });
                }
                break;
        }
    }

    private createCardItem(agent: LoadedAgent): CardItem {
        return {
            id: `agent-${agent.meta.agent}`,
            name: agent.meta.agent,
            description: agent.meta.description,
            badges: agent.meta.tags || [],
            iconId: 'hubot',
            primaryFilePath: agent.path,
            actions: [
                { id: 'apply', label: I18n.get('common.copyToAgents'), iconId: 'play' },
                { id: 'preview', label: I18n.get('common.preview'), iconId: 'open-preview' },
                { id: 'delete', label: I18n.get('common.delete'), iconId: 'trash', danger: true }
            ]
        };
    }

    private createAgentNode(agent: LoadedAgent): TreeNode {
        return {
            id: `agent-${agent.meta.agent}`,
            label: agent.meta.agent,
            subtitle: agent.meta.description,
            badges: agent.meta.tags || [],
            layout: 'twoLine',
            pinnedActionId: 'apply',
            iconId: 'hubot',
            collapsible: false,
            nodeType: 'agentItem',
            command: 'ampify.agents.open',
            commandArgs: JSON.stringify({ agent: agent.meta.agent }),
            tooltip: agent.meta.description,
            inlineActions: [
                { id: 'apply', label: I18n.get('common.copyToAgents'), iconId: 'play' },
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

    private applyFilter(agents: LoadedAgent[]): LoadedAgent[] {
        let filtered = agents;
        if (this.filterState.keyword) {
            const keyword = this.filterState.keyword.toLowerCase();
            filtered = filtered.filter(agent =>
                agent.meta.agent.toLowerCase().includes(keyword) ||
                agent.meta.description.toLowerCase().includes(keyword) ||
                agent.meta.tags?.some(tag => tag.toLowerCase().includes(keyword))
            );
        }
        if (this.filterState.tags && this.filterState.tags.length > 0) {
            filtered = filtered.filter(agent =>
                this.filterState.tags?.some(tag => agent.meta.tags?.includes(tag))
            );
        }
        return filtered;
    }
}
