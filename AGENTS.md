# AGENTS.md

## 项目概述
Ampify 是一个 VS Code 扩展，当前能力收敛为：

1. Copier：复制 `path:line` / `path:start-end`
2. Skills Manager：管理全局 skills 并复制到项目 `.claude/skills/`
3. Commands Manager：管理全局 commands 并复制到项目 `.claude/commands/`
4. Git Share：同步 skills/commands 共享仓库并支持 diff
5. MainView：Vue 3 Webview 统一入口（5 个 section）

扩展激活顺序：`MainView -> Copier -> GitShare -> Skills -> Commands`

## 目录结构

- `src/extension.ts`：扩展入口
- `src/common/`：i18n、paths、tag library、git 工具
- `src/modules/copier/`：复制路径与行号
- `src/modules/skills/`：技能管理
- `src/modules/commands/`：命令管理
- `src/modules/gitShare/`：Git 同步与 diff
- `src/modules/mainView/`：宿主控制层（controller/bridges/contracts）
- `webview/`：MainView 前端（Vue 3 + Pinia + Element Plus）
- `webview-dist/mainView/`：构建产物

## MainView

可见 section 仅有：

- `dashboard`
- `skills`
- `commands`
- `gitshare`
- `settings`

说明：

- 不再存在 `accountCenter`、`launcher`、`opencodeAuth` 相关 UI 与契约。
- `copier` 仍以命令形式存在，不提供独立 section。

## 命令组

- 复制：`ampify.copy-relative-path-line`、`ampify.copy-absolute-path-line`
- MainView：`ampify.mainView.refresh`
- Skills：`ampify.skills.*`
- Commands：`ampify.commands.*`
- Git Share：`ampify.gitShare.*`

## 配置项

- `ampify.language`
- `ampify.rootDir`
- `ampify.skills.injectTarget`
- `ampify.commands.injectTarget`

## 开发命令

- `npm run compile`
- `npm run compile:extension`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run watch`
- `npm run lint`

## 注意事项

- 不要手工修改 `webview-dist/`，通过构建生成。
- 注入目标统一为 `.claude/` 体系。
- 历史 launcher/opencode 本地数据目录不会自动删除，但扩展不再读取。
