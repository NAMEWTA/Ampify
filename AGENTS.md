# AGENTS.md

## 项目概述
Ampify 是一个 VS Code 扩展，核心能力包括：
1. 快速复制“文件路径 + 行号”，便于报告与代码评审引用。
2. 多账户启动器，用于管理与启动不同的用户配置。
3. Skills Manager：全局 Skills 库管理、`SKILL.md` 元数据解析、复制到项目 `.claude/skills/`。
4. Commands Manager：全局 Commands 库管理、单文件命令管理、复制到项目 `.claude/commands/`。
5. Git Share：Skills/Commands 共享仓库同步与差异预览。
6. OpenCode Copilot Auth：多凭证管理与快速切换。
7. MainView：基于 Vue 3 的统一 Webview 主视图，集中呈现各模块数据与操作。

扩展在启动完成后激活（`onStartupFinished`），统一注册各模块命令，并在 Activity Bar 提供主入口视图。

- 入口文件：[src/extension.ts](src/extension.ts)
- 扩展清单：[package.json](package.json)
- 变更记录：[CHANGELOG.md](CHANGELOG.md)

## 项目结构
- [src/](src/)：扩展宿主端源码
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
      - [src/modules/skills/core/](src/modules/skills/core/)：配置、导入、复制注入、创建、AI 标签
        - [src/modules/skills/core/skillAiTagger.ts](src/modules/skills/core/skillAiTagger.ts)：技能 AI 标签器
      - [src/modules/skills/templates/](src/modules/skills/templates/)：`SKILL.md` 模板
    - [src/modules/commands/](src/modules/commands/)：Commands Manager
      - [src/modules/commands/core/](src/modules/commands/core/)：配置、导入、应用、创建、AI 标签
        - [src/modules/commands/core/commandAiTagger.ts](src/modules/commands/core/commandAiTagger.ts)：命令 AI 标签器
      - [src/modules/commands/templates/](src/modules/commands/templates/)：Command MD 模板
    - [src/modules/gitShare/](src/modules/gitShare/)：Git Share
    - [src/modules/opencode-copilot-auth/](src/modules/opencode-copilot-auth/)：OpenCode Copilot Auth
      - [src/modules/opencode-copilot-auth/core/](src/modules/opencode-copilot-auth/core/)：凭证配置与切换
    - [src/modules/mainView/](src/modules/mainView/)：统一主视图宿主逻辑
      - [src/modules/mainView/AmpifyViewProvider.ts](src/modules/mainView/AmpifyViewProvider.ts)：WebviewViewProvider 薄入口
      - [src/modules/mainView/controller/](src/modules/mainView/controller/)：MainView 控制层
        - [src/modules/mainView/controller/MainViewController.ts](src/modules/mainView/controller/MainViewController.ts)：宿主端主控制器
        - [src/modules/mainView/controller/MessageRouter.ts](src/modules/mainView/controller/MessageRouter.ts)：消息路由
        - [src/modules/mainView/controller/SectionHandlerRegistry.ts](src/modules/mainView/controller/SectionHandlerRegistry.ts)：Section 处理器注册表
      - [src/modules/mainView/bridges/](src/modules/mainView/bridges/)：各模块数据桥接
      - [src/modules/mainView/shared/contracts.ts](src/modules/mainView/shared/contracts.ts)：宿主端与 Webview 共用契约
      - [src/modules/mainView/templates/htmlTemplate.ts](src/modules/mainView/templates/htmlTemplate.ts)：注入 Webview 构建产物的 HTML 模板
- [webview/](webview/)：MainView 前端子应用源码
  - [webview/src/main.ts](webview/src/main.ts)：Vue 应用入口
  - [webview/src/App.vue](webview/src/App.vue)：应用根组件
  - [webview/src/router.ts](webview/src/router.ts)：内存路由
  - [webview/src/components/](webview/src/components/)：共享组件
  - [webview/src/sections/](webview/src/sections/)：各 section 页面
  - [webview/src/stores/](webview/src/stores/)：Pinia 状态层
  - [webview/src/composables/](webview/src/composables/)：VS Code 消息桥与动作封装
  - [webview/src/services/vscode.ts](webview/src/services/vscode.ts)：`acquireVsCodeApi()` 封装
  - [webview/vite.config.ts](webview/vite.config.ts)：Vite 构建配置
  - [webview/tsconfig.json](webview/tsconfig.json)：Webview 独立 TS 配置
- [webview-dist/](webview-dist/)：构建产物输出目录
  - `mainView/main.js`
  - `mainView/main.css`
- [package.json](package.json)：扩展清单、命令、快捷键、脚本与依赖
- [tsconfig.json](tsconfig.json)：扩展宿主端 TypeScript 编译配置
- [eslint.config.js](eslint.config.js)：扩展端 + Vue Webview ESLint 规则
- [README.md](README.md)：使用说明
- [CHANGELOG.md](CHANGELOG.md)：版本变更
- [.vscode/](.vscode/)：本地调试配置
  - [.vscode/launch.json](.vscode/launch.json)：调试配置
  - [.vscode/tasks.json](.vscode/tasks.json)：构建任务
- [.vscodeignore](.vscodeignore)：VSIX 打包忽略规则
- [.github/workflows/release-vsix.yml](.github/workflows/release-vsix.yml)：打包与发布流程
- [LICENSE](LICENSE)：许可证
- [icon.png](icon.png)：扩展图标

## 技术栈
- VS Code Extension API
- TypeScript 5.6
- Vue 3
- Vite 6
- Pinia 3
- Vue Router 4（`createMemoryHistory`）
- Element Plus 2
- ESLint 9（Flat Config）
- Node.js 类型：`@types/node` 24
- 依赖：`simple-git`、`yaml`、`@vscode/codicons`

## 入口与核心逻辑
入口函数 `activate()` 在启动完成后触发，按顺序注册：MainView → Copier → Launcher → GitShare → Skills → Commands → OpenCode Copilot Auth。

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
3. MainView 通过 Bridge / Account Center 展示实例列表

### Skills Manager 逻辑
1. [src/modules/skills/core/skillConfigManager.ts](src/modules/skills/core/skillConfigManager.ts) 负责配置与技能扫描
2. [src/modules/skills/core/skillApplier.ts](src/modules/skills/core/skillApplier.ts) 将技能目录直接复制到工作区 `.claude/skills/`
3. [src/modules/skills/templates/skillMdTemplate.ts](src/modules/skills/templates/skillMdTemplate.ts) 生成 `SKILL.md` 模板
4. 旧 `.agents/...` 注入目标会自动归一化为 `.claude/...`
5. 技能数据存储在 Git Share 目录（可同步）

### Commands Manager 逻辑
1. [src/modules/commands/core/commandConfigManager.ts](src/modules/commands/core/commandConfigManager.ts) 负责配置与命令扫描
2. [src/modules/commands/core/commandApplier.ts](src/modules/commands/core/commandApplier.ts) 将命令文件直接复制到工作区 `.claude/commands/`
3. [src/modules/commands/templates/commandMdTemplate.ts](src/modules/commands/templates/commandMdTemplate.ts) 生成命令 MD 模板
4. 命令采用扁平结构，文件名必须与 frontmatter 的 `command` 字段一致
5. 旧 `.agents/...` 注入目标会自动归一化为 `.claude/...`
6. 命令数据存储在 Git Share 目录（可同步）

### Git Share 逻辑
1. `GitManager` 负责初始化、拉取、提交、推送与冲突处理
2. `DiffViewer` 提供 VS Code diff 预览
3. 模块注册完成后会执行启动阶段远端接收（`forceReceiveRemote`），并在扩展停用时执行关闭阶段推送恢复（`forcePushWithRecovery`）

### OpenCode Copilot Auth 逻辑
1. `ConfigManager` 管理 OpenCode Copilot 凭证配置与索引
2. `AuthSwitcher` 负责凭证切换、清理与写入
3. MainView / Account Center 展示凭证、oh-my-opencode 快照与会话数据

### MainView 逻辑
MainView 现已拆分为“扩展宿主控制层 + Vue 3 Webview 前端”两部分：

1. [src/modules/mainView/AmpifyViewProvider.ts](src/modules/mainView/AmpifyViewProvider.ts) 只负责注册 Webview，并委托给 `MainViewController`
2. [src/modules/mainView/controller/MainViewController.ts](src/modules/mainView/controller/MainViewController.ts) 负责：
   - 维护当前可见 section
   - 分发 Webview 消息
   - 处理 overlay / confirm / progress
   - 调用 Bridge 与 VS Code 命令
3. [src/modules/mainView/controller/MessageRouter.ts](src/modules/mainView/controller/MessageRouter.ts) 负责将 Webview 消息映射到控制器动作
4. [src/modules/mainView/controller/SectionHandlerRegistry.ts](src/modules/mainView/controller/SectionHandlerRegistry.ts) 负责按 section 路由行为
5. [src/modules/mainView/shared/contracts.ts](src/modules/mainView/shared/contracts.ts) 定义宿主端与 Webview 共用的类型与消息契约
6. [webview/](webview/) 是独立 Vue 子应用，负责：
   - 品牌化侧边导航与页面壳层
   - Dashboard / Account Center / Skills / Commands / Git Share / Settings 页面
   - Overlay / Confirm / Progress 等共享组件
   - 通过 `acquireVsCodeApi()` 与宿主端通信

#### MainView 消息模型
- Webview → Extension：
  - `appReady`
  - `navigate`
  - `sectionAction`
  - `overlaySubmit`
  - `overlayCancel`
  - `confirmResult`
  - `settingChange`
- Extension → Webview：
  - `bootstrap`
  - `sectionData`
  - `overlayState`
  - `confirmState`
  - `progressState`
  - `notification`
  - `appState`

#### MainView 前端可见 section
- `dashboard`
- `accountCenter`
- `skills`
- `commands`
- `gitshare`
- `settings`

说明：
- `launcher` 与 `opencodeAuth` 仍是内部 `SectionId`，用于宿主端动作路由与快捷跳转，但在新导航中归并到 `accountCenter`。

## 数据存储结构
默认根目录为 `~/.vscode-ampify/`（可通过 `ampify.rootDir` 修改）：

```text
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
```

## 命令与快捷键
- 复制相对路径与行号：`ampify.copy-relative-path-line`（`Ctrl+Alt+C`）
- 复制绝对路径与行号：`ampify.copy-absolute-path-line`（`Ctrl+Alt+V`）
- MainView 刷新：`ampify.mainView.refresh`

- Launcher：`ampify.launcher.add`、`ampify.launcher.refresh`、`ampify.launcher.editConfig`、`ampify.launcher.launch`、`ampify.launcher.delete`
- Skills：`ampify.skills.refresh`、`ampify.skills.search`、`ampify.skills.filterByTag`、`ampify.skills.clearFilter`、`ampify.skills.create`、`ampify.skills.import`、`ampify.skills.importFromUris`、`ampify.skills.apply`、`ampify.skills.preview`、`ampify.skills.openFile`、`ampify.skills.openFolder`、`ampify.skills.delete`、`ampify.skills.remove`
- Commands：`ampify.commands.refresh`、`ampify.commands.search`、`ampify.commands.filterByTag`、`ampify.commands.clearFilter`、`ampify.commands.create`、`ampify.commands.import`、`ampify.commands.apply`、`ampify.commands.preview`、`ampify.commands.open`、`ampify.commands.openFolder`、`ampify.commands.delete`、`ampify.commands.remove`
- Git Share：`ampify.gitShare.refresh`、`ampify.gitShare.sync`、`ampify.gitShare.pull`、`ampify.gitShare.push`、`ampify.gitShare.commit`、`ampify.gitShare.showDiff`、`ampify.gitShare.editConfig`、`ampify.gitShare.openConfigWizard`、`ampify.gitShare.openFolder`
- OpenCode Copilot Auth：`ampify.opencodeAuth.add`、`ampify.opencodeAuth.import`、`ampify.opencodeAuth.switch`、`ampify.opencodeAuth.delete`、`ampify.opencodeAuth.rename`、`ampify.opencodeAuth.switchNext`、`ampify.opencodeAuth.clear`

复制命令已注册到编辑器右键菜单，模块命令在 MainView 与 Account Center 内提供入口。

## 配置项
配置定义在 [package.json](package.json)：
- `ampify.language`：语言（`en` / `zh-cn`）
- `ampify.rootDir`：数据根目录
- `ampify.skills.injectTarget`：Skills 注入目录
- `ampify.commands.injectTarget`：Commands 注入目录

## 开发与构建
脚本定义在 [package.json](package.json)：
- `npm run compile`：先编译扩展宿主端，再构建 Webview 前端
- `npm run compile:extension`：仅编译扩展宿主端 TypeScript
- `npm run build:webview`：执行 `vue-tsc` 检查并构建 Vite Webview 产物
- `npm run typecheck:webview`：仅执行 Webview 类型检查
- `npm run watch`：并行监听宿主端与 Webview 构建
- `npm run lint`：同时检查宿主端 TS 与 Webview Vue/TS

调试入口使用 [.vscode/launch.json](.vscode/launch.json) 中的“调试扩展”，并在启动前执行构建任务。

## 编码规范
- ESLint 规则在 [eslint.config.js](eslint.config.js) 中定义
- 扩展宿主端与 Webview 前端共享 Flat Config
- 扩展端 TypeScript 严格模式开启（见 [tsconfig.json](tsconfig.json)）
- Webview 前端使用独立 [webview/tsconfig.json](webview/tsconfig.json)
- MainView 相关共享类型统一维护在 [src/modules/mainView/shared/contracts.ts](src/modules/mainView/shared/contracts.ts)

## CI/CD
项目包含 GitHub Actions 工作流（位于 [.github/workflows/release-vsix.yml](.github/workflows/release-vsix.yml)），在打标签发布时会：
1. 校验 tag 与 `package.json` 版本一致
2. 安装依赖
3. 执行 `npm run compile`
4. 生成并发布 VSIX

## 注意事项
- 未保存的文档会提示“无法获取文件路径”
- 输出结果始终包裹反引号，适用于 Markdown 引用
- 单行输出：`path:line`，多行输出：`path:start-end`
- 启动器实例以独立用户目录运行，可共享扩展目录以复用已安装扩展
- MainView 的发布资源来自 `webview-dist/mainView/`，不要手工修改该目录内容，应通过 `npm run build:webview` 生成
- Webview 前端源码位于 `webview/`，宿主端逻辑位于 `src/modules/mainView/`

# AMPIFY
<ampify>
  <instruction>必须在此处查看可用的 SKILLS 列表</instruction>
  <instruction>当前实现已直接复制 Skills/Commands 到 `.claude/`，不再维护 `.agents/SKILLS.md` 索引。</instruction>
</ampify>
