# OpenCode Copilot Auth 模块

## 模块概述
OpenCode Copilot Auth 提供多凭证管理与快速切换，核心目标是写入 OpenCode CLI 的 `auth.json` 中 `github-copilot` 条目，并同步维护本地凭证库与使用状态。

### 核心能力
- 新增/导入/删除/重命名凭证
- 切换当前凭证并写入 OpenCode `auth.json`
- 清空 `github-copilot` 条目
- 快速切换下一账号（循环）
- MainView 列表/卡片双视图

## 目录结构
```
src/modules/opencode-copilot-auth/
├── index.ts                  # registerOpenCodeCopilotAuth(context)
└── core/
    ├── configManager.ts      # OpenCodeCopilotAuthConfigManager
    └── authSwitcher.ts       # AuthSwitcher
```

## 核心类与职责

| 类 | 职责 |
|---|---|
| `OpenCodeCopilotAuthConfigManager` | 继承 `BaseConfigManager`，管理 `opencode-copilot-auth/config.json` 的凭证列表与激活状态 | 
| `AuthSwitcher` | 读取/写入 OpenCode `auth.json`，导入当前 `github-copilot` 记录，执行切换与清除 | 

## 业务流程

### 新增凭证
1. `ampify.opencodeAuth.add` 提示输入 `name/access/refresh`（可传入预置值）
2. `OpenCodeCopilotAuthConfigManager.addCredential()` 写入本地 config
3. 刷新 MainView

### 导入凭证
1. `AuthSwitcher.importCurrentCredential()` 读取 `~/.local/share/opencode/auth.json`
2. 解析 `github-copilot` 条目，若不存在则提示未找到
3. 若 access 已存在则提示重复
4. 输入名称后保存到本地 config

### 切换凭证
1. 查找目标凭证 → `AuthSwitcher.switchCredential()`
2. 将 `github-copilot` 条目写回 `auth.json`
3. 保存 `activeId` 与 `lastSwitchedAt`
4. 启动名为 `opencode` 的终端并执行 `opencode`
5. 刷新 MainView

### 清空凭证
1. `AuthSwitcher.clearCredential()` 删除 `github-copilot` 条目
2. 启动 `opencode` 终端以触发 CLI 重新加载

## 命令注册

| 命令 ID | 说明 |
|---|---|
| `ampify.opencodeAuth.add` | 新增凭证（支持传入参数） |
| `ampify.opencodeAuth.import` | 从 OpenCode `auth.json` 导入 |
| `ampify.opencodeAuth.switch` | 切换指定凭证 |
| `ampify.opencodeAuth.switchNext` | 切换到下一个凭证 |
| `ampify.opencodeAuth.clear` | 清空 `github-copilot` 条目 |
| `ampify.opencodeAuth.delete` | 删除凭证 |
| `ampify.opencodeAuth.rename` | 重命名凭证 |

## 数据存储

### 本地配置
```
~/.vscode-ampify/
└── opencode-copilot-auth/
    └── config.json
```

### OpenCode CLI 配置
```
~/.local/share/opencode/
└── auth.json
```

### config.json 结构
```json
{
  "credentials": [
    {
      "id": "uuid",
      "name": "Personal",
      "type": "oauth",
      "access": "...",
      "refresh": "...",
      "expires": 0,
      "lastUsedAt": 1739251200000
    }
  ],
  "activeId": "uuid",
  "lastSwitchedId": "uuid",
  "lastSwitchedAt": 1739251200000
}
```

## MainView Bridge

### TreeNode 结构
```
🔑 OpenCode Auth
  ├── Personal   active · token abcd…wxyz · expires 2026/02/11
  ├── Work       token 1234…abcd · expires —
  └── ...
```

### Toolbar
- Add（overlay）
- Import
- Switch Next
- Clear
- Refresh

## 关键约束
- `auth.json` 不存在时导入返回空并提示用户
- 切换/清空都会重启名为 `opencode` 的终端会话
- `expires` 可接受秒/毫秒时间戳（小于 `1e11` 视为秒）
