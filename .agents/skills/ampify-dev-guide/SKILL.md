---
name: ampify-dev-guide
description: Ampify VS Code 扩展开发指南。用于实现/重构 src 模块、同步 MainView Webview 与 Bridge、维护 Skills/Commands 注入链路、处理 Git Share 同步、OpenCode 账号中心、Model Proxy 绑定与日志。用户提到 Ampify 架构、命令注册、数据存储、Webview 协议、模块扩展或排障时使用。
---

# Ampify 开发指南（与当前 src 对齐）

先按以下顺序读取，再动手改代码：
1. `src/extension.ts`：确认模块注册顺序与激活边界。
2. 目标模块 `src/modules/<module>/index.ts` + `core/*`：确认命令、配置、存储目录。
3. `src/modules/mainView/AmpifyViewProvider.ts` + `src/modules/mainView/protocol.ts`：确认 Webview section、消息协议、Bridge 路由。
4. `package.json`：对齐 contributes 的命令与配置项（仅用户可见命令必须声明）。
5. 涉及实例隔离或日志归属时，联读 `src/extension.ts`（`detectInstanceKey`）、`src/modules/launcher/core/processEngine.ts`、`src/modules/modelProxy/core/logManager.ts`。

## 当前架构快照
- 激活顺序：MainView → Copier → Launcher → Git Share → Skills → Commands → OpenCode Copilot Auth → Model Proxy。
- MainView 主 section：`dashboard`、`accountCenter`、`skills`、`commands`、`gitshare`、`modelProxy`、`settings`。
- `accountCenter` 子 tab：`launcher`、`auth`、`ohmy`、`sessions`。
- 兼容 section：`launcher` / `opencodeAuth` 会被 `normalizeSection()` 映射到 `accountCenter`。

## 模块职责速览
1. Copier：复制 `` `path:line` `` / `` `path:start-end` ``。
2. Launcher：多实例启动、共享扩展目录、实例身份文件 `.ampify-instance-key`。
3. Skills Manager：Git Share 中的 skills 仓库扫描、导入、应用、同步 `AGENTS.md`。
4. Commands Manager：Git Share 中的 commands 仓库扫描、导入、应用。
5. Git Share：`gitshare/` 初始化、pull/push/sync、冲突自动处理、diff 预览。
6. OpenCode Copilot Auth：多 provider 凭证、`auth.json` 应用、oh-my 配置快照、opencode 会话管理。
7. Model Proxy：本地 HTTP 代理，OpenAI/Anthropic 兼容，按 API Key 绑定模型。
8. MainView：统一 Webview，Bridge 适配 Tree/Card/Account Center 数据。

## 开发落地清单
1. 新增或调整命令：在模块 `index.ts` 注册；若用户可见，再同步 `package.json` `contributes.commands`。
2. 新增配置：在 `package.json` `contributes.configuration` 声明，并在 `SettingsBridge` 或对应模块读取。
3. 新增 MainView section 或交互：同步 `protocol.ts` 类型、`AmpifyViewProvider.ts` 路由、`templates/jsTemplate.ts` 渲染。
4. 涉及 Skills/Commands 注入：遵循 `.agents/*` 目标目录约定，并兼容 `.claude` 到 `.agents` 迁移逻辑。
5. 涉及本地持久化：优先 `BaseConfigManager`；Git 可共享数据写入 `gitshare/` 子目录。
6. 涉及 i18n：所有用户可见文本走 `I18n.get()`，同步 `en` / `zh-cn`。

## references 导航（按需加载）
- 总体架构与数据流：`references/architecture.md`
- Dashboard 聚合逻辑：`references/module-dashboard.md`
- MainView 与协议：`references/module-mainview.md`
- Copier：`references/module-copier.md`
- Launcher：`references/module-launcher.md`
- Skills Manager：`references/module-skills.md`
- Commands Manager：`references/module-commands.md`
- Git Share：`references/module-gitshare.md`
- OpenCode Copilot Auth：`references/module-opencode-copilot-auth.md`
- Model Proxy：`references/module-modelproxy.md`
- Settings：`references/module-settings.md`
- 编码规范：`references/coding-conventions.md`
