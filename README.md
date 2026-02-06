# Ampify

Ampify is a practical, all-in-one VS Code extension that helps you move faster. It unifies **path + line copying**, a **multi-account launcher**, **Skills/Commands management**, **Git Share sync**, and a **Model Proxy** in one MainView.

## Features

- Copy relative or absolute file paths with line ranges
- Multi-account launcher with isolated user data per instance
- Skills Manager with SKILL.md metadata, search, tag filter, preview, and inject
- Commands Manager with single-file command definitions and project injection
- Git Share sync and diff preview for skills and commands repositories
- Model Proxy: local HTTP reverse proxy (OpenAI + Anthropic compatible) with API key, model routing, and logs
- Unified MainView with sections for all modules

## Screenshots

![MainView Dashboard](docs/images/dashboard.png)
MainView overview with all modules in one place.
![Skills Manager](docs/images/skills.png)
Skills library with search, tags, preview, and inject.
![Commands Manager](docs/images/commands.png)
Commands library with create, preview, and apply.
![Git Sync](docs/images/gitsync.png)
Git Share sync and diff preview for skills/commands.
![Model Proxy](docs/images/modelProxy.png)
Local proxy with models, stats, and recent logs.
![Settings](docs/images/settings.png)
Settings panel with root directory and language.

## Usage

### Copy Path & Line

- Copy relative path + line: `Ctrl+Alt+C` (Windows/macOS)
- Copy absolute path + line: `Ctrl+Alt+V` (Windows/macOS)

### Multi-Account Launcher

- Open **Ampify** in the Activity Bar and switch to **Launcher**
- Add or edit instances, then launch with a dedicated user data directory

### Skills Manager

- Switch to **Skills** in MainView
- Create or import Skills (must include **SKILL.md** frontmatter)
- Search, filter by tag, preview, and apply skills to a workspace
- Auto-generate a hierarchical **SKILLS.md** index and reference it from **AGENTS.md**

### Commands Manager

- Switch to **Commands** in MainView
- Create or import commands, then preview and apply to the project
- Inject target can be customized via `ampify.commands.injectTarget`

### Git Share

- Switch to **Git Sync** in MainView
- Sync, show changes, and manage the shared repository for skills/commands

### Model Proxy

- Switch to **Model Proxy** in MainView and start/stop the server
- Copy the **Base URL** and **API Key** from the panel
- Select a default model and monitor recent logs
- Optional: set `ampify.modelProxy.bindAddress` to `0.0.0.0` for external access

### Settings

- Update root directory or language in **Settings**, then click **Apply & Reload**

> Global data root defaults to `~/.vscode-ampify/` and can be changed via `ampify.rootDir`.

---

# Ampify（多功能实用扩展）

Ampify 是一个实用型 VS Code 扩展，将**路径行号复制**、**多账户启动器**、**技能与命令管理**、**Git Share 同步**与**模型反代**统一在一个 MainView 中。

## 功能

- 复制相对/绝对路径与行号范围
- 多账户启动器（独立用户数据目录）
- Skills Manager：SKILL.md 元数据、搜索、标签过滤、预览与注入
- Commands Manager：单文件命令管理与项目注入
- Git Share：统一同步与差异预览
- Model Proxy：本地 HTTP 反代（兼容 OpenAI/Anthropic），支持 API Key、模型路由与日志
- MainView 统一入口

## 截图

![MainView 总览](docs/images/dashboard.png)
MainView 总览：统一入口与模块导航。
![Skills 管理](docs/images/skills.png)
Skills 管理：搜索、标签过滤、预览与注入。
![Commands 管理](docs/images/commands.png)
Commands 管理：创建、预览与应用到项目。
![Git Sync](docs/images/gitsync.png)
Git Sync：共享仓库同步与差异预览。
![Model Proxy](docs/images/modelProxy.png)
Model Proxy：本地反代、模型选择与日志。
![Settings](docs/images/settings.png)
Settings：根目录与语言配置。

## 使用方法

### 复制路径与行号

- 复制相对路径 + 行号：`Ctrl+Alt+C`（Windows/macOS）
- 复制绝对路径 + 行号：`Ctrl+Alt+V`（Windows/macOS）

### 多账户启动器

- 在 Activity Bar 打开 **Ampify** 并切换到 **Launcher**
- 新增或编辑实例，并以独立用户目录启动

### Skills Manager

- 切换到 **Skills**
- 创建/导入 Skills（必须包含 **SKILL.md** frontmatter）
- 搜索、标签过滤、预览并注入项目
- 自动生成层级化 **SKILLS.md** 清单，并在 **AGENTS.md** 中引用

### Commands Manager

- 切换到 **Commands**
- 创建/导入命令并预览与注入
- 注入目标可通过 `ampify.commands.injectTarget` 自定义

### Git Share

- 切换到 **Git Sync**
- 执行同步、查看差异并管理共享仓库

### Model Proxy

- 切换到 **Model Proxy** 并启动/停止代理
- 复制 **Base URL** 与 **API Key**
- 选择默认模型并查看最近日志
- 如需外网访问，可将 `ampify.modelProxy.bindAddress` 设为 `0.0.0.0`

### Settings

- 在 **Settings** 中修改根目录或语言并点击 **Apply & Reload**

> 全局数据根目录默认 `~/.vscode-ampify/`，可通过 `ampify.rootDir` 修改。