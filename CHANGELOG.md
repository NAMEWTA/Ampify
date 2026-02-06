# Change Log

## 2.0.0 - 2026-02-06
### Added
- Model Proxy module: local HTTP reverse proxy exposing OpenAI and Anthropic compatible routes via vscode.lm
- Model Proxy section in MainView with stats, model selection, and recent logs
- Model Proxy commands and settings (port, bind address, default model)

### Changed
- Ampify is now an all-in-one workspace toolbox: launcher, skills, commands, git sync, and model proxy in a single MainView

## 1.6.1 - 2026-02-06
### Changed
- Enhanced MainView with improved CSS and JS templates for better UI/UX
- Improved skill and command module integration and refactored structure
- Enhanced npm-git-commit-push command for fully automated version releases
- Simplified SKILLS.md structure for better maintainability

## 1.6.0 - 2026-02-06
### Added
- 统一主视图架构并新增功能入口。
- 设置面板新增存储根目录的“Apply & Reload”操作。

### Changed
- Skills/Commands 配置与数据统一存放到 Git Share 目录。
- 添加 npm-git-commit-push 命令文档。

## 1.5.0 - 2026-02-04
### Added
- 新增 Git Sync（Git Share）模块，用于 Skills/Commands 的统一同步入口。
- 提供 Git 配置向导、状态展示与差异预览能力。

### Changed
- Skills/Commands 统一使用共享 Git 仓库与 Diff 查看器。
- Skills 元数据移除 version 字段与相关校验逻辑，简化 SKILL.md 处理流程。
- 移除 Skills 视图中的 Git 同步/变更功能入口，统一迁移到 Git Sync。

## 1.4.0 - 2026-02-04
### Added
- 侧边栏新增 Tab Bar（分段按钮）用于切换 Launcher/Skills/Commands。
- Command 管理入口与说明更新。

### Changed
- Activity Bar 合并为单一 Ampify 入口。
- 默认打开 Launcher 视图。

## 1.3.5 - 2026-02-03
### Added
- 递归扫描注入目录并生成层级化 SKILLS.md 索引清单。
- AGENTS.md 支持 <skillsmanager> 的 <include> 引用与指令提示。

### Changed
- Skills 加载与索引支持跳过无 SKILL.md 的中间层。

## 1.3.4 - 2026-02-02
### Added
- Skills Git 同步能力说明：Sync（拉取 → 自动提交 → 推送）与多远程支持。
- Skills 变更查看（Show Changes）说明：支持本地/远程差异预览。
- Skills Git 设置与状态说明：用户/邮箱/远程与状态展示。
- Skills 自动同步说明：支持配置同步间隔。

## 1.3.1 - 2026-02-02
### Changed
- 提取基础配置管理逻辑到 `BaseConfigManager` 基类，简化各模块配置管理实现。
- 将目录复制功能移至 `paths` 工具模块，统一文件操作工具函数。
- 更新全局目录路径为 `~/.vscode-ampify`，改善跨平台路径管理。
- 精简 `SkillConfigManager` 与 `SkillApplier` 中的冗余代码。

### Fixed
- 修正文档中的路径引用，确保与新目录结构保持一致。

## 1.3.0 - 2026-02-02
### Added
- Skills Manager 使用 SKILL.md frontmatter 作为元数据来源。
- SKILL.md 解析与校验（含标签、依赖、allowed-tools 兼容）。

### Changed
- Skills 元数据从 skill.json 迁移到 SKILL.md。
- 优化 Skills 文件处理流程与导入校验。
- 精简 SkillConfigManager 与 SkillApplier 中的冗余逻辑。

## 1.2.0 - 2026-01-30
### Added
- 启动新实例时，自动打开当前工作区的第一个目录。

### Changed
- 更新扩展描述为英文（含中文括注）。

## 1.1.0 - 2026-01-29
### Added
- 多实例启动器（Activity Bar 视图）。
- 实例管理命令：Add / Refresh / Edit Config / Launch / Delete。
- 启动器配置与实例目录管理（`ConfigManager`）。
- 启动器进程引擎（`ProcessEngine`）。
- 语言配置项：`ampify.language`。

### Changed
- 扩展改为 `onStartupFinished` 激活以保证启动器视图可用。
- 模块化目录结构（`modules/launcher`、`modules/copier`、`common`）。

### Fixed
- Windows 下 VS Code 可执行路径解析与启动失败问题。

## 1.0.0 - 2026-01-18
### Added
- 初始发布：提供复制相对路径/绝对路径与行号功能。
- 命令：Copy Relative Path & Line、Copy Absolute Path & Line。
- 快捷键：Windows/macOS `Ctrl+Alt+C`/`Ctrl+Alt+V`。
