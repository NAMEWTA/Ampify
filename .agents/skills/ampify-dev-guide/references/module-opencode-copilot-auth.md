# OpenCode Copilot Auth 模块

## 模块概述
该模块负责管理 OpenCode 凭证库，并将选中凭证写入 `~/.local/share/opencode/auth.json`。当前已扩展为账号中心能力：
- 多 provider 凭证与激活状态（`activeByProvider`）
- oh-my-opencode 快照导入/回放
- opencode 会话托管（外部终端 / 内嵌 Web）

## 目录结构
```text
src/modules/opencode-copilot-auth/
├── index.ts
└── core/
    ├── configManager.ts
    ├── authSwitcher.ts
    ├── ohMyProfileManager.ts
    └── opencodeSessionManager.ts
```

## 核心类与职责
- `OpenCodeCopilotAuthConfigManager`：管理 `opencode-copilot-auth/config.json`，含 credentials / provider 激活映射 / ohMyProfiles / managedSessions。
- `AuthSwitcher`：读写 `~/.local/share/opencode/auth.json`，支持按 provider 应用或清空。
- `OhMyProfileManager`：管理 `~/.config/opencode/oh-my-opencode.json` 的快照导入与应用。
- `OpencodeSessionManager`：启动、扫描、打开、最小化、结束 opencode 会话。

## 关键命令
### 凭证
- `ampify.opencodeAuth.add`
- `ampify.opencodeAuth.import`
- `ampify.opencodeAuth.openAuthJson`
- `ampify.opencodeAuth.zeroConfig`
- `ampify.opencodeAuth.apply`（主命令）
- `ampify.opencodeAuth.switch`（兼容别名）
- `ampify.opencodeAuth.switchNext`
- `ampify.opencodeAuth.clear`
- `ampify.opencodeAuth.delete`
- `ampify.opencodeAuth.rename`

### oh-my
- `ampify.opencode.ohmy.import`
- `ampify.opencode.ohmy.apply`
- `ampify.opencode.ohmy.openConfig`

### session
- `ampify.opencode.session.start`
- `ampify.opencode.session.startInternal`
- `ampify.opencode.session.open`
- `ampify.opencode.session.openInternal`
- `ampify.opencode.session.minimizeInternal`
- `ampify.opencode.session.kill`
- `ampify.opencode.session.refresh`
- `ampify.opencode.session.openConfig`

## 业务流程
### 应用凭证
1. 选择 credential。
2. `AuthSwitcher.applyCredential()` 写入 `auth.json` 对应 provider。
3. `configManager.setActiveByProvider()` + `setLastSwitched()`。
4. 刷新 MainView。

说明：当前 `apply/switch/clear` 不再自动启动 opencode 终端。

### oh-my 快照
1. `ohmy.import` 读取当前 `~/.config/opencode/oh-my-opencode.json`。
2. 按 `contentHash` 入库为 profile。
3. `ohmy.apply` 将 profile 内容回写目标文件并更新 active profile。

### session 托管
- 外部终端：创建 VS Code terminal，执行 `opencode --port 0`。
- 内嵌 Web：spawn `opencode serve --hostname 127.0.0.1 --port <freePort>`，并等待 HTTP 就绪。
- 会话记录写入 `managedSessions`，同时保存 provider/oh-my 快照。
- 监听 `onDidCloseTerminal` 自动清理已关闭终端对应的 managed session。
- `getSessionViews()` 会合并“托管会话 + 外部扫描到的 opencode 进程”，并按 `startedAt` 倒序输出。

## 数据存储
### Ampify 本地配置
```text
~/.vscode-ampify/opencode-copilot-auth/config.json
```

示例结构：
```json
{
  "credentials": [],
  "activeByProvider": {},
  "ohMyProfiles": [],
  "activeOhMyProfileId": "...",
  "managedSessions": [],
  "activeId": "...",
  "lastSwitchedId": "...",
  "lastSwitchedAt": 1739251200000
}
```

### OpenCode 文件
```text
~/.local/share/opencode/auth.json
~/.config/opencode/oh-my-opencode.json
```

## MainView 对接
- 主入口位于 `accountCenter`。
- tab：`auth`、`ohmy`、`sessions`。
- `AccountCenterBridge` 统一提供 tab 数据与 toolbar 操作。
