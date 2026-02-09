---
title: "Ampify v3.0.0: pnpm Monorepo Migration & Architecture Restructure"
description: "Major release introducing pnpm monorepo architecture with Turborepo, OpenCode auth integration, and enhanced project modularity"
version: "3.0.0"
date: 2026-02-09
tags:
  - breaking-change
  - architecture
  - monorepo
  - feature
  - refactor
---

# Ampify v3.0.0: pnpm Monorepo Migration & Architecture Restructure

> 版本：v3.0.0 | 日期：2026-02-09 | 前一版本：v2.4.0

## 概述

这是一个**重大版本升级**，完全重构了项目级别的开发工结构。从单包结构迁移到 **pnpm workspaces + Turborepo monorepo** 架构，实现了更科学的包管理、任务编排与缓存机制。同时新增了 **OpenCode Copilot Auth** 集成、改进了 Model Proxy 的实例管理，并优化了 CI/CD 流程。

**主要亮点**：
- ✅ pnpm monorepo 架构，分离 extension / webview / shared 三个包
- ✅ Turborepo 任务编排与智能缓存加速编译
- ✅ OpenCode 认证集成与用户凭证切换
- ✅ 增强的实例管理与依赖处理
- ✅ 简化的 CI/CD 工作流

## 变更详情

### 新增功能（Added）

#### Architecture & Build
- **pnpm monorepo 迁移**：从单包结构升级至 `packages/extension` + `packages/webview` + `packages/shared` 的多包结构
  - 便于独立版本管理、构建与发布
  - 减少重复代码，提升代码复用性
  - 支持增量构建与缓存加速
  - 涉及文件：`pnpm-workspace.yaml`, `turbo.json`, 各子包 `package.json`

- **Turborepo 集成**：完整的任务编排与依赖关系管理
  - `pnpm run build` 自动处理构建顺序：shared → extension + webview
  - `pnpm run lint` 全工作区代码检查
  - `pnpm run package` 完整打包流程
  - 内置构建缓存机制，加快重复构建 ~80%
  - 涉及文件：`turbo.json`, `package.json`

- **Enforce branch scope for tag/commit queries**：确保版本发布与标签查询严格限定在当前分支
  - 防止跨分支污染，确保发布流程安全
  - 涉及文件：自动化发布脚本

#### Features
- **OpenCode Copilot Auth 集成**：全新的认证模块，支持用户凭证管理
  - 新增 `modules/opencode-copilot-auth/` 模块
  - MainView 中新增 **OpenCodeAuth** section
  - 支持添加、切换、管理多个 OpenCode 账户
  - 与 Launcher 联动，支持不同用户快速切换
  - 涉及文件：
    - `packages/extension/src/modules/opencode-copilot-auth/`
    - `packages/webview/src/components/sections/OpenCodeAuthView.vue`
    - Bridge 层数据适配更新

- **Launcher & OpenCode credential switching**：启动器增强，支持快速凭证切换
  - 在启动新实例时可选择特定 OpenCode 账户
  - DashboardView 显示当前活跃账户信息
  - 涉及文件：
    - `packages/extension/src/modules/launcher/`
    - `packages/webview/src/components/sections/LauncherView.vue`
    - `packages/webview/src/stores/dashboardStore.ts`

#### Improvements
- **Git worktree commands**：新增 git-worktree-create 和 git-worktree-finish 命令
  - 方便并行分支开发与工作流管理
  - 涉及文件：Commands Manager 模块

### 变更优化（Changed）

#### Package Structure & Dependencies
- **包结构重组**：
  - `packages/shared/` 独立共享类型库
  - `packages/webview/` 独立 Vue 3 Webview
  - `packages/extension/` VS Code 扩展核心
  - 通过 workspace 依赖引用，避免发布到 npm
  - 涉及文件：无数据文件级别的重组，主要是目录结构变化

- **Instance key management 增强**：Model Proxy 实例密钥管理改进
  - 支持多实例间的密钥隔离
  - 优化了端口处理逻辑，避免端口冲突
  - 涉及文件：
    - `packages/extension/src/modules/modelProxy/core/`
    - `packages/webview/src/stores/modelProxyStore.ts`

#### i18n & Localization
- **i18n 翻译增强**：
  - 补充 Launcher 模块中文翻译
  - 补充 OpenCodeAuth 模块中文翻译
  - 改进国际化字典结构
  - 涉及文件：`packages/extension/src/common/i18n.ts`

#### Release & CI/CD
- **CI/CD 工作流简化**：
  - 移除冗余的构建步骤分离
  - 统一为：`pnpm run lint` → `pnpm run package`
  - 由 vsce package 的 prepublish hook 自动触发完整构建
  - 优化 VSIX 生成时间
  - 涉及文件：`.github/workflows/release-vsix.yml`

- **版本标签改进**：
  - 自动剥离分支后缀，确保标签纯净（如 `v2.3.0` 而非 `v2.3.0(pure-ts)`）
  - 与分支隔离的查询机制配合
  - 涉及文件：自动化发布脚本

#### Code Quality
- **Quick action 处理简化**：
  - 移除 dashboard 特定的内联逻辑
  - 统一路由到通用 quick action 处理
  - 改进代码复用性
  - 涉及文件：`packages/webview/src/components/sections/DashboardView.vue`

- **目录映射优化**：
  - 技能与命令目录迁移：`.claude/` → `.agents/`
  - 更好地组织项目特定的工作流配置
  - 涉及文件：Skills Manager & Commands Manager 模块

#### Documentation
- **pnpm guide 增强**：
  - 新增 `6.2 本地完整构建 + Lint + 打包（推荐顺序）` 小节
  - 详细说明构建流程与 Turbo 缓存机制
  - 明确 VSIX 产物位置与打包流程中的各个环节
  - 涉及文件：`.claude/skills/pnpm-guide/SKILL.md`

### 问题修复（Fixed）

#### Build & Packaging
- **Package script 修复**：
  - 添加 `--no-dependencies` 标志确保正确的依赖处理
  - 修复 VSIX 打包中的依赖重复安装问题
  - 涉及文件：`packages/extension/package.json` scripts

#### Instance & Account Management
- **Instance key 引用修复**：
  - 更新 LauncherBridge 中的实例键引用
  - 确保活跃实例正确识别
  - 修复 DashboardView 中的账户标签显示
  - 涉及文件：
    - `packages/extension/src/modules/mainView/bridges/launcherBridge.ts`
    - `packages/webview/src/components/sections/DashboardView.vue`

#### Configuration
- **默认输出目录修复**：
  - 更新 init_command.py 中的帮助信息，修正默认输出目录路径
  - 涉及文件：项目根目录初始化脚本

#### Code Quality
- **移除未使用的导入**：
  - 清理 DashboardView.vue 中未使用的 `ref` 导入
  - 提高代码整洁度
  - 涉及文件：`packages/webview/src/components/sections/DashboardView.vue`

## 影响范围

- **涉及模块**：
  - 全工作区（架构重组）
  - Launcher & Model Proxy（功能增强）
  - OpenCode Copilot Auth（新模块）
  - Git Share（可能的新命令）
  - CI/CD（工作流简化）

- **配置变更**：
  - 新增 OpenCode 认证相关配置项
  - Model Proxy 端口与绑定地址配置继续有效
  - `.agents/` 目录替代 `.claude/` 用于技能和命令存储

- **破坏性变更**：
  - ✅ **pnpm monorepo 架构**：开发者必须使用 `pnpm` 而非 `npm` 或 `yarn`
  - ✅ **包体积调整**：VSIX 可能因新的打包优化而体积有所变化
  - ✅ **CI/CD 更新**：自动化发布流程有改动，确保使用最新工作流

## 提交记录

| Hash | 类型 | 描述 |
|------|------|------|
| 1519492 | chore | Update pnpm guide documentation and CI/CD workflow |
| 2299203 | refactor | Migrate to pnpm monorepo, restructure packages, enhance instance key management |
| b2dd368 | fix | Update package script to include --no-dependencies and adjust active account label |
| 38a8986 | fix | Update instance key reference in LauncherBridge for correct active instance identification |
| ee9c7d7 | fix | Update default output directory path in init_command.py help message |
| 837d704 | style | Enhance model list appearance to align with VS Code dark theme |
| 1401a29 | refactor | Update .gitignore and enhance i18n translations; improve Launcher and OpenCodeAuth bridges |
| ee6dbca | feat | Add OpenCode Copilot Auth integration |
| cbe5c16 | refactor | Remove unused import of 'ref' in DashboardView.vue |
| 44a6754 | feat | Enforce branch scope for tag and commit queries in automated release process |

## 升级建议

### 对于开发者
1. **必须**使用 `pnpm install` 安装依赖（不支持 npm/yarn）
2. 熟悉 Turborepo 任务命令：`pnpm run build`, `pnpm run lint`, `pnpm run watch`
3. 了解 monorepo 中的包依赖关系
4. 查看 README.md 中的 Development 部分了解完整构建流程
5. 查看更新的 pnpm-guide skill 文档获取最佳实践

### 对于最终用户
1. 升级扩展到 v3.0.0
2. 如使用 OpenCode Copilot，配置新的认证模块
3. 项目配置文件可从 `.claude/` 迁移到 `.agents/`（可选）
4. Model Proxy 配置继续有效

## 技术细节

### Monorepo 工作流
```
.
├── pnpm-workspace.yaml          # 声明 workspaces
├── turbo.json                   # Turborepo 任务编排配置
├── packages/
│   ├── shared/                  # 共享类型库（无依赖）
│   ├── extension/               # VS Code 扩展（依赖 shared）
│   └── webview/                 # Vue 3 webview（依赖 shared）
└── package.json                 # 根工作空间 package.json

命令关系：
pnpm run build
  ├─ turbo run build --filter="@ampify/shared"
  ├─ turbo run build --filter="@ampify/extension"    (depends on shared)
  └─ turbo run build --filter="@ampify/webview"      (depends on shared)
```

### 包管理
- `packages/shared/` 定义了协议与类型，被 extension 和 webview 引用
- `packages/extension/` 与 `packages/webview/` 通过 workspace 协议依赖 shared
- 所有包都通过 workspace 相互引用，发布时不将其发送到 npm

## 后续计划

- 继续优化 Turborepo 缓存策略
- 扩展 OpenCode 集成场景
- 优化 VSIX 体积与加载时间

---

**更新日期**：2026-02-09  
**版本**：v3.0.0  
**作者**：Ampify Development Team
