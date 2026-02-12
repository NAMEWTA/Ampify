# Ampify 总体架构与数据流

## 架构总览

```mermaid
flowchart TB
    subgraph Extension Host
        EXT[extension.ts]
        COMMON[common/*]
        COP[copier]
        LAU[launcher]
        SKI[skills]
        CMD[commands]
        GIT[gitShare]
        OPA[opencode-copilot-auth]
        MP[modelProxy]
        MV[mainView]
    end

    EXT --> MV
    EXT --> COP
    EXT --> LAU
    EXT --> GIT
    EXT --> SKI
    EXT --> CMD
    EXT --> OPA
    EXT --> MP

    MV --> COMMON
    COP --> COMMON
    LAU --> COMMON
    SKI --> COMMON
    CMD --> COMMON
    GIT --> COMMON
    OPA --> COMMON
    MP --> COMMON
```

## 激活与注册顺序

```mermaid
sequenceDiagram
    participant VS as VS Code
    participant EXT as extension.ts
    VS->>EXT: onStartupFinished
    EXT->>EXT: detectInstanceKey()
    EXT->>EXT: registerMainView()
    EXT->>EXT: registerCopier()
    EXT->>EXT: registerLauncher()
    EXT->>EXT: registerGitShare()
    EXT->>EXT: registerSkillManager() (try)
    EXT->>EXT: registerCommandManager() (try)
    EXT->>EXT: registerOpenCodeCopilotAuth() (try)
    EXT->>EXT: registerModelProxy() (try)
```

## 实例身份链路（instanceKey）
- Launcher 在目标 `user-data-dir` 写入 `.ampify-instance-key`。
- 扩展激活时 `detectInstanceKey()` 从 `process.argv --user-data-dir` 解析并读取该文件。
- MainView 用该值渲染侧边栏账号徽标；Model Proxy 日志按该值分桶写入 `logs/{instanceKey}/`。

## MainView Section 路由
- 主 section：`dashboard`、`accountCenter`、`skills`、`commands`、`gitshare`、`modelProxy`、`settings`
- 兼容 section：`launcher` / `opencodeAuth` 会被 `AmpifyViewProvider.normalizeSection()` 映射到 `accountCenter`
- `accountCenter` tab：`launcher`、`auth`、`ohmy`、`sessions`

## Webview 消息流

```mermaid
sequenceDiagram
    participant UI as Webview
    participant VP as AmpifyViewProvider
    participant BR as Bridge
    participant CMD as vscode.commands

    UI->>VP: postMessage(WebviewMessage)
    VP->>BR: getData/getTreeData/executeAction
    BR->>CMD: executeCommand(...)
    CMD-->>BR: result
    BR-->>VP: SectionData
    VP-->>UI: ExtensionMessage
```

## Git Share 同步主链路

```mermaid
flowchart TD
    A[sync] --> B[ensureInit]
    B --> C[stashIfNeeded]
    C --> D[pullWithRebase]
    D -->|冲突| E[abort rebase + merge]
    D -->|成功| F[pop stash]
    E --> F
    F --> G[commit if needed]
    G --> H[push all remotes]
```

## 数据存储结构

```text
~/.vscode-ampify/
├── vscodemultilauncher/
│   ├── config.json
│   ├── userdata/
│   └── shareExtensions/
├── gitshare/
│   ├── .git/
│   ├── config.json
│   ├── vscodeskillsmanager/
│   │   ├── config.json
│   │   └── skills/{skill-name}/SKILL.md
│   └── vscodecmdmanager/
│       ├── config.json
│       └── commands/{command-name}.md
├── opencode-copilot-auth/
│   └── config.json
└── modelproxy/
    ├── config.json
    └── logs/{instanceKey}/YYYY-MM-DD.jsonl
```

## 配置层级
- VS Code Settings：`ampify.*`（如 `rootDir`、`skills.injectTarget`、`modelProxy.port`）
- Git Share 配置：`~/.vscode-ampify/gitshare/config.json`
- 模块本地配置：`~/.vscode-ampify/<module>/config.json`
