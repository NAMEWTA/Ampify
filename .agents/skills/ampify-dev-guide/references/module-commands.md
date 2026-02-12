# Commands Manager 模块

## 模块概述
Commands Manager 管理 Git Share 中的命令库。每个命令对应一个 Markdown 文件，文件名必须与 frontmatter `command` 字段一致。

## 目录结构
- `src/modules/commands/index.ts`
- `src/modules/commands/core/commandConfigManager.ts`
- `src/modules/commands/core/commandCreator.ts`
- `src/modules/commands/core/commandImporter.ts`
- `src/modules/commands/core/commandApplier.ts`
- `src/modules/commands/templates/commandMdTemplate.ts`

## 数据存储
```text
~/.vscode-ampify/gitshare/vscodecmdmanager/
├── config.json
└── commands/{command-name}.md
```

## 核心职责
- `CommandConfigManager`：单例；扫描 commands 目录并校验文件名一致性。
- `CommandCreator`：创建命令文件。
- `CommandImporter`：导入命令 Markdown。
- `CommandApplier`：将命令以软链方式注入项目目录。

## 注册命令
- `ampify.commands.refresh`
- `ampify.commands.search`
- `ampify.commands.filterByTag`
- `ampify.commands.clearFilter`
- `ampify.commands.create`
- `ampify.commands.import`
- `ampify.commands.apply`
- `ampify.commands.preview`
- `ampify.commands.open`
- `ampify.commands.openFolder`
- `ampify.commands.delete`
- `ampify.commands.remove`

## 注入策略
- 默认注入目录：`.agents/commands/`
- 若配置为 `.claude/...`，会自动规范化为 `.agents/...`
- 注入方式：文件软链（`fs.symlinkSync`）

## 关键约束
- 命令名校验：`^[a-z0-9-]+$` 且长度 `1..64`
- 文件名与 frontmatter `command` 不一致时，条目会被忽略
