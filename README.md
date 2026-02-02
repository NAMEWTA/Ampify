# Ampify

Ampify is a **multi-functional, practical VS Code extension** that helps you work faster. It combines **file path + line number** copying with a **multi-instance launcher**, and will continue to evolve with more useful features.

## Features

- Copy **relative path** + selected line number
- Copy **absolute path** + selected line number
- Multi-instance launcher with an Activity Bar view
- Skills Manager with a global Skills library (SKILL.md metadata)
- Search, tag filter, preview, and apply Skills to a project
- Practical workflows with ongoing improvements

## Usage

### Copy Path & Line

- Copy **relative path** + selected line number: `ctrl + alt + c` (Windows/macOS)
- Copy **absolute path** + selected line number: `ctrl + alt + v` (Windows/macOS)

### Multi-Instance Launcher

- Open **Multi Launcher** from the Activity Bar
- Use the view toolbar to **Add**, **Refresh**, or **Edit Config**
- Use item actions to **Launch** or **Delete** instances

### Skills Manager

- Open **Skills Manager** from the Activity Bar
- Use the view toolbar to **Search**, **Filter by Tag**, **Pull/Push**, or **Refresh**
- Create or import Skills (must include **SKILL.md** frontmatter)
- Apply Skills to the current workspace (default target: **.claude/skills/**)

> Global Skills location: `~/.vscode-ampify/vscodeskillsmanager/skills`
> Inject target can be customized via `ampify.skills.injectTarget`

---

# Ampify（多功能实用扩展）

Ampify 是一个**多功能实用型 VS Code 扩展**，整合了**文件路径 + 行号复制**与**多实例启动器**，并将持续迭代增加实用能力。

## 功能

- 复制**相对路径** + 选中行号
- 复制**绝对路径** + 选中行号
- Activity Bar 多实例启动器视图
- Skills Manager 全局 Skills 库（SKILL.md 元数据）
- Skills 搜索、标签过滤、预览与注入项目
- 实用工作流与持续优化

## 使用方法

### 复制路径与行号

- 复制**相对路径** + 选中行号：`ctrl + alt + c`（Windows/macOS）
- 复制**绝对路径** + 选中行号：`ctrl + alt + v`（Windows/macOS）

### 多实例启动器

- 从 Activity Bar 打开 **Multi Launcher**
- 使用视图工具栏 **Add / Refresh / Edit Config**
- 对条目执行 **Launch / Delete**

### Skills Manager

- 从 Activity Bar 打开 **Skills Manager**
- 使用视图工具栏 **Search / Filter by Tag / Pull / Push / Refresh**
- 创建或导入 Skills（必须包含 **SKILL.md** frontmatter）
- 将 Skills 注入当前项目（默认目标：**.claude/skills/**）

> 全局 Skills 目录：`~/.vscode-ampify/vscodeskillsmanager/skills`
> 注入目标可通过 `ampify.skills.injectTarget` 自定义