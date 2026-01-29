# AGENT.md

## 项目概述
Ampify 是一个 VS Code 扩展，包含两大能力：
1. 快速复制“文件路径 + 行号”，以便在报告和代码评审中引用。
2. VS Code 多实例启动器，用于管理与启动不同的用户配置。

扩展在启动完成后激活（`onStartupFinished`），注册复制路径命令与启动器命令，并在 Activity Bar 提供实例视图。

- 入口文件： [src/extension.ts](src/extension.ts)
- 扩展清单： [package.json](package.json)
- 变更记录： [CHANGELOG.md](CHANGELOG.md)

## 项目结构
- [src/](src/)：扩展源代码
  - [src/extension.ts](src/extension.ts)：扩展入口与模块编排
  - [src/common/](src/common/)：公共能力（`i18n`、类型、工具）
  - [src/modules/](src/modules/)：功能模块
    - [src/modules/launcher/](src/modules/launcher/)：多实例启动器
      - [src/modules/launcher/core/](src/modules/launcher/core/)：配置与进程启动
      - [src/modules/launcher/views/](src/modules/launcher/views/)：TreeView 视图
    - [src/modules/copier/](src/modules/copier/)：复制路径与行号
- [package.json](package.json)：扩展清单、命令、快捷键、脚本与依赖
- [tsconfig.json](tsconfig.json)：TypeScript 编译配置
- [.eslintrc.json](.eslintrc.json)：ESLint 规则
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
- TypeScript 5.2
- ESLint 8
- Node.js 类型：@types/node 18

## 入口与核心逻辑
入口函数 `activate()` 在启动完成后触发，统一注册复制路径与启动器相关命令。

复制路径核心逻辑集中在 `buildReference()`：
1. 获取当前编辑器与文档。
2. 判断相对路径/绝对路径输出：相对路径通过 `getRelativePath()` 计算。
3. 计算行号：
   - 单行选择：输出 `line`
   - 多行选择：输出 `start-end`
4. 拼接格式：`path:line` 并包裹反引号。
5. 写入剪贴板并调用 `showMessage()` 状态栏提示。

启动器核心逻辑：
1. `ConfigManager` 负责配置文件读写与实例目录初始化。
2. `ProcessEngine` 解析 VS Code 可执行路径，组装参数并启动新实例。
3. `InstanceTreeProvider` 提供实例列表与交互入口。

## 命令与快捷键
- 复制相对路径与行号：`ampify.copy-relative-path-line`（`Ctrl+Alt+C`）
- 复制绝对路径与行号：`ampify.copy-absolute-path-line`（`Ctrl+Alt+V`）
- 添加实例：`ampify.launcher.add`
- 刷新实例：`ampify.launcher.refresh`
- 编辑配置：`ampify.launcher.editConfig`
- 启动实例：`ampify.launcher.launch`
- 删除实例：`ampify.launcher.delete`

复制命令已注册到编辑器右键菜单，启动器命令在实例视图和条目菜单中提供。

## 开发与构建
脚本定义在 [package.json](package.json)：
- `npm run compile`：编译 TypeScript
- `npm run watch`：监视模式编译
- `npm run lint`：运行 ESLint

调试入口使用 [./.vscode/launch.json](.vscode/launch.json) 中的“调试扩展”，并在启动前执行构建任务。

## 编码规范
ESLint 规则在 [.eslintrc.json](.eslintrc.json) 中定义：
- 命名约定：`@typescript-eslint/naming-convention`
- 分号：`@typescript-eslint/semi`
- 强制花括号：`curly`
- 严格相等：`eqeqeq`
- 禁止抛出字面量：`no-throw-literal`

TypeScript 严格模式已开启（见 [tsconfig.json](tsconfig.json)）。

## CI/CD
项目包含 GitHub Actions 工作流（位于 [.github/](.github/)），用于在打标签发布时构建并发布 VSIX 包。

## 注意事项
- 未保存的文档会提示“无法获取文件路径”。
- 输出结果始终包裹反引号，适用于 Markdown 引用。
- 单行输出：`path:line`，多行输出：`path:start-end`。
- 启动器实例以独立用户目录运行，可共享扩展目录以复用已安装扩展。
