---
name: ampify-dev-guide
description: Ampify VS Code 扩展开发规范指南。用于新建功能模块、扩展 MainView Webview、添加命令、调整配置与存储结构、理解技能与命令数据的 Git Share 同步逻辑。当用户提到 Ampify 开发、架构、模块实现、数据流、Webview 协议或项目结构时使用。
---

# Ampify 开发规范指南

本 Skill 提供 Ampify 扩展的开发指引与模块化说明。先阅读本文快速建立全局结构，再按需进入各 `references/` 文档获取详细流程与 Mermaid 图。

## 项目速览（6 大模块）
1. Copier：复制文件路径与行号
2. Launcher：VS Code 多实例启动器
3. Skills Manager：Skill 仓库管理与注入
4. Commands Manager：Command 仓库管理与注入
5. Git Share：Git 同步与差异预览
6. MainView：统一 Webview 视图与 Bridge

## 目录结构（真实结构）

```
Ampify/
├── src/
│   ├── extension.ts
│   ├── common/
│   │   ├── baseConfigManager.ts
│   │   ├── i18n.ts
│   │   ├── paths.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── git/
│   │       ├── gitManager.ts
│   │       ├── diffViewer.ts
│   │       └── index.ts
│   └── modules/
│       ├── copier/
│       ├── launcher/
│       │   └── core/
│       ├── skills/
│       │   ├── core/
│       │   └── templates/
│       ├── commands/
│       │   ├── core/
│       │   └── templates/
│       ├── gitShare/
│       └── mainView/
│           ├── bridges/
│           ├── templates/
│           └── protocol.ts
├── package.json
├── tsconfig.json
├── eslint.config.js
└── .vscode/
```

## 新增功能的标准流程
1. 创建模块目录与入口 `index.ts`
2. 定义类型（如需共享）到 `common/types/index.ts`
3. 如果需要本地配置，继承 `BaseConfigManager<T>`；如果需要 Git 同步，存储到 `gitshare/` 目录并自建 config
4. 添加 i18n 键到 `common/i18n.ts`
5. 在 `package.json` 声明命令或配置
6. 在 `extension.ts` 注册模块
7. 如需要 UI，接入 MainView：创建 Bridge，实现 `getTreeData()` / `getToolbar()` / `executeAction()`

## 公共能力速查

### 路径工具
使用 `common/paths.ts` 的 `getRootDir()`、`getModuleDir()`、`getGitShareDir()` 统一管理数据目录。

### 配置基类
`BaseConfigManager<T>` 适用于本地模块配置（非 Git Share）。

### 国际化
所有用户可见文本必须通过 `I18n.get()`，新增键时同步维护 `en` 与 `zh-cn`。

## 参考文档导航（按需阅读）

- 总体架构与数据流：references/architecture.md
- Copier 模块：references/module-copier.md
- Launcher 模块：references/module-launcher.md
- Skills Manager 模块：references/module-skills.md
- Commands Manager 模块：references/module-commands.md
- Git Share 模块：references/module-gitshare.md
- MainView 模块（含 Bridge TreeNode 结构流图）：references/module-mainview.md
- 编码规范与开发流程：references/coding-conventions.md
