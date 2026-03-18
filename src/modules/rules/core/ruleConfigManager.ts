import * as fs from 'fs';
import * as path from 'path';
import { getGitShareModuleDir, ensureDir } from '../../../common/paths';
import { RulesManagerConfig, LoadedRule } from '../../../common/types';
import { parseRuleMd } from '../templates/ruleMdTemplate';
import { updateFrontmatterTags } from '../../../common/frontmatter';
import { getDefaultInjectTargetValue, normalizeInjectTargetValue } from '../../../common/injectTarget';

export class RuleConfigManager {
    private static instance: RuleConfigManager;

    protected readonly configPath: string;
    protected readonly gitShareDir: string;
    private rulesDir: string;

    private constructor() {
        this.gitShareDir = getGitShareModuleDir(this.getModuleName());
        this.configPath = path.join(this.gitShareDir, 'config.json');
        this.rulesDir = path.join(this.gitShareDir, 'rules');
    }

    public static getInstance(): RuleConfigManager {
        if (!RuleConfigManager.instance) {
            RuleConfigManager.instance = new RuleConfigManager();
        }
        return RuleConfigManager.instance;
    }

    protected getModuleName(): string {
        return 'vscoderulemanager';
    }

    protected getDefaultConfig(): RulesManagerConfig {
        return {
            injectTarget: getDefaultInjectTargetValue('rules')
        };
    }

    public ensureInit(): void {
        ensureDir(this.gitShareDir);
        ensureDir(this.rulesDir);

        if (!fs.existsSync(this.configPath)) {
            fs.writeFileSync(this.configPath, JSON.stringify(this.getDefaultConfig(), null, 2), 'utf8');
        }
    }

    public getConfig(): RulesManagerConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }
            const content = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(content) as RulesManagerConfig;
            const fallback = this.getDefaultConfig().injectTarget ?? getDefaultInjectTargetValue('rules');
            const normalized = normalizeInjectTargetValue(config.injectTarget ?? fallback, 'rules');
            if (normalized !== config.injectTarget) {
                config.injectTarget = normalized;
                this.saveConfig(config);
            }
            return config;
        } catch (error) {
            console.error('Failed to read rules config', error);
            return this.getDefaultConfig();
        }
    }

    public saveConfig(config: RulesManagerConfig): void {
        config.injectTarget = normalizeInjectTargetValue(config.injectTarget, 'rules');
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    }

    public updateRuleTags(rulePath: string, tags: string[]): boolean {
        if (!fs.existsSync(rulePath)) {
            return false;
        }
        const content = fs.readFileSync(rulePath, 'utf8');
        const updated = updateFrontmatterTags(content, tags);
        if (!updated) {
            return false;
        }
        fs.writeFileSync(rulePath, updated, 'utf8');
        return true;
    }

    public getGitShareDir(): string {
        return this.gitShareDir;
    }

    public getConfigPath(): string {
        return this.configPath;
    }

    public getRulesDir(): string {
        return this.rulesDir;
    }

    public getRuleRelativePath(ruleName: string): string {
        return `${this.getModuleName()}/rules/${ruleName}.md`;
    }

    public loadAllRules(): LoadedRule[] {
        const rules: LoadedRule[] = [];

        if (!fs.existsSync(this.rulesDir)) {
            return rules;
        }

        const files = fs.readdirSync(this.rulesDir);
        for (const file of files) {
            if (!file.endsWith('.md')) {
                continue;
            }

            const filePath = path.join(this.rulesDir, file);
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
                continue;
            }

            const rule = this.loadRuleFromFile(filePath);
            if (rule) {
                rules.push(rule);
            }
        }

        return rules.sort((a, b) => a.meta.rule.localeCompare(b.meta.rule));
    }

    public loadRuleFromFile(filePath: string): LoadedRule | null {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const { meta, body } = parseRuleMd(content);

            if (!meta) {
                return null;
            }

            const fileName = path.basename(filePath, '.md');
            if (fileName !== meta.rule) {
                console.warn(`Rule file name mismatch: ${fileName} vs ${meta.rule}`);
                return null;
            }

            return {
                fileName,
                path: filePath,
                meta,
                content: body
            };
        } catch (error) {
            console.error(`Failed to load rule from ${filePath}`, error);
            return null;
        }
    }

    public getRule(ruleName: string): LoadedRule | null {
        const filePath = path.join(this.rulesDir, `${ruleName}.md`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return this.loadRuleFromFile(filePath);
    }

    public saveRuleMd(ruleName: string, content: string): void {
        const filePath = path.join(this.rulesDir, `${ruleName}.md`);
        fs.writeFileSync(filePath, content, 'utf8');
    }

    public deleteRule(ruleName: string): boolean {
        const filePath = path.join(this.rulesDir, `${ruleName}.md`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }

    public ruleExists(ruleName: string): boolean {
        const filePath = path.join(this.rulesDir, `${ruleName}.md`);
        return fs.existsSync(filePath);
    }

    public getAllTags(): string[] {
        const rules = this.loadAllRules();
        const tagSet = new Set<string>();

        for (const rule of rules) {
            if (rule.meta.tags) {
                rule.meta.tags.forEach(tag => tagSet.add(tag));
            }
        }

        return Array.from(tagSet).sort();
    }

    public static validateRuleName(name: string): boolean {
        const pattern = /^[a-z0-9-]+$/;
        return pattern.test(name) && name.length <= 64 && name.length > 0;
    }
}
