# Dashboard（仪表盘）

## 模块概述
Dashboard 是 MainView 的默认入口，用于聚合各模块关键指标、健康状态与快捷操作。数据由 `DashboardBridge` 统一拉取与拼装，前端只负责渲染。

## 数据来源与聚合
`DashboardBridge.getData()` 主要聚合以下数据：

- **Stats**：实例数、技能数、命令数、OpenCode 凭证数、Git 状态、代理状态、今日请求与 token 统计。
- **Module Health**：launcher/skills/commands/gitshare/modelProxy/opencodeAuth 的健康状态与摘要。
- **Git Info**：Git Share 的分支、远端与变更统计。
- **Proxy Info**：Model Proxy 的运行状态、端口、Base URL、今日统计、绑定数量。
- **Workspace Info**：当前工作区名称。
- **Recent Logs**：最近 10 条代理请求日志。
- **Next Up**：Launcher / OpenCode 的最近与下一项切换信息。
- **Quick Actions**：常用操作的快捷入口。

## 关键字段（DashboardData）
- `stats[]`：卡片统计（可带 `targetSection`）
- `moduleHealth[]`：模块状态 pill（active / inactive / warning / error）
- `gitInfo` / `proxyInfo` / `workspaceInfo`
- `recentLogs[]`：用于 Dashboard 最近日志
- `launcher` / `opencode`：用于「Next Up」区域
- `quickActions[]`：快捷操作
- `labels`：i18n 文案集中输出

## Stats 与健康状态

### Stats 来源
- Launcher：`ConfigManager` 实例数
- Skills：`SkillConfigManager` 扫描数量
- Commands：`CommandConfigManager` 扫描数量
- OpenCode Auth：`OpenCodeCopilotAuthConfigManager` 凭证数
- Git：`GitManager.getStatus()`
- Model Proxy：`ProxyConfigManager` + `getProxyServer()`
- 今日统计：`LogManager.getTodayStats()`

### Module Health
- 根据各模块的有效数据量/运行状态设置 `status` 与 `detail`
- Git 以是否初始化/是否有变更区分 `active` / `warning` / `inactive`

## Quick Actions
当前内置快捷操作：
- 启动新实例（Launcher add）
- 创建 Skill
- 创建 Command
- Git Sync
- Model Proxy Toggle

## 交互行为
- Stats 卡片与健康 pill 可携带目标 `SectionId`，点击后切换到对应模块
- 「Next Up」提供 Launcher 与 OpenCode 的快速切换按钮
- Quick Actions 通过命令或 toolbar action 触发

## 关键文件
- `src/modules/mainView/bridges/dashboardBridge.ts`
- `src/modules/mainView/protocol.ts`
- `src/modules/mainView/templates/jsTemplate.ts`

## 维护要点
- 新增模块或统计指标时，优先在 `DashboardBridge` 增加数据源
- `labels` 必须通过 `I18n.get()` 统一输出
- 变更数据结构需同步更新 Webview 渲染逻辑与 `protocol.ts` 类型定义
