# MainView 模块

## 模块概述
MainView 使用单一 `WebviewViewProvider`（`AmpifyViewProvider`）承载全部界面。当前主导航为 7 个 section：
- `dashboard`
- `accountCenter`
- `skills`
- `commands`
- `gitshare`
- `modelProxy`
- `settings`

其中 `accountCenter` 聚合了原来的 `launcher` 与 `opencodeAuth` 入口，并扩展了 `ohmy`、`sessions`。

## 目录结构
- `src/modules/mainView/index.ts`
- `src/modules/mainView/AmpifyViewProvider.ts`
- `src/modules/mainView/protocol.ts`
- `src/modules/mainView/bridges/*.ts`
- `src/modules/mainView/templates/*.ts`

## 核心 Bridge
- `DashboardBridge`
- `AccountCenterBridge`
- `LauncherBridge`（兼容旧 section）
- `SkillsBridge`
- `CommandsBridge`
- `GitShareBridge`
- `ModelProxyBridge`
- `OpenCodeAuthBridge`（兼容旧 section）
- `SettingsBridge`

## Section 兼容与归一化
- `normalizeSection()` 将 `launcher`、`opencodeAuth` 统一映射到 `accountCenter`
- 当来自旧入口时，通过 `getAccountCenterTabBySection()` 自动切换到对应 tab

## 协议重点（`protocol.ts`）
### Webview -> Extension
- 通用：`ready`、`switchSection`、`toolbarAction`、`treeItemAction`、`quickAction`
- Account Center：`accountCenterTabChange`、`accountCenterAction`
- Settings：`changeSetting`、`settingsAction`
- Model Proxy：`proxyAction`、`addProxyBinding`、`removeProxyBinding`、`queryLogs`

### Extension -> Webview
- `updateDashboard`
- `updateAccountCenter`
- `updateSection`
- `updateSettings`
- `updateModelProxy`
- `setActiveSection`
- `showOverlay` / `showConfirm`

## 关键行为
1. Webview `ready` 时，先推送 Dashboard，再预加载 Account Center 数据。
2. 可见时触发 `gitManager.sync()`，并做 30 秒节流。
3. `ampify.mainView.refresh` 刷新当前 section。
4. `settingsAction=reloadWindow` 可重载窗口；`restartProxy` 可重启 Model Proxy。
5. 前端会定时轮询会话状态：仅在 `accountCenter/sessions` 可见且无内嵌可见会话时触发 `refreshSessions`。

## Account Center 结构
- tab：`launcher`、`auth`、`ohmy`、`sessions`
- `AccountCenterBridge.getData()` 返回：
  - `tabs`
  - `dashboard`（provider、oh-my、models 摘要）
  - `sections[tab].rows`
  - `toolbar`

## 扩展 MainView 的最小步骤
1. 在 `protocol.ts` 增加类型（section/消息/数据结构）。
2. 新增 Bridge，提供 `getTreeData/getToolbar/executeAction` 或 `getData`。
3. 在 `AmpifyViewProvider.sendSectionData()` 与消息路由中接入。
4. 在 `templates/jsTemplate.ts` 增加渲染逻辑。
5. 在 `templates/htmlTemplate.ts` 加入导航项（如需要）。
