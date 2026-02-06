# Ampify

Ampify is a **multi-functional, practical VS Code extension** that helps you work faster. It combines **file path + line number** copying with a **multi-instance launcher**, and will continue to evolve with more useful features.

## Features

- Copy **relative path** + selected line number
- Copy **absolute path** + selected line number
- Unified Activity Bar entry with a segmented Tab Bar (Launcher/Skills/Commands/Git Sync)
- Settings panel with **Apply & Reload** for storage root changes
- Skills Manager with a global Skills library (SKILL.md metadata)
- Search, tag filter, preview, and apply Skills to a project
- Git Sync module for unified repository sync and diff preview
- Practical workflows with ongoing improvements

## Usage

### Copy Path & Line

- Copy **relative path** + selected line number: `ctrl + alt + c` (Windows/macOS)
- Copy **absolute path** + selected line number: `ctrl + alt + v` (Windows/macOS)

### Multi-Instance Launcher

- Open **Ampify** from the Activity Bar and switch to the **Launcher** tab
- Use the view toolbar to **Add**, **Refresh**, or **Edit Config**
- Use item actions to **Launch** or **Delete** instances

### Skills Manager

- Open **Ampify** from the Activity Bar and switch to the **Skills** tab
- Use the view toolbar to **Search**, **Filter by Tag**, or **Refresh**
- Create or import Skills (must include **SKILL.md** frontmatter)
- Apply Skills to the current workspace (default target: **.claude/skills/**)
- Auto-generate a hierarchical **SKILLS.md** index and reference it from **AGENTS.md**

### Git Sync

- Open **Ampify** from the Activity Bar and switch to the **Git Sync** tab
- Use the view toolbar to **Sync**, **Show Changes**, **Configure Git**, or **Refresh**
- Unified repository sync and diff preview for Skills/Commands

### Commands Manager

- Open **Ampify** from the Activity Bar and switch to the **Commands** tab
- Use the view toolbar to **Search**, **Filter by Tag**, **Refresh**, **Create**, or **Import**
- Preview, apply, remove, or delete commands
- Inject target can be customized via `ampify.commands.injectTarget`

### Settings

- Open **Ampify** from the Activity Bar and use the **Settings** panel
- Update storage root or language, then click **Apply & Reload**

> Global Skills location: `~/.vscode-ampify/vscodeskillsmanager/skills`
> Inject target can be customized via `ampify.skills.injectTarget`
> A hierarchical Skills index will be generated at the parent of the inject target (e.g. `.claude/SKILLS.md`) and referenced via `<skillsmanager><include>` in AGENTS.md

---

# Ampify（多功能实用扩展）

Ampify 是一个**多功能实用型 VS Code 扩展**，整合了**文件路径 + 行号复制**与**多实例启动器**，并将持续迭代增加实用能力。

## 功能

- 复制**相对路径** + 选中行号
- 复制**绝对路径** + 选中行号
- Activity Bar 多实例启动器视图
- 设置面板支持 **应用并重载**（用于存储根目录修改）
- Skills Manager 全局 Skills 库（SKILL.md 元数据）
- Skills 搜索、标签过滤、预览与注入项目
- Git Sync 模块：统一同步与差异预览
- 实用工作流与持续优化

## 使用方法

### 复制路径与行号

- 复制**相对路径** + 选中行号：`ctrl + alt + c`（Windows/macOS）
- 复制**绝对路径** + 选中行号：`ctrl + alt + v`（Windows/macOS）

### 多实例启动器

- 从 Activity Bar 打开 **Ampify**，切换到 **Launcher** 标签
- 使用视图工具栏 **Add / Refresh / Edit Config**
- 对条目执行 **Launch / Delete**

### Skills Manager

- 从 Activity Bar 打开 **Ampify**，切换到 **Skills** 标签
- 使用视图工具栏 **Search / Filter by Tag / Refresh**
- 创建或导入 Skills（必须包含 **SKILL.md** frontmatter）
- 将 Skills 注入当前项目（默认目标：**.claude/skills/**）
- 自动生成层级化 **SKILLS.md** 清单，并在 **AGENTS.md** 中通过 `<skillsmanager><include>` 引用

### Git Sync

- 从 Activity Bar 打开 **Ampify**，切换到 **Git Sync** 标签
- 使用视图工具栏 **Sync / Show Changes / Configure Git / Refresh**
- Skills/Commands 的统一仓库同步与差异预览

### Commands Manager

- 从 Activity Bar 打开 **Ampify**，切换到 **Commands** 标签
- 使用视图工具栏 **Search / Filter by Tag / Refresh / Create / Import**
- 预览、注入、移除或删除命令
- 注入目标可通过 `ampify.commands.injectTarget` 自定义

### Settings

- 从 Activity Bar 打开 **Ampify**，使用 **Settings** 面板
- 修改存储根目录或语言后，点击 **应用并重载**

> 全局 Skills 目录：`~/.vscode-ampify/vscodeskillsmanager/skills`
> 注入目标可通过 `ampify.skills.injectTarget` 自定义
> 将在注入目标父目录生成层级化 Skills 清单（如 `.claude/SKILLS.md`），并通过 `<skillsmanager><include>` 引用到 AGENTS.md