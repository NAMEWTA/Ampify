---
title: "迁移至 pnpm Monorepo 架构"
description: "将 Ampify 项目从 npm 单包结构迁移至 pnpm workspaces + Turborepo 多包架构，分离扩展、Webview 和共享类型"
version: "2.4.0"
date: 2026-02-07
tags:
  - refactor
  - config
---

# 迁移至 pnpm Monorepo 架构

> 版本：v2.4.0 | 日期：2026-02-07 | 标签上一版本：v2.3.0

## 概述

本次发布将 Ampify 从 npm 单包平铺结构整体迁移至 pnpm workspaces + Turborepo 多包架构。项目拆分为三个独立包：`packages/extension`（VS Code 扩展）、`packages/webview`（Vue 3 Webview 前端）、`packages/shared`（共享协议类型），实现了构建编排、类型共享和依赖管理的全面升级。

## 变更详情

### 变更优化（Changed）

- **项目结构迁移至 Monorepo**：将原根目录下的 `src/`、`webview/` 等目录迁移至 `packages/extension/src/`、`packages/webview/` 和 `packages/shared/`，采用 pnpm workspaces 管理多包依赖关系。所有源文件物理位置变更但内容保持 100% 一致（Git 自动检测为 rename）。
  - 涉及文件：全部 `src/**` → `packages/extension/src/**`，`webview/**` → `packages/webview/**`

- **共享协议类型抽取**：将原 `src/modules/mainView/protocol.ts` 抽取为独立包 `packages/shared`，并通过 `workspace:*` 协议在 extension 和 webview 中引用，消除类型重复定义。
  - 涉及文件：`packages/shared/src/protocol.ts`、`packages/shared/src/index.ts`、`packages/shared/package.json`、`packages/shared/tsconfig.json`

- **包管理器从 npm 切换至 pnpm**：删除 `package-lock.json` 和 `webview/package-lock.json`，新增 `pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.npmrc`。根 `package.json` 精简为 monorepo 编排入口，扩展相关配置移至 `packages/extension/package.json`。
  - 涉及文件：`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.npmrc`、`packages/extension/package.json`

- **引入 Turborepo 构建编排**：新增 `turbo.json` 配置多包构建依赖图，`packages/extension` 的构建自动依赖 `packages/shared` 和 `packages/webview` 的构建产物。新增 `scripts/copy-assets.js` 用于 VSIX 打包前复制 webview 产物。
  - 涉及文件：`turbo.json`、`scripts/copy-assets.js`

- **CI/CD 工作流适配 Monorepo**：更新 `.github/workflows/release-vsix.yml`，增加 pnpm 安装步骤、使用 `pnpm turbo run build` 构建全部包、调整 VSIX 打包路径至 `packages/extension/`。
  - 涉及文件：`.github/workflows/release-vsix.yml`

- **开发调试配置更新**：更新 `.vscode/launch.json` 的 `extensionDevelopmentPath` 和 `outFiles` 路径指向 `packages/extension/`；更新 `.vscode/tasks.json` 的构建命令使用 pnpm。
  - 涉及文件：`.vscode/launch.json`、`.vscode/tasks.json`

- **ESLint 配置与 .vscodeignore 迁移**：将 `eslint.config.js` 和 `.vscodeignore` 从根目录迁移至 `packages/extension/`，使其仅作用于扩展包。
  - 涉及文件：`packages/extension/eslint.config.js`、`packages/extension/.vscodeignore`

- **新增技能指南**：添加 command-creator（命令创建指南）、pnpm-guide（pnpm Monorepo 操作指南）、skill-creator（技能创建指南）三个新技能。
  - 涉及文件：`.claude/skills/command-creator/`、`.claude/skills/pnpm-guide/`、`.claude/skills/skill-creator/`

- **开发规范文档同步更新**：更新 AGENTS.md、ampify-dev-guide SKILL.md 及其 references 文件中的路径引用和目录树，全部对齐至 `packages/` monorepo 结构。
  - 涉及文件：`AGENTS.md`、`.claude/skills/ampify-dev-guide/SKILL.md`、`.claude/skills/ampify-dev-guide/references/coding-conventions.md`、`.claude/skills/ampify-dev-guide/references/module-mainview.md`

- **发布命令增强**：npm-git-commit-push 命令新增 `notes/` 知识库记录生成功能，更新 `package.json` 路径为 `packages/extension/package.json`，将 npm 标签改为 pnpm。
  - 涉及文件：`.claude/commands/npm-git-commit-push.md`

- **Gitignore 完善**：新增 `.turbo/`、`*.tsbuildinfo`、`__pycache__` 忽略规则。
  - 涉及文件：`.gitignore`

## 影响范围

- **涉及模块**：全部模块（extension、webview、shared），构建系统、CI/CD、开发工具配置
- **配置变更**：根 `package.json` 精简为 monorepo 入口；扩展配置移至 `packages/extension/package.json`；新增 `turbo.json`、`pnpm-workspace.yaml`
- **破坏性变更**：无（对最终用户无影响，仅内部项目结构变更）

## 提交记录

| Hash | 类型 | 描述 |
|------|------|------|
| `f6291cb` | refactor | 迁移至 pnpm monorepo with Turborepo |
