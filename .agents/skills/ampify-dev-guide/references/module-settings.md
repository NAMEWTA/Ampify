# Settings（配置面板）

## 模块概述
Settings 由 `SettingsBridge` 生成字段定义并处理写入，覆盖两类配置：
- VS Code 全局配置（`ampify.*`）
- Git Share 配置（`gitshare/config.json` 内 `gitConfig`）

## 关键文件
- `src/modules/mainView/bridges/settingsBridge.ts`
- `src/modules/mainView/protocol.ts`
- `src/modules/mainView/templates/jsTemplate.ts`

## 分组字段
### General
- `rootDir`（vscode）
- `opencodeAuth.configDir`（vscode，只读）
- `language`（vscode）

### Paths
- `skills.injectTarget`（vscode）
- `commands.injectTarget`（vscode）

### Git
- `userName`（git）
- `userEmail`（git）
- `remoteUrls`（git，支持换行/逗号）

### Model Proxy
- `modelProxy.port`（vscode）
- `modelProxy.bindAddress`（vscode）

## 写入逻辑
- `scope=vscode`：`workspace.getConfiguration('ampify').update(..., Global)`
- `scope=git`：更新 `gitConfig`，并尝试执行：
  - `gitManager.configureUser(userName,userEmail)`
  - `gitManager.setRemotes(remoteUrls)`

## 交互动作
- `settingsAction=reloadWindow`：执行 `workbench.action.reloadWindow`
- `settingsAction=restartProxy`：先停后启 Model Proxy（当前字段默认未挂载该按钮）

## 维护要点
1. 新增 `ampify.*` 配置时，同步：`package.json` + `SettingsBridge.getSettingsData()`。
2. 新增 git 字段时，同步 `SettingsBridge.updateSetting()`。
