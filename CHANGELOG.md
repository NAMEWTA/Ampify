# Change Log

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
