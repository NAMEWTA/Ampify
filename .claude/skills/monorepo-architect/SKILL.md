---
name: monorepo-architect
description: 管理 Ampify 项目的 Monorepo 结构，强制执行开发规范。当涉及创建新模块、重构代码或检查项目结构时调用。
---

# Monorepo Architect

此 Skill 旨在维护 Ampify 项目的 Monorepo 架构完整性，确保所有开发活动遵循既定的模块化规范。

## 何时使用

*   当用户要求创建新的业务模块时。
*   当需要重构现有代码以符合 Monorepo 结构时。
*   当用户询问项目结构或开发规范时。
*   当进行跨模块依赖管理时。

## 核心架构

Ampify 采用基于 npm workspace 的 Monorepo 架构：

```text
.
├── packages/
│   ├── core/           # 🧠 后端核心逻辑 (Launcher, Copier 业务逻辑)
│   ├── ui/             # 🎨 前端统一界面 (Webview 组件, React/Vue)
│   ├── shared/         # 🔗 共享模块 (类型定义, i18n, 工具函数)
│   └── eslint-config/  # 📏 统一的代码规范配置
├── apps/
│   └── extension/      # 🚀 VS Code 扩展主入口 (聚合各 package)
```

## 开发规范

### 1. 模块化原则

*   **UI 与逻辑分离**: 所有的界面组件（React 组件、HTML 模板）必须存放在 `packages/ui` 中。业务逻辑不得直接包含 UI 代码。
*   **核心逻辑独立**: 业务逻辑（如文件操作、配置管理）应封装在 `packages/core` 的对应子模块中。
*   **单一职责**: `apps/extension` 仅负责 VS Code API 的胶水代码、命令注册和事件监听，不包含具体业务逻辑。

### 2. 依赖管理

*   禁止在 `apps/extension` 中直接引用 `packages/ui` 的内部实现，必须通过导出的接口访问。

### 3. 代码风格

*   严格遵守项目根目录下的 `.eslintrc.json` 和 `.prettierrc`（如有）。
*   所有新文件必须包含 TypeScript 类型定义。
*   命名规范：
    *   目录/包名：`kebab-case` (e.g., `user-settings`)
    *   类名：`PascalCase` (e.g., `ConfigManager`)
    *   变量/函数：`camelCase` (e.g., `initLauncher`)

## 操作指南

### 创建新模块

1.  确定模块类型（Core 业务逻辑 vs UI 组件）。
2.  在 `packages/<type>/` 下创建新目录。
3.  初始化 `package.json`，设置正确的 `name` (e.g., `@ampify/core-launcher`)。
4.  在 `apps/extension` 中添加依赖。

### 迁移旧代码

1.  识别代码功能归属。
2.  将逻辑提取到 `packages/core` 或 `packages/shared`。
3.  确保新模块可独立测试。
4.  在 `apps/extension` 中引入新模块并替换旧逻辑。

## 验证清单

在完成任务后，请检查：
- [ ] 是否破坏了 Monorepo 的边界？（如 Core 引用了 UI）
- [ ] 是否更新了相关的 `README.md`？
