# Skills Manager 模块

## 模块概述
Skills Manager 管理 Git Share 中的技能库，支持创建、导入、应用到项目，并同步生成 `SKILLS.md` 与更新 `AGENTS.md` 引用。

## 目录结构
- `src/modules/skills/index.ts`
- `src/modules/skills/core/skillConfigManager.ts`
- `src/modules/skills/core/skillCreator.ts`
- `src/modules/skills/core/skillImporter.ts`
- `src/modules/skills/core/skillApplier.ts`
- `src/modules/skills/core/agentMdManager.ts`
- `src/modules/skills/templates/skillMdTemplate.ts`

## 数据存储
```text
~/.vscode-ampify/gitshare/vscodeskillsmanager/
├── config.json
└── skills/{skill-name}/SKILL.md
```

## 核心职责
- `SkillConfigManager`：单例；扫描 `skills/`（支持层级 skill）；解析 frontmatter。
- `SkillCreator`：创建 skill 目录与 `SKILL.md`。
- `SkillImporter`：对话框或 URI 批量导入（支持拖拽）。
- `SkillApplier`：将 skill 以软链方式注入项目。
- `AgentMdManager`：扫描注入目录，生成 `.agents/SKILLS.md`，并更新 `AGENTS.md` 中 `<ampify><include .../></ampify>`。

## 注册命令
- `ampify.skills.refresh`
- `ampify.skills.search`
- `ampify.skills.filterByTag`
- `ampify.skills.clearFilter`
- `ampify.skills.create`
- `ampify.skills.import`
- `ampify.skills.importFromUris`
- `ampify.skills.apply`
- `ampify.skills.preview`
- `ampify.skills.openFile`
- `ampify.skills.openFolder`
- `ampify.skills.delete`
- `ampify.skills.remove`
- `ampify.skills.syncToAgentMd`

## 注入与兼容策略
- 默认注入目录：`.agents/skills/`
- 若配置为 `.claude/...`，会自动规范化为 `.agents/...`
- 注入方式：目录软链（Windows 使用 `junction`）

## 应用流程
1. 解析 skill 元数据。
2. 检查 `prerequisites`（`checkCommand` / manual）。
3. 用户确认后注入 skill。
4. 同步 `SKILLS.md` 与 `AGENTS.md`。
