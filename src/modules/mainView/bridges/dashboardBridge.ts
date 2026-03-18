import * as vscode from 'vscode';
import type {
    DashboardData,
    DashboardResultAction,
    DashboardResultActionKind,
    DashboardSearchResult,
    SectionId
} from '../shared/contracts';
import { SkillConfigManager } from '../../skills/core/skillConfigManager';
import { CommandConfigManager } from '../../commands/core/commandConfigManager';
import { AgentConfigManager } from '../../agents/core/agentConfigManager';
import { RuleConfigManager } from '../../rules/core/ruleConfigManager';
import type { LoadedAgent, LoadedRule, LoadedSkill } from '../../../common/types';
import { I18n } from '../../../common/i18n';
import { rankByWeightedSearch } from './dashboardSearchRanking';

type SearchActionRuntime = {
    kind: DashboardResultActionKind;
    section?: SectionId;
    filePath?: string;
    command?: string;
    commandArgs?: unknown;
};

type IndexedResult = DashboardSearchResult & {
    searchTitle: string;
    searchTags: string[];
    searchDescription: string;
    searchSubtitle: string;
    searchScope: string;
    searchExtraKeywords: string[];
    runtimeActions: Record<string, SearchActionRuntime>;
};

export class DashboardBridge {
    private query = '';
    private readonly resultMap = new Map<string, IndexedResult>();

    setQuery(nextQuery: string): void {
        this.query = nextQuery.trim();
    }

    async getData(): Promise<DashboardData> {
        const indexed = await this.buildSearchIndex();
        const results = this.filterResults(indexed, this.query).slice(0, 120);

        this.resultMap.clear();
        for (const item of results) {
            this.resultMap.set(item.id, item);
        }

        const isSearching = this.query.length > 0;
        return {
            query: this.query,
            placeholder: I18n.get('dashboard.searchPlaceholder'),
            hint: I18n.get('dashboard.searchHint'),
            total: results.length,
            emptyTitle: isSearching
                ? I18n.get('dashboard.searchEmptyTitle')
                : I18n.get('dashboard.searchIdleTitle'),
            emptyDescription: isSearching
                ? I18n.get('dashboard.searchEmptyDescription')
                : I18n.get('dashboard.searchIdleDescription'),
            results: results.map(({ runtimeActions: _runtimeActions, searchTitle: _searchTitle, searchTags: _searchTags, searchDescription: _searchDescription, searchSubtitle: _searchSubtitle, searchScope: _searchScope, searchExtraKeywords: _searchExtraKeywords, ...view }) => view)
        };
    }

    async executeResultAction(resultId: string, actionId: string): Promise<{ navigateTo?: SectionId }> {
        const result = this.resultMap.get(resultId);
        if (!result) {
            return {};
        }

        const action = result.runtimeActions[actionId];
        if (!action) {
            return {};
        }

        if (action.kind === 'navigate' && action.section) {
            return { navigateTo: action.section };
        }

        if (action.kind === 'openFile' && action.filePath) {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(action.filePath));
            await vscode.window.showTextDocument(document, { preview: true });
            return {};
        }

        if (action.kind === 'command' && action.command) {
            await vscode.commands.executeCommand(action.command, action.commandArgs);
            return {};
        }

        return {};
    }

    private async buildSearchIndex(): Promise<IndexedResult[]> {
        const results: IndexedResult[] = [];

        const skills = this.flattenSkills(SkillConfigManager.getInstance().loadAllSkills());
        for (const skill of skills) {
            results.push(this.createSkillEntry(skill));
        }

        const commands = CommandConfigManager.getInstance().loadAllCommands();
        for (const command of commands) {
            results.push(this.createCommandEntry(command));
        }

        const agents = AgentConfigManager.getInstance().loadAllAgents();
        for (const agent of agents) {
            results.push(this.createAgentEntry(agent));
        }

        const rules = RuleConfigManager.getInstance().loadAllRules();
        for (const rule of rules) {
            results.push(this.createRuleEntry(rule));
        }

        return results;
    }

    private createSkillEntry(skill: LoadedSkill): IndexedResult {
        const tags = skill.meta.tags || [];
        const prerequisites = (skill.meta.prerequisites || []).map((item) => `${item.type} ${item.name}`);
        const description = skill.meta.description || I18n.get('common.noData');
        const subtitle = skill.relativePath || skill.dirName;

        const actions: Array<{ action: DashboardResultAction; runtime: SearchActionRuntime }> = [
            this.createAction('apply-skill', I18n.get('common.copyToSkills'), 'play', {
                kind: 'command',
                command: 'ampify.skills.apply',
                commandArgs: { itemType: 'skillItem', data: skill }
            }),
            this.createAction('goto-skills', I18n.get('dashboard.action.openInSkills'), 'arrow-right', { kind: 'navigate', section: 'skills' })
        ];

        if (skill.skillMdPath) {
            actions.unshift(this.createAction('preview-skill', I18n.get('common.preview'), 'go-to-file', { kind: 'openFile', filePath: skill.skillMdPath }));
        }

        return this.createEntry({
            id: `skill:${skill.meta.name}:${subtitle}`,
            title: skill.meta.name,
            description,
            subtitle,
            iconId: 'library',
            scope: 'skills',
            badges: tags,
            searchTags: tags,
            searchDescription: description,
            searchSubtitle: subtitle,
            searchScope: I18n.get('dashboard.scope.skills'),
            searchExtraKeywords: prerequisites,
            actions
        });
    }

    private createCommandEntry(command: ReturnType<CommandConfigManager['loadAllCommands']>[number]): IndexedResult {
        const tags = command.meta.tags || [];
        const description = command.meta.description || I18n.get('common.noData');
        const filePath = command.path;

        const actions: Array<{ action: DashboardResultAction; runtime: SearchActionRuntime }> = [
            this.createAction('apply-command', I18n.get('common.copyToCommands'), 'play', {
                kind: 'command',
                command: 'ampify.commands.apply',
                commandArgs: { itemType: 'commandItem', data: command }
            }),
            this.createAction('preview-command', I18n.get('common.preview'), 'go-to-file', { kind: 'openFile', filePath }),
            this.createAction('goto-commands', I18n.get('dashboard.action.openInCommands'), 'arrow-right', { kind: 'navigate', section: 'commands' })
        ];

        return this.createEntry({
            id: `command:${command.meta.command}`,
            title: command.meta.command,
            description,
            subtitle: command.fileName,
            iconId: 'terminal',
            scope: 'commands',
            badges: tags,
            searchTags: tags,
            searchDescription: description,
            searchSubtitle: command.fileName,
            searchScope: I18n.get('dashboard.scope.commands'),
            searchExtraKeywords: [],
            actions
        });
    }

    private createAgentEntry(agent: LoadedAgent): IndexedResult {
        const tags = agent.meta.tags || [];
        const description = agent.meta.description || I18n.get('common.noData');
        const filePath = agent.path;

        const actions: Array<{ action: DashboardResultAction; runtime: SearchActionRuntime }> = [
            this.createAction('apply-agent', I18n.get('common.copyToAgents'), 'play', {
                kind: 'command',
                command: 'ampify.agents.apply',
                commandArgs: { itemType: 'agentItem', data: agent }
            }),
            this.createAction('preview-agent', I18n.get('common.preview'), 'go-to-file', { kind: 'openFile', filePath }),
            this.createAction('goto-agents', I18n.get('dashboard.action.openInAgents'), 'arrow-right', { kind: 'navigate', section: 'agents' })
        ];

        return this.createEntry({
            id: `agent:${agent.meta.agent}`,
            title: agent.meta.agent,
            description,
            subtitle: agent.fileName,
            iconId: 'hubot',
            scope: 'agents',
            badges: tags,
            searchTags: tags,
            searchDescription: description,
            searchSubtitle: agent.fileName,
            searchScope: I18n.get('dashboard.scope.agents'),
            searchExtraKeywords: [],
            actions
        });
    }

    private createRuleEntry(rule: LoadedRule): IndexedResult {
        const tags = rule.meta.tags || [];
        const description = rule.meta.description || I18n.get('common.noData');
        const filePath = rule.path;

        const actions: Array<{ action: DashboardResultAction; runtime: SearchActionRuntime }> = [
            this.createAction('apply-rule', I18n.get('common.copyToRules'), 'play', {
                kind: 'command',
                command: 'ampify.rules.apply',
                commandArgs: { itemType: 'ruleItem', data: rule }
            }),
            this.createAction('preview-rule', I18n.get('common.preview'), 'go-to-file', { kind: 'openFile', filePath }),
            this.createAction('goto-rules', I18n.get('dashboard.action.openInRules'), 'arrow-right', { kind: 'navigate', section: 'rules' })
        ];

        return this.createEntry({
            id: `rule:${rule.meta.rule}`,
            title: rule.meta.rule,
            description,
            subtitle: rule.fileName,
            iconId: 'law',
            scope: 'rules',
            badges: tags,
            searchTags: tags,
            searchDescription: description,
            searchSubtitle: rule.fileName,
            searchScope: I18n.get('dashboard.scope.rules'),
            searchExtraKeywords: [],
            actions
        });
    }


    private createEntry(input: {
        id: string;
        title: string;
        description?: string;
        subtitle?: string;
        iconId: string;
        scope: DashboardSearchResult['scope'];
        badges?: string[];
        searchTags?: string[];
        searchDescription?: string;
        searchSubtitle?: string;
        searchScope?: string;
        searchExtraKeywords?: string[];
        actions: Array<{ action: DashboardResultAction; runtime: SearchActionRuntime }>;
    }): IndexedResult {
        const runtimeActions: Record<string, SearchActionRuntime> = {};
        const actions = input.actions.map(({ action, runtime }) => {
            runtimeActions[action.id] = runtime;
            return action;
        });

        return {
            id: input.id,
            title: input.title,
            description: input.description,
            subtitle: input.subtitle,
            iconId: input.iconId,
            scope: input.scope,
            badges: input.badges,
            actions,
            searchTitle: input.title,
            searchTags: input.searchTags || input.badges || [],
            searchDescription: input.searchDescription || input.description || '',
            searchSubtitle: input.searchSubtitle || input.subtitle || '',
            searchScope: input.searchScope || '',
            searchExtraKeywords: input.searchExtraKeywords || [],
            runtimeActions
        };
    }

    private createAction(
        id: string,
        label: string,
        iconId: string,
        runtime: SearchActionRuntime
    ): { action: DashboardResultAction; runtime: SearchActionRuntime } {
        return {
            action: { id, label, iconId, kind: runtime.kind },
            runtime
        };
    }

    private filterResults(results: IndexedResult[], query: string): IndexedResult[] {
        return rankByWeightedSearch(results, query, (item) => ({
            title: item.searchTitle,
            tags: item.searchTags,
            description: item.searchDescription,
            subtitle: item.searchSubtitle,
            scope: item.searchScope,
            extraKeywords: item.searchExtraKeywords
        })).map((entry) => entry.item);
    }

    private flattenSkills(skills: LoadedSkill[]): LoadedSkill[] {
        const list: LoadedSkill[] = [];
        for (const skill of skills) {
            list.push(skill);
            if (skill.children && skill.children.length > 0) {
                list.push(...this.flattenSkills(skill.children));
            }
        }
        return list;
    }
}
