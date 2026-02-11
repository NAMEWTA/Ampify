# Settings（配置面板）

## 模块概述
Settings 是 MainView 的配置面板，负责编辑 VS Code Settings 与 Git Share 配置。核心逻辑由 `SettingsBridge` 提供：输出表单结构并处理保存。

## 数据结构
- `SettingsData.sections[]`：配置分组
- `SettingsSection.fields[]`：字段定义（label/description/kind/value/scope/action）
- `SettingsScope`：`vscode` 或 `git`

## 分组与字段

### General
- `rootDir`（vscode）：Ampify 全局数据根目录；为空则使用默认 `~/.vscode-ampify/`
- `opencodeAuth.configDir`（vscode, readOnly）：OpenCode Auth 模块配置目录（基于 rootDir 计算）
- `language`（vscode）：`en` / `zh-cn`

### Paths
- `skills.injectTarget`（vscode）：Skill 注入目录
- `commands.injectTarget`（vscode）：Command 注入目录

### Git
- `userName`（git）：Git 用户名
- `userEmail`（git）：Git 邮箱
- `remoteUrls`（git）：远端列表，支持换行或逗号分隔

### Model Proxy
- `modelProxy.port`（vscode）：代理端口
- `modelProxy.bindAddress`（vscode）：绑定地址

## 保存策略

### VS Code Settings
- `scope = vscode` 时调用 `vscode.workspace.getConfiguration('ampify').update()`
- 保存位置为全局（`ConfigurationTarget.Global`）
- `opencodeAuth.configDir` 只读，不允许写入

### Git Share 配置
- `scope = git` 时写入 `gitshare/config.json` 中的 `gitConfig`
- 保存后自动执行：
  - `gitManager.configureUser(userName, userEmail)`
  - `gitManager.setRemotes(remoteUrls)`

## UI 交互
- 输入框 400ms debounce 触发 `changeSetting`
- 支持 `settingsAction` 按钮：
  - `reloadWindow`：刷新窗口（rootDir 变更后生效）
  - `restartProxy`：停止并重启 Model Proxy（预留命令）

## 关键文件
- `src/modules/mainView/bridges/settingsBridge.ts`
- `src/modules/mainView/templates/jsTemplate.ts`
- `src/modules/mainView/protocol.ts`
- `src/common/paths.ts`

## 维护要点
- 新增设置项时：
  1. 在 `package.json` 增加 `ampify.*` 配置
  2. 在 `SettingsBridge.getSettingsData()` 增加对应字段
  3. 若涉及 Git 配置，更新 `SettingsBridge.updateSetting()`
- 对 rootDir 的变更通常需要 reload 才能生效
