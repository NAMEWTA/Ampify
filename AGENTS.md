# AGENT.md

## 项目概述
Ampify 是一个 VS Code 扩展，核心能力包括：
1. 快速复制“文件路径 + 行号”，便于报告与代码评审引用。
2. 多账户启动器，用于管理与启动不同的用户配置。
3. Skills Manager：全局 Skills 库管理、SKILL.md 元数据解析、注入项目。
4. Commands Manager：全局 Commands 库管理、单文件命令管理与项目注入。
5. Git Share：Skills/Commands 共享仓库同步与差异预览。
6. Model Proxy：本地 HTTP 反代理，提供 OpenAI/Anthropic 兼容接口与日志。
7. OpenCode Copilot Auth：多凭证管理与快速切换。
8. MainView：统一 Webview 视图，集中呈现各模块数据与操作。

扩展在启动完成后激活（`onStartupFinished`），统一注册各模块命令，并在 Activity Bar 提供主入口视图。

- 入口文件： [src/extension.ts](src/extension.ts)
- 扩展清单： [package.json](package.json)
- 变更记录： [CHANGELOG.md](CHANGELOG.md)

## 项目结构
- [src/](src/)：扩展源代码
  - [src/extension.ts](src/extension.ts)：扩展入口与模块编排
  - [src/common/](src/common/)：公共能力（i18n、类型、路径、Git、AI 标签）
    - [src/common/i18n.ts](src/common/i18n.ts)：国际化字典与读取
    - [src/common/paths.ts](src/common/paths.ts)：路径与目录工具
    - [src/common/baseConfigManager.ts](src/common/baseConfigManager.ts)：配置管理基类
    - [src/common/types/index.ts](src/common/types/index.ts)：共享类型定义
    - [src/common/frontmatter.ts](src/common/frontmatter.ts)：Frontmatter 解析工具
    - [src/common/tagLibrary.ts](src/common/tagLibrary.ts)：标签库管理
    - [src/common/ai/](src/common/ai/)：AI 标签引擎
      - [src/common/ai/aiTaggingEngine.ts](src/common/ai/aiTaggingEngine.ts)：AI 标签生成引擎
    - [src/common/git/](src/common/git/)：Git 管理与 diff 视图
  - [src/modules/](src/modules/)：功能模块
    - [src/modules/copier/](src/modules/copier/)：复制路径与行号
    - [src/modules/launcher/](src/modules/launcher/)：多账户启动器
      - [src/modules/launcher/core/](src/modules/launcher/core/)：配置与进程启动
    - [src/modules/skills/](src/modules/skills/)：Skills Manager
      - [src/modules/skills/core/](src/modules/skills/core/)：配置、导入、应用、创建、AGENTS.md 同步、AI 标签
        - [src/modules/skills/core/skillAiTagger.ts](src/modules/skills/core/skillAiTagger.ts)：技能 AI 标签器
      - [src/modules/skills/templates/](src/modules/skills/templates/)：SKILL.md 模板
    - [src/modules/commands/](src/modules/commands/)：Commands Manager
      - [src/modules/commands/core/](src/modules/commands/core/)：配置、导入、应用、创建、AI 标签
        - [src/modules/commands/core/commandAiTagger.ts](src/modules/commands/core/commandAiTagger.ts)：命令 AI 标签器
      - [src/modules/commands/templates/](src/modules/commands/templates/)：Command MD 模板
    - [src/modules/gitShare/](src/modules/gitShare/)：Git Share
    - [src/modules/opencode-copilot-auth/](src/modules/opencode-copilot-auth/)：OpenCode Copilot Auth
      - [src/modules/opencode-copilot-auth/core/](src/modules/opencode-copilot-auth/core/)：凭证配置与切换
    - [src/modules/modelProxy/](src/modules/modelProxy/)：Model Proxy
      - [src/modules/modelProxy/core/](src/modules/modelProxy/core/)：代理配置、鉴权、模型桥接、日志与 HTTP 服务
    - [src/modules/mainView/](src/modules/mainView/)：统一主视图（Webview）
      - [src/modules/mainView/bridges/](src/modules/mainView/bridges/)：数据桥接
      - [src/modules/mainView/templates/](src/modules/mainView/templates/)：HTML/CSS/JS 模板
      - [src/modules/mainView/protocol.ts](src/modules/mainView/protocol.ts)：通信协议
- [package.json](package.json)：扩展清单、命令、快捷键、脚本与依赖
- [tsconfig.json](tsconfig.json)：TypeScript 编译配置
- [eslint.config.js](eslint.config.js)：ESLint 规则
- [README.md](README.md)：使用说明
- [CHANGELOG.md](CHANGELOG.md)：版本变更
- [.vscode/](.vscode/)：本地调试配置
  - [.vscode/launch.json](.vscode/launch.json)：调试配置
  - [.vscode/tasks.json](.vscode/tasks.json)：构建任务
- [.vscodeignore](.vscodeignore)：VSIX 打包忽略规则
- [LICENSE](LICENSE)：许可证
- [icon.png](icon.png)：扩展图标

## 技术栈
- VS Code Extension API
- TypeScript 5.6
- ESLint 9（Flat Config）
- Node.js 类型：@types/node 24
- 依赖：simple-git、yaml、@vscode/codicons

## 入口与核心逻辑
入口函数 `activate()` 在启动完成后触发，按顺序注册：MainView → Copier → Launcher → GitShare → Skills → Commands → OpenCode Copilot Auth → Model Proxy。

### 复制路径逻辑（Copier）
核心在 `buildReference()`：
1. 获取当前编辑器与文档
2. 计算相对或绝对路径
3. 计算行号：单行输出 `line`，多行输出 `start-end`
4. 拼接格式：`path:line` 并包裹反引号
5. 写入剪贴板并在状态栏提示

### 启动器逻辑（Launcher）
1. `ConfigManager` 负责配置文件与实例目录初始化
2. `ProcessEngine` 解析 VS Code 可执行路径并启动新实例
3. MainView 通过 Bridge 展示实例列表

### Skills Manager 逻辑
1. [src/modules/skills/core/skillConfigManager.ts](src/modules/skills/core/skillConfigManager.ts) 负责配置与技能扫描
2. [src/modules/skills/templates/skillMdTemplate.ts](src/modules/skills/templates/skillMdTemplate.ts) 生成 SKILL.md 模板
3. [src/modules/skills/core/agentMdManager.ts](src/modules/skills/core/agentMdManager.ts) 生成 SKILLS.md 并更新 AGENTS.md
4. 技能数据存储在 Git Share 目录（可同步）

### Commands Manager 逻辑
1. [src/modules/commands/core/commandConfigManager.ts](src/modules/commands/core/commandConfigManager.ts) 负责配置与命令扫描
2. [src/modules/commands/templates/commandMdTemplate.ts](src/modules/commands/templates/commandMdTemplate.ts) 生成命令 MD 模板
3. 命令采用扁平结构，文件名必须与 frontmatter 的 `command` 字段一致
4. 命令数据存储在 Git Share 目录（可同步）

### Git Share 逻辑
1. `GitManager` 负责初始化、拉取、提交、推送与冲突处理
2. `DiffViewer` 提供 VS Code diff 预览
3. 模块注册完成后会执行启动阶段远端接收（`forceReceiveRemote`），并在扩展停用时执行关闭阶段推送恢复（`forcePushWithRecovery`）

### Model Proxy 逻辑
1. `ProxyConfigManager` 管理 `modelproxy/config.json` 与日志目录
2. `ProxyServer` 启动本地 HTTP 服务器并分发 OpenAI/Anthropic 路由
3. `ModelBridge` 对接 `vscode.lm` 模型并处理请求/响应格式转换
4. `AuthManager` 负责 API Key 生成、提取与校验
5. `LogManager` 写入 JSONL 请求日志并输出统计

### OpenCode Copilot Auth 逻辑
1. `ConfigManager` 管理 OpenCode Copilot 凭证配置与索引
2. `AuthSwitcher` 负责凭证切换、清理与写入
3. MainView 通过 Bridge 展示凭证列表与操作入口

### MainView 逻辑
1. `AmpifyViewProvider` 统一渲染 7 个 section
2. Bridge 层将模块数据适配为 `TreeNode[]`
3. [src/modules/mainView/protocol.ts](src/modules/mainView/protocol.ts) 定义 Webview ↔ Extension 消息协议

## 数据存储结构
默认根目录为 `~/.vscode-ampify/`（可通过 `ampify.rootDir` 修改）：

```
~/.vscode-ampify/
├── vscodemultilauncher/
│   ├── config.json
│   ├── userdata/
│   └── shareExtensions/
├── gitshare/
│   ├── .git/
│   ├── .gitignore
│   ├── config.json
│   ├── vscodeskillsmanager/
│   │   ├── config.json
│   │   └── skills/{skill-name}/SKILL.md
│   └── vscodecmdmanager/
│       ├── config.json
│       └── commands/{command-name}.md
└── modelproxy/
    ├── config.json
    └── logs/
        ├── 2026-02-06.jsonl
        └── ...
```

## 命令与快捷键
- 复制相对路径与行号：`ampify.copy-relative-path-line`（`Ctrl+Alt+C`）
- 复制绝对路径与行号：`ampify.copy-absolute-path-line`（`Ctrl+Alt+V`）
- MainView 刷新：`ampify.mainView.refresh`

- Launcher：`ampify.launcher.add`、`ampify.launcher.refresh`、`ampify.launcher.editConfig`、`ampify.launcher.launch`、`ampify.launcher.delete`
- Skills：`ampify.skills.refresh`、`ampify.skills.search`、`ampify.skills.filterByTag`、`ampify.skills.clearFilter`、`ampify.skills.create`、`ampify.skills.import`、`ampify.skills.importFromUris`、`ampify.skills.apply`、`ampify.skills.preview`、`ampify.skills.openFile`、`ampify.skills.openFolder`、`ampify.skills.delete`、`ampify.skills.remove`、`ampify.skills.syncToAgentMd`
- Commands：`ampify.commands.refresh`、`ampify.commands.search`、`ampify.commands.filterByTag`、`ampify.commands.clearFilter`、`ampify.commands.create`、`ampify.commands.import`、`ampify.commands.apply`、`ampify.commands.preview`、`ampify.commands.open`、`ampify.commands.openFolder`、`ampify.commands.delete`、`ampify.commands.remove`
- Git Share：`ampify.gitShare.refresh`、`ampify.gitShare.sync`、`ampify.gitShare.pull`、`ampify.gitShare.push`、`ampify.gitShare.commit`、`ampify.gitShare.showDiff`、`ampify.gitShare.editConfig`、`ampify.gitShare.openConfigWizard`、`ampify.gitShare.openFolder`
- Model Proxy：`ampify.modelProxy.toggle`、`ampify.modelProxy.start`、`ampify.modelProxy.stop`、`ampify.modelProxy.copyKey`、`ampify.modelProxy.regenerateKey`、`ampify.modelProxy.copyBaseUrl`、`ampify.modelProxy.selectModel`、`ampify.modelProxy.viewLogs`、`ampify.modelProxy.refresh`
- OpenCode Copilot Auth：`ampify.opencodeAuth.add`、`ampify.opencodeAuth.import`、`ampify.opencodeAuth.switch`、`ampify.opencodeAuth.delete`、`ampify.opencodeAuth.rename`、`ampify.opencodeAuth.switchNext`、`ampify.opencodeAuth.clear`

复制命令已注册到编辑器右键菜单，模块命令在 MainView 内提供入口。

## 配置项
配置定义在 [package.json](package.json)：
- `ampify.language`：语言（en/zh-cn）
- `ampify.rootDir`：数据根目录
- `ampify.skills.injectTarget`：Skills 注入目录
- `ampify.commands.injectTarget`：Commands 注入目录
- `ampify.modelProxy.port`：Model Proxy HTTP 端口
- `ampify.modelProxy.bindAddress`：Model Proxy 绑定地址
- `ampify.modelProxy.defaultModel`：默认模型 ID

## 开发与构建
脚本定义在 [package.json](package.json)：
- `npm run compile`：编译 TypeScript
- `npm run watch`：监视模式编译
- `npm run lint`：运行 ESLint

调试入口使用 [.vscode/launch.json](.vscode/launch.json) 中的“调试扩展”，并在启动前执行构建任务。

## 编码规范
ESLint 规则在 [eslint.config.js](eslint.config.js) 中定义，TypeScript 严格模式开启（见 [tsconfig.json](tsconfig.json)）。

## CI/CD
项目包含 GitHub Actions 工作流（位于 [.github/](.github/)），用于在打标签发布时构建并发布 VSIX 包。

## 注意事项
- 未保存的文档会提示“无法获取文件路径”。
- 输出结果始终包裹反引号，适用于 Markdown 引用。
- 单行输出：`path:line`，多行输出：`path:start-end`。
- 启动器实例以独立用户目录运行，可共享扩展目录以复用已安装扩展。
- Model Proxy 默认绑定 `127.0.0.1`，外部访问需显式配置 `0.0.0.0`。

# AMPIFY
<ampify>
  <instruction>必须在此处查看可用的 SKILLS 列表</instruction>
  <include path=".agents/SKILLS.md" />
</ampify>
