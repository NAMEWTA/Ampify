# Ampify

Ampify is a **multi-functional, practical VS Code extension** that helps you work faster. It combines **file path + line number** copying with a **multi-instance launcher**, and will continue to evolve with more useful features.

## Features

- Copy **relative path** + selected line number
- Copy **absolute path** + selected line number
- Unified Activity Bar entry with a segmented Tab Bar (Launcher/Skills/Commands)
- Skills Manager with a global Skills library (SKILL.md metadata)
- Search, tag filter, preview, and apply Skills to a project
- Sync Skills with Git, view changes, and manage Git settings/status
- Auto-sync interval and multi-remote Git support
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
- Use the view toolbar to **Search**, **Filter by Tag**, **Sync**, **Show Changes**, or **Refresh**
- Create or import Skills (must include **SKILL.md** frontmatter)
- Apply Skills to the current workspace (default target: **.claude/skills/**)
- Auto-generate a hierarchical **SKILLS.md** index and reference it from **AGENTS.md**
- Configure Git settings and see Git status in the Skills tree
- Auto-sync Skills by interval and manage multiple Git remotes

### Commands Manager

- Open **Ampify** from the Activity Bar and switch to the **Commands** tab
- Use the view toolbar to **Search**, **Filter by Tag**, **Refresh**, **Create**, or **Import**
- Preview, apply, remove, or delete commands
- Inject target can be customized via `ampify.commands.injectTarget`

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
- Skills Manager 全局 Skills 库（SKILL.md 元数据）
- Skills 搜索、标签过滤、预览与注入项目
- Skills Git 同步、查看变更、管理 Git 设置/状态
- 自动同步间隔与多远程 Git 支持
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
- 使用视图工具栏 **Search / Filter by Tag / Sync / Show Changes / Refresh**
- 创建或导入 Skills（必须包含 **SKILL.md** frontmatter）
- 将 Skills 注入当前项目（默认目标：**.claude/skills/**）
- 自动生成层级化 **SKILLS.md** 清单，并在 **AGENTS.md** 中通过 `<skillsmanager><include>` 引用
- 在 Skills 树中配置 Git 设置并查看 Git 状态
- 支持按间隔自动同步与多远程 Git 管理

### Commands Manager

- 从 Activity Bar 打开 **Ampify**，切换到 **Commands** 标签
- 使用视图工具栏 **Search / Filter by Tag / Refresh / Create / Import**
- 预览、注入、移除或删除命令
- 注入目标可通过 `ampify.commands.injectTarget` 自定义

> 全局 Skills 目录：`~/.vscode-ampify/vscodeskillsmanager/skills`
> 注入目标可通过 `ampify.skills.injectTarget` 自定义
> 将在注入目标父目录生成层级化 Skills 清单（如 `.claude/SKILLS.md`），并通过 `<skillsmanager><include>` 引用到 AGENTS.md