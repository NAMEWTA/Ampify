# Dashboard（仪表盘）

## 模块概述
Dashboard 是 MainView 默认页，由 `DashboardBridge` 聚合各模块摘要并输出 `DashboardData`。

## 数据来源
- Launcher：实例数量与 next-up 信息
- Skills：技能数量
- Commands：命令数量
- OpenCode：凭证数量与 next-up 信息
- Git Share：仓库状态/变更/远端
- Model Proxy：运行状态、今日请求/Token/错误、绑定数
- Workspace：当前工作区名称
- Recent Logs：最近 10 条代理日志

## 关键字段
- `stats[]`
- `moduleHealth[]`
- `gitInfo`
- `proxyInfo`
- `workspaceInfo`
- `recentLogs[]`
- `launcher` / `opencode`
- `quickActions[]`
- `labels`

## 快捷操作（当前实现）
- 新建 Launcher 实例（toolbar action）
- 创建 Skill（toolbar action）
- 创建 Command（toolbar action）
- Git Sync（command）
- Toggle Model Proxy（command）

## 与 Account Center 的关系
- `stats.targetSection` 仍可能写为 `launcher/opencodeAuth`。
- `AmpifyViewProvider.normalizeSection()` 会将其统一映射到 `accountCenter`。

## 维护要点
1. 新增模块摘要时，优先在 `DashboardBridge` 增加数据采集。
2. 所有文案通过 `I18n.get()` 输出。
3. 修改 `DashboardData` 时，同步 `protocol.ts` 与前端渲染。
