/**
 * Skills 数据桥接
 * 将 Skills 模块数据适配为 TreeNode[]
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TreeNode, ToolbarAction } from '../protocol';
import { SkillConfigManager } from '../../skills/core/skillConfigManager';
import { LoadedSkill, FilterState } from '../../../common/types';
import { I18n } from '../../../common/i18n';

export class SkillsBridge {
    private configManager: SkillConfigManager;
    private filterState: FilterState = {};

    constructor() {
        this.configManager = SkillConfigManager.getInstance();
    }

    getTreeData(): TreeNode[] {
        const nodes: TreeNode[] = [];

        // 过滤信息
        if (this.hasActiveFilter()) {
            nodes.push({
                id: 'skills-filter-info',
                label: `🔍 ${this.getFilterDescription()}`,
                iconId: 'filter',
                nodeType: 'filterInfo',
                tooltip: 'Click to clear filter',
                inlineActions: [
                    { id: 'clearFilter', label: 'Clear Filter', iconId: 'close' }
                ]
            });
        }

        // 技能列表
        let skills = this.configManager.loadAllSkills();
        if (this.hasActiveFilter()) {
            skills = this.filterSkills(skills);
        }

        if (skills.length === 0) {
            nodes.push({
                id: 'skills-empty',
                label: this.hasActiveFilter()
                    ? I18n.get('skills.noMatchingSkills')
                    : I18n.get('skills.noSkills'),
                iconId: 'info',
                nodeType: 'empty',
                command: this.hasActiveFilter() ? undefined : 'ampify.skills.create'
            });
        } else {
            for (const skill of skills) {
                nodes.push(this.createSkillNode(skill));
            }
        }

        return nodes;
    }

    getToolbar(): ToolbarAction[] {
        return [
            { id: 'search', label: 'Search', iconId: 'search', command: '', action: 'overlay' },
            { id: 'refresh', label: 'Refresh', iconId: 'refresh', command: 'ampify.skills.refresh' },
            { id: 'create', label: 'Create', iconId: 'add', command: '', action: 'overlay' },
            { id: 'import', label: 'Import', iconId: 'folder-library', command: 'ampify.skills.import' },
            { id: 'openFolder', label: 'Open Folder', iconId: 'folder-opened', command: 'ampify.skills.openFolder' },
            { id: 'syncAgentMd', label: 'Sync AGENT.md', iconId: 'book', command: 'ampify.skills.syncToAgentMd' }
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
        const skillName = nodeId.replace('skill-', '').replace(/-children$/, '');
        const skills = this.configManager.loadAllSkills();
        const skill = skills.find(s => s.meta.name === skillName);

        switch (actionId) {
            case 'apply':
                if (skill) {
                    await vscode.commands.executeCommand('ampify.skills.apply', {
                        itemType: 'skillItem', data: skill
                    });
                }
                break;
            case 'preview':
                if (skill) {
                    await vscode.commands.executeCommand('ampify.skills.preview', skill);
                }
                break;
            case 'delete':
                if (skill) {
                    await vscode.commands.executeCommand('ampify.skills.delete', {
                        itemType: 'skillItem', data: skill
                    });
                }
                break;
            case 'openFolder':
                if (skill) {
                    await vscode.commands.executeCommand('ampify.skills.openFolder', {
                        itemType: 'skillItem', data: skill
                    });
                }
                break;
            case 'openFile':
                await vscode.commands.executeCommand('ampify.skills.openFile', nodeId);
                break;
        }
    }

    private createSkillNode(skill: LoadedSkill): TreeNode {
        const children: TreeNode[] = [];

        // 标签
        if (skill.meta.tags && skill.meta.tags.length > 0) {
            children.push({
                id: `skill-${skill.meta.name}-tags`,
                label: `${I18n.get('skills.tags')}: ${skill.meta.tags.join(', ')}`,
                iconId: 'symbol-keyword',
                nodeType: 'detail'
            });
        }

        // 前置依赖
        if (skill.meta.prerequisites && skill.meta.prerequisites.length > 0) {
            children.push({
                id: `skill-${skill.meta.name}-prereqs`,
                label: I18n.get('skills.prerequisites'),
                description: skill.meta.prerequisites.map(p => p.name).join(', '),
                iconId: 'package',
                nodeType: 'detail'
            });
        }

        // 文件列表
        const files = this.listAllFiles(skill.path);
        if (files.length > 0) {
            const fileChildren = files.map(filePath => {
                const relativePath = path.relative(skill.path, filePath);
                return {
                    id: filePath,
                    label: relativePath,
                    iconId: 'file',
                    nodeType: 'file',
                    command: 'ampify.skills.openFile',
                    commandArgs: JSON.stringify(filePath)
                } as TreeNode;
            });

            children.push({
                id: `skill-${skill.meta.name}-files`,
                label: 'Files',
                iconId: 'folder',
                collapsible: true,
                children: fileChildren,
                nodeType: 'filesGroup'
            });
        }

        const desc = skill.meta.description.length > 50
            ? skill.meta.description.substring(0, 50) + '...'
            : skill.meta.description;

        return {
            id: `skill-${skill.meta.name}`,
            label: skill.meta.name,
            description: desc,
            iconId: 'extensions',
            collapsible: children.length > 0,
            children,
            nodeType: 'skillItem',
            command: 'ampify.skills.preview',
            commandArgs: JSON.stringify({ name: skill.meta.name }),
            tooltip: skill.meta.description,
            inlineActions: [
                { id: 'apply', label: 'Apply to Project', iconId: 'play' },
                { id: 'preview', label: 'Preview', iconId: 'open-preview' }
            ],
            contextActions: [
                { id: 'openFolder', label: 'Open Folder', iconId: 'folder-opened' },
                { id: 'delete', label: 'Delete', iconId: 'trash', danger: true }
            ]
        };
    }

    private listAllFiles(dir: string): string[] {
        const results: string[] = [];
        if (!fs.existsSync(dir)) { return results; }
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

    private hasActiveFilter(): boolean {
        return !!(this.filterState.keyword || (this.filterState.tags && this.filterState.tags.length > 0));
    }

    private filterSkills(skills: LoadedSkill[]): LoadedSkill[] {
        return skills.filter(skill => {
            if (this.filterState.keyword) {
                const keyword = this.filterState.keyword.toLowerCase();
                const matchName = skill.meta.name.toLowerCase().includes(keyword);
                const matchDesc = skill.meta.description.toLowerCase().includes(keyword);
                const matchTags = skill.meta.tags?.some(tag => tag.toLowerCase().includes(keyword)) || false;
                if (!matchName && !matchDesc && !matchTags) { return false; }
            }
            if (this.filterState.tags && this.filterState.tags.length > 0) {
                if (!skill.meta.tags || skill.meta.tags.length === 0) { return false; }
                const hasMatchingTag = this.filterState.tags.some(filterTag => skill.meta.tags!.includes(filterTag));
                if (!hasMatchingTag) { return false; }
            }
            return true;
        });
    }

    private getFilterDescription(): string {
        const parts: string[] = [];
        if (this.filterState.keyword) { parts.push(`"${this.filterState.keyword}"`); }
        if (this.filterState.tags && this.filterState.tags.length > 0) { parts.push(this.filterState.tags.join(', ')); }
        return parts.join(' + ');
    }
}
