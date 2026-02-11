# Ampify 总体架构与数据流

## 目录
- 架构总览
- 扩展激活与注册顺序
- Webview 消息流
- Git Share 同步流程
- 数据存储结构
- 配置层级

## 架构总览

```mermaid
flowchart TB
    subgraph Extension
        EXT[extension.ts]
        COMMON[common/*]
        MV[mainView]
        COP[copier]
        LAU[launcher]
        SKI[skills]
        CMD[commands]
        GIT[gitShare]
        OPA[opencodeAuth]
        MP[modelProxy]
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

    MV --> SKI
    MV --> CMD
    MV --> LAU
    MV --> GIT
    MV --> OPA
    MV --> MP
```

## 扩展激活与注册顺序

```mermaid
sequenceDiagram
    participant VS as VS Code
    participant EXT as extension.ts
    participant MV as MainView
    participant COP as Copier
    participant LAU as Launcher
    participant GIT as GitShare
    participant SKI as Skills
    participant CMD as Commands
    participant OPA as OpenCode Auth
    participant MP as Model Proxy

    VS->>EXT: onStartupFinished
    EXT->>MV: registerMainView()
    EXT->>COP: registerCopier()
    EXT->>LAU: registerLauncher()
    EXT->>GIT: registerGitShare()
    EXT->>SKI: registerSkillManager() (try)
    EXT->>CMD: registerCommandManager() (try)
    EXT->>OPA: registerOpenCodeCopilotAuth() (try)
    EXT->>MP: registerModelProxy() (try)
```

## Webview 消息流

```mermaid
sequenceDiagram
    participant UI as Webview UI
    participant VP as AmpifyViewProvider
    participant BR as Bridge
    participant CMD as vscode.commands

    UI->>VP: postMessage(WebviewMessage)
    VP->>BR: executeAction()/getTreeData()
    BR->>CMD: executeCommand(...)
    CMD-->>BR: result
    BR-->>VP: TreeNode[] / ToolbarAction[]
    VP-->>UI: postMessage(ExtensionMessage)
```

补充的 Bridge TreeNode 结构流图请参见：references/module-mainview.md

## Git Share 同步流程

```mermaid
flowchart TD
    A[gitManager.sync] --> B[ensureInit]
    B --> C[stashIfNeeded]
    C --> D[pullWithRebase]
    D -->|rebase ok| E[popStash]
    D -->|rebase conflict| F[abort rebase]
    F --> G[merge]
    G --> H[resolve with theirs]
    H --> E
    E --> I[commit]
    I --> J[push to remotes]
```

## 数据存储结构

```
~/.vscode-ampify/
├── vscodemultilauncher/
│   ├── config.json
│   ├── userdata/
│   └── shareExtensions/
├── opencode-copilot-auth/
│   └── config.json
├── modelproxy/
│   ├── config.json
│   └── logs/
│       ├── 2026-02-06.jsonl
│       └── ...
└── gitshare/
    ├── .git/
    ├── .gitignore
    ├── config.json
    ├── vscodeskillsmanager/
    │   ├── config.json
    │   └── skills/{skill-name}/SKILL.md
    └── vscodecmdmanager/
        ├── config.json
        └── commands/{command-name}.md
```

## 配置层级

```mermaid
flowchart LR
    VS[VS Code Settings]
    GIT[gitshare/config.json]
    MOD[模块 config.json]

    VS -->|ampify.*| MOD
    VS -->|ampify.rootDir| GIT
    GIT -->|gitConfig| MV
```

- VS Code Settings 负责 `ampify.*` 配置
- Git Share 配置集中存放于 `gitshare/config.json`
- Skills/Commands 模块配置分别位于 `gitshare/vscodeskillsmanager/config.json` 与 `gitshare/vscodecmdmanager/config.json`
- 其他本地模块配置位于 `~/.vscode-ampify/<module>/config.json`（如 `opencode-copilot-auth`、`modelproxy`）
