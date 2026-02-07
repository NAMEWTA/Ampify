---
name: pnpm-guide
description: Ampify 项目 pnpm monorepo 操作指南。涵盖依赖安装、包管理、构建流程、workspace 协议、Turborepo 编排、VSIX 打包发布等日常操作。当用户提到 pnpm 操作、依赖管理、monorepo 工作流、构建打包、turbo 任务、workspace 依赖引用、package.json 修改时使用。
tags:
  - pnpm
  - monorepo
  - build
---

# pnpm Monorepo 操作指南

本项目使用 pnpm workspace + Turborepo 管理 monorepo，指定版本 `pnpm@9.15.0`。

## 项目结构

```
ampify-monorepo/              ← 根 (private)
├── packages/shared/          ← @ampify/shared — 共享类型与协议
├── packages/extension/       ← ampify — VS Code 扩展主包
└── packages/webview/         ← ampify-webview — Webview 前端 (Vue 3)
```

workspace 声明（`pnpm-workspace.yaml`）：

```yaml
packages:
  - 'packages/*'
```

`.npmrc` 配置：

```properties
shamefully-hoist=false        # 严格隔离依赖（默认 pnpm 行为）
strict-peer-dependencies=false # 允许 peer 依赖版本不匹配
```

## 依赖拓扑

```
extension ──depends──▶ @ampify/shared (workspace:*)
webview   ──depends──▶ @ampify/shared (workspace:*)
```

`workspace:*` 协议表示始终引用本地 workspace 中的最新版本。

## 日常操作速查

### 安装依赖

```bash
# 在项目根目录执行，安装所有包的依赖
pnpm install

# 仅安装 production 依赖
pnpm install --prod
```

### 添加/移除依赖

```bash
# 向指定子包添加依赖
pnpm add <pkg> --filter <package-name>

# 示例：向 extension 添加运行时依赖
pnpm add lodash --filter ampify

# 示例：向 webview 添加开发依赖
pnpm add -D sass --filter ampify-webview

# 向根 workspace 添加开发依赖（构建工具等）
pnpm add -Dw <pkg>

# 移除依赖
pnpm remove <pkg> --filter <package-name>
```

### workspace 内部依赖引用

```bash
# 子包间互相引用，使用 workspace 协议
pnpm add @ampify/shared --filter ampify --workspace
```

在 `package.json` 中体现为：

```json
"devDependencies": {
  "@ampify/shared": "workspace:*"
}
```

## 构建流程

项目使用 Turborepo 编排构建顺序，配置在 `turbo.json`：

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],   // 先构建上游依赖
      "outputs": ["out/**", "dist/**"],
      "inputs": ["src/**", "tsconfig.json", "vite.config.ts"]
    },
    "watch": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`^build` 表示：构建 extension 或 webview 之前，先构建 shared。

### 构建命令

```bash
# 构建全部包（shared → extension + webview 并行）
pnpm run build

# 监视模式（所有包持续构建）
pnpm run watch

# 仅构建某个子包
pnpm run build --filter ampify
pnpm run build --filter ampify-webview
pnpm run build --filter @ampify/shared
```

### 各子包构建产物

| 子包 | 构建命令 | 产物目录 |
|------|----------|----------|
| `@ampify/shared` | `tsc -p .` | `dist/` |
| `ampify` (extension) | `tsc -p .` | `out/` |
| `ampify-webview` | `vue-tsc -b && vite build` | `../extension/out/webview/` |

> Webview 产物直接输出到 extension 的 `out/webview/` 目录，由 extension 直接引用。

## 代码检查

```bash
# 全部包 lint
pnpm run lint

# 仅检查 extension
pnpm run lint --filter ampify
```

## 清理构建缓存

```bash
# 清理所有包的构建产物
pnpm run clean

# 清理 Turborepo 缓存
pnpm exec turbo daemon stop
# 或手动删除
rm -rf node_modules/.cache/turbo
```

## VSIX 打包与发布

```bash
# 完整打包流程（复制资产 → 构建 → 打包 VSIX）
pnpm run package

# 该命令等价于：
# 1. node scripts/copy-assets.js   — 复制 README.md, CHANGELOG.md, LICENSE, icon.png 到 extension 目录
# 2. cd packages/extension && pnpm exec vsce package  — 在 extension 目录生成 .vsix 文件
```

发布前确认 `packages/extension/package.json` 中的 `version` 已更新。

`.vscodeignore` 控制 VSIX 中排除的文件：

```
.vscode/**
src/**                   # 源码不打包
**/*.ts                  # TS 文件不打包
**/*.map                 # sourcemap 不打包
!node_modules/@vscode/codicons/dist/**  # codicons 保留
```

## 常用 pnpm 操作

### 查看依赖树

```bash
# 查看某个包的依赖
pnpm list --filter ampify

# 递归查看所有包
pnpm list -r

# 查看某个依赖被谁使用
pnpm why <pkg>
```

### 执行子包脚本

```bash
# 在所有包中执行某个脚本
pnpm -r run <script>

# 在指定包中执行
pnpm --filter <package-name> run <script>

# 示例：仅在 webview 中启动 dev server
pnpm --filter ampify-webview run dev
```

### 执行可执行文件

```bash
# 使用 pnpm exec 执行 node_modules/.bin 中的命令
pnpm exec tsc --version
pnpm exec vsce package

# 在指定子包中执行
pnpm --filter ampify exec vsce package
```

### 更新依赖

```bash
# 交互式更新所有包的依赖
pnpm update -r -i

# 更新指定依赖到最新版
pnpm update <pkg> --filter <package-name>

# 更新所有 @types/* 依赖
pnpm update "@types/*" -r
```

## 注意事项

- 始终在**项目根目录**执行 `pnpm install`，不要在子包目录单独 install
- 子包间引用必须使用 `workspace:*` 协议，确保本地链接
- 修改 `@ampify/shared` 后需重新构建，下游包才能获取更新
- Webview 的 Vite 构建产物直接输出到 extension 的 `out/webview/`，无需手动复制
- `pnpm run build` 通过 Turborepo 自动处理构建顺序和缓存
- VSIX 打包前务必执行 `pnpm run package`（含资产复制步骤）
