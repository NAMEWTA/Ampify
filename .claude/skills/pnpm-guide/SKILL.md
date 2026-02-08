---
name: pnpm-guide
description: Ampify 项目 pnpm monorepo 完整指南。涵盖 monorepo 架构原理、pnpm workspace 机制、Turborepo 任务编排与缓存策略、依赖管理、构建流程、VSIX 打包发布、CI/CD 自动化与故障排查。当用户提到 pnpm 操作、依赖管理、monorepo 工作流、构建打包、turbo 任务、workspace 依赖引用、package.json 修改、CI/CD、自动发布时使用。
tags:
  - pnpm
  - monorepo
  - build
  - turbo
  - ci-cd
---

# pnpm Monorepo 完整指南

## 1. Monorepo 架构原理

### 1.1 什么是 Monorepo

Monorepo（单一仓库）是将多个相关项目（packages）放在同一个 Git 仓库中管理的策略。与多仓库（Polyrepo）相比：

| 特性 | Monorepo | Polyrepo |
|------|----------|----------|
| **代码共享** | 直接引用，零发布延迟 | 需发布到 npm 再安装 |
| **原子提交** | 跨包改动一次 commit | 需协调多仓库版本 |
| **依赖一致性** | 根级别统一版本 | 各仓库各自管理 |
| **构建编排** | 统一工具链，拓扑排序 | 各自独立 CI |
| **重构成本** | 低（全局搜索替换） | 高（跨仓库协调） |

### 1.2 Ampify Monorepo 架构

本项目使用 **pnpm workspace + Turborepo** 管理 monorepo，指定版本 `pnpm@9.15.0`（通过 `packageManager` 字段锁定）。

```
ampify-monorepo/                    ← 根包 (private: true, 不发布)
├── package.json                    ← 根级 scripts + devDependencies
├── pnpm-workspace.yaml             ← workspace 声明
├── pnpm-lock.yaml                  ← 全局唯一锁文件
├── turbo.json                      ← Turborepo 任务编排配置
├── .npmrc                          ← pnpm 行为配置
├── scripts/copy-assets.js          ← 打包辅助脚本
└── packages/
    ├── shared/                     ← @ampify/shared — 共享类型与协议
    │   ├── package.json            ← name: "@ampify/shared"
    │   ├── tsconfig.json           ← target: ES2020, module: commonjs
    │   └── src/                    ← 源码 → 编译到 dist/
    ├── extension/                  ← ampify — VS Code 扩展主包
    │   ├── package.json            ← name: "ampify", 含 contributes 清单
    │   ├── tsconfig.json           ← target: ES2020, module: commonjs
    │   ├── .vscodeignore           ← VSIX 排除规则
    │   └── src/                    ← 源码 → 编译到 out/
    └── webview/                    ← ampify-webview — Webview 前端 (Vue 3)
        ├── package.json            ← name: "ampify-webview"
        ├── tsconfig.json           ← target: ES2020, module: ESNext (bundler)
        ├── vite.config.ts          ← Vite 构建配置
        └── src/                    ← 源码 → 构建到 ../extension/out/webview/
```

### 1.3 依赖拓扑与数据流

```
┌──────────────┐     workspace:*     ┌──────────────────┐
│  @ampify/     │◀────────────────────│  ampify           │
│  shared       │                     │  (extension)      │
│  类型 + 协议   │◀───────┐            │  VS Code 扩展主体  │
└──────────────┘        │            └────────┬─────────┘
                        │                     │
                        │   workspace:*       │ out/webview/ (构建产物嵌入)
                        │                     │
                ┌───────┴──────────┐          │
                │  ampify-webview   │──────────┘
                │  (Vue 3 前端)     │  Vite build 直接输出到 extension/out/webview/
                └──────────────────┘
```

**关键路径说明：**
- `shared` 是上游包，导出 TypeScript 类型与 Webview ↔ Extension 通信协议
- `extension` 和 `webview` 都依赖 `shared`，构建时必须先构建 `shared`
- `webview` 的 Vite 构建产物直接输出到 `extension/out/webview/`，无需手动复制
- VS Code 加载 extension 时，读取 `out/` 目录下的所有 JS 产物（含 webview）

---

## 2. pnpm Workspace 机制

### 2.1 workspace 声明

`pnpm-workspace.yaml`：

```yaml
packages:
  - 'packages/*'
```

此配置告诉 pnpm：`packages/` 下的每个带有 `package.json` 的一级子目录都是 workspace 成员。

### 2.2 `.npmrc` 配置详解

```properties
shamefully-hoist=false        # 严格隔离：不将依赖提升到根 node_modules
                              # 每个包只能访问自己声明的依赖（phantom dependency 防护）
strict-peer-dependencies=false # 宽松 peer：允许 peer 依赖版本范围不完全匹配
                              # 避免 Vue/TypeScript 等生态链的版本冲突报错
```

**`shamefully-hoist=false` 的意义：**

pnpm 默认使用符号链接 + 硬链接的嵌套 `node_modules` 结构，确保依赖隔离。设为 `false`（默认值）时：
- 包 A 无法意外访问包 B 的依赖（消除 phantom dependency）
- 每个包的 `node_modules` 只包含自己 `package.json` 中声明的依赖
- 未声明的依赖在 `require()` / `import` 时会直接报错

### 2.3 workspace 协议 (`workspace:*`)

子包间引用使用 `workspace:*` 协议：

```json
// packages/extension/package.json
"devDependencies": {
  "@ampify/shared": "workspace:*"    // 始终链接到本地 shared 包
}

// packages/webview/package.json
"devDependencies": {
  "@ampify/shared": "workspace:*"    // 同上
}
```

**`workspace:*` 的行为：**
- 开发时：pnpm 创建符号链接，直接引用本地源码/构建产物
- 发布时：`workspace:*` 会被替换为实际版本号（如 `0.0.0`），但本项目所有包均为 `private: true`，不会发布到 npm
- 因此，`workspace:*` 永远指向本地最新构建产物

### 2.4 pnpm 的 content-addressable 存储

pnpm 使用全局 **内容寻址存储**（content-addressable store），位于 `~/.pnpm-store/`：
- 相同版本的包只下载和存储一次（跨所有项目共享）
- 项目内的 `node_modules` 通过硬链接指向全局存储
- 节约磁盘空间，加速安装（无需重复下载）

### 2.5 锁文件

`pnpm-lock.yaml` 是全局唯一锁文件，精确锁定所有包的依赖树。CI 中使用 `--frozen-lockfile` 确保锁文件不被意外修改。

---

## 3. Turborepo 任务编排

### 3.1 Turborepo 核心概念

Turborepo 是一个高性能 monorepo 构建系统，核心能力：
1. **拓扑排序**：根据包间依赖自动确定构建顺序
2. **增量构建**：基于文件 hash 的内容感知缓存，跳过未变更的包
3. **并行执行**：无依赖关系的任务自动并行
4. **远程缓存**：可选的 Vercel Remote Cache（本项目未启用）

### 3.2 turbo.json 配置详解

```jsonc
{
  "$schema": "https://turbo.build/schema.json",   // JSON Schema，提供编辑器提示
  "tasks": {
    "build": {
      "dependsOn": ["^build"],                     // ← 拓扑依赖（核心）
      "outputs": ["out/**", "dist/**"],            // ← 缓存产物路径
      "inputs": ["src/**", "tsconfig.json", "vite.config.ts"]  // ← 缓存输入文件
    },
    "lint": {
      "dependsOn": ["^build"]                      // lint 前需先构建上游依赖
    },
    "watch": {
      "cache": false,                              // 监视模式不缓存
      "persistent": true                           // 标记为持久进程，不阻塞退出
    },
    "clean": {
      "outputs": []                                // 清理任务无产物
    }
  }
}
```

### 3.3 `dependsOn` 与拓扑排序

`"dependsOn": ["^build"]` 中的 `^` 前缀表示**上游依赖**（拓扑依赖）：

```
执行 `turbo run build` 时：

1. 分析依赖图：
   extension ─depends→ shared
   webview   ─depends→ shared

2. 拓扑排序后的执行计划：
   ┌─ Phase 1 ─┐     ┌──── Phase 2 ────┐
   │  shared    │ ──▶ │  extension      │
   │  (build)   │     │  webview        │ ← 并行
   └────────────┘     │  (同时 build)    │
                      └─────────────────┘
```

**`dependsOn` 变体：**
- `"^build"`：先构建所有上游依赖包（跨包拓扑）
- `"build"`（无 `^`）：先执行同包内的 `build` 任务
- `"lint"`：先执行同包内的 `lint` 任务
- 空数组 `[]`：无依赖，可立即执行

### 3.4 缓存策略详解

Turborepo 通过 **inputs hash** 判断是否需要重新构建：

```
Cache Key = hash(
  inputs 文件内容,       ← src/**, tsconfig.json, vite.config.ts
  package.json 内容,     ← 依赖变化也影响 hash
  turbo.json 配置,       ← 任务配置
  环境变量,              ← 如有配置
  上游依赖的构建 hash     ← 级联失效
)
```

**缓存命中时：**
- 跳过实际构建命令
- 直接从缓存恢复 `outputs`（`out/**`、`dist/**`）
- 终端输出 `cache hit, replaying logs`

**缓存失效条件：**
- `src/` 下任何文件变更
- `tsconfig.json` 或 `vite.config.ts` 变更
- `package.json` 依赖版本变更
- 上游依赖（`@ampify/shared`）重新构建

**缓存位置：** `node_modules/.cache/turbo/`

### 3.5 各子包构建命令与产物

| 子包 | 包名 | 构建命令 | 产物目录 | 说明 |
|------|------|----------|----------|------|
| `shared` | `@ampify/shared` | `tsc -p .` | `dist/` | CommonJS + 类型声明 |
| `extension` | `ampify` | `tsc -p .` | `out/` | CommonJS，VS Code 入口 |
| `webview` | `ampify-webview` | `vue-tsc -b && vite build` | `../extension/out/webview/` | 单文件 bundle |

**Webview 构建细节（`vite.config.ts`）：**
```typescript
build: {
  outDir: '../extension/out/webview',   // 直接输出到 extension 目录
  emptyOutDir: true,                    // 每次构建前清空
  rollupOptions: {
    output: {
      entryFileNames: 'assets/[name].js',
      chunkFileNames: 'assets/[name].js',
      assetFileNames: 'assets/[name].[ext]',
      inlineDynamicImports: true,       // 强制单 chunk（VS Code webview 要求）
    },
  },
  cssCodeSplit: false,                  // CSS 内联到 JS（避免加载问题）
  target: 'es2020',
  minify: 'esbuild',
}
```

---

## 4. 根级脚本与 package.json

### 4.1 根 package.json

```jsonc
{
  "name": "ampify-monorepo",
  "private": true,                     // 根包不发布
  "packageManager": "pnpm@9.15.0",     // 锁定 pnpm 版本（Corepack 使用）
  "scripts": {
    "build": "turbo run build",        // 构建所有包
    "lint": "turbo run lint",          // 检查所有包
    "watch": "turbo run watch",        // 监视所有包
    "clean": "turbo run clean",        // 清理所有构建产物
    "prepackage": "node scripts/copy-assets.js",   // 打包前复制资产
    "package": "pnpm run prepackage && cd packages/extension && pnpm exec vsce package"
  },
  "devDependencies": {
    "turbo": "^2.5.0",                 // Turborepo CLI
    "typescript": "^5.6.3"             // 根级 TypeScript（供子包引用）
  }
}
```

### 4.2 Extension package.json 关键字段

```jsonc
{
  "name": "ampify",
  "version": "2.4.0",                 // 与 Git tag 必须一致
  "main": "./out/extension.js",       // VS Code 入口文件
  "vscode:prepublish": "cd ../.. && pnpm run build",  // vsce 打包前自动构建
  "scripts": {
    "build": "tsc -p .",
    "watch": "tsc -watch -p .",
    "lint": "eslint src --ext ts",
    "clean": "..."
  },
  "dependencies": {
    "@vscode/codicons": "^0.0.44",     // 打入 VSIX
    "simple-git": "^3.22.0",           // 打入 VSIX
    "yaml": "^2.5.1"                   // 打入 VSIX
  },
  "devDependencies": {
    "@ampify/shared": "workspace:*",   // 编译时引用，不打入 VSIX
    "@vscode/vsce": "^3.0.0",          // VSIX 打包工具
    // ... TypeScript, ESLint 等
  }
}
```

**`dependencies` vs `devDependencies` 对 VSIX 的影响：**
- `dependencies` 中的包会被 `vsce package` 打入 VSIX（`node_modules/` 下保留）
- `devDependencies` 中的包不会打入 VSIX
- `@ampify/shared` 放在 `devDependencies` 是正确的，因为 TypeScript 编译后代码已内联

---

## 5. 日常操作指南

### 5.1 安装依赖

```bash
# 始终在项目根目录执行（安装所有包的依赖并建立 workspace 链接）
pnpm install

# CI 环境使用（锁文件不匹配则报错退出）
pnpm install --frozen-lockfile

# 仅安装 production 依赖
pnpm install --prod
```

### 5.2 添加/移除依赖

```bash
# 向指定子包添加运行时依赖（会打入 VSIX）
pnpm add <pkg> --filter ampify

# 向指定子包添加开发依赖（不打入 VSIX）
pnpm add -D <pkg> --filter ampify

# 向 webview 包添加开发依赖
pnpm add -D sass --filter ampify-webview

# 向根 workspace 添加开发依赖（构建工具等全局共享）
pnpm add -Dw <pkg>

# 移除依赖
pnpm remove <pkg> --filter <package-name>
```

### 5.3 workspace 内部依赖引用

```bash
# 添加 workspace 内部包引用
pnpm add @ampify/shared --filter ampify --workspace
pnpm add @ampify/shared --filter ampify-webview --workspace
```

### 5.4 构建命令

```bash
# 完整构建（Turbo 自动处理顺序：shared → extension + webview 并行）
pnpm run build

# 监视模式（所有包持续构建，适合开发调试）
pnpm run watch

# 仅构建某个子包（Turbo 自动构建其上游依赖）
pnpm run build --filter ampify
pnpm run build --filter ampify-webview
pnpm run build --filter @ampify/shared

# 强制忽略缓存重新构建
pnpm exec turbo run build --force
```

### 5.5 代码检查

```bash
# 全部包 lint
pnpm run lint

# 仅检查 extension
pnpm run lint --filter ampify
```

### 5.6 清理

```bash
# 清理所有包的构建产物（out/, dist/）
pnpm run clean

# 清理 Turborepo 缓存
pnpm exec turbo daemon stop
rm -rf node_modules/.cache/turbo       # Linux/macOS
Remove-Item -Recurse -Force node_modules\.cache\turbo  # Windows PowerShell
```

### 5.7 查看依赖树

```bash
# 查看某个包的依赖
pnpm list --filter ampify

# 递归查看所有包
pnpm list -r

# 查看某个依赖被谁使用
pnpm why <pkg>
```

### 5.8 执行子包脚本

```bash
# 在所有包中执行某个脚本
pnpm -r run <script>

# 在指定包中执行
pnpm --filter <package-name> run <script>

# 示例：仅在 webview 中启动 dev server
pnpm --filter ampify-webview run dev
```

### 5.9 执行可执行文件

```bash
# 使用 pnpm exec 执行 node_modules/.bin 中的命令
pnpm exec tsc --version
pnpm exec vsce package

# 在指定子包中执行
pnpm --filter ampify exec vsce package
```

### 5.10 更新依赖

```bash
# 交互式更新所有包的依赖
pnpm update -r -i

# 更新指定依赖到最新版
pnpm update <pkg> --filter <package-name>

# 更新所有 @types/* 依赖
pnpm update "@types/*" -r
```

---

## 6. VSIX 打包与发布

### 6.1 打包流程详解

```bash
# 完整打包（推荐）
pnpm run package
```

该命令等价于依次执行：

```
步骤 1: node scripts/copy-assets.js
  └─ 将根目录的 README.md, CHANGELOG.md, LICENSE, icon.png 复制到 packages/extension/
  └─ 因为 vsce 只打包 extension 目录内的文件

步骤 2: cd packages/extension && pnpm exec vsce package
  └─ vsce 先运行 vscode:prepublish 脚本（"cd ../.. && pnpm run build"）
  └─ Turbo 检测缓存：若已构建则 cache hit（秒级）
  └─ vsce 按 .vscodeignore 规则打包成 .vsix 文件
  └─ 产物：packages/extension/ampify-{version}.vsix
```

### 6.2 vscode:prepublish 钩子

`packages/extension/package.json` 中的 `vscode:prepublish` 脚本：

```json
"vscode:prepublish": "cd ../.. && pnpm run build"
```

这是 `vsce package` / `vsce publish` 自动触发的钩子，确保打包前执行完整构建。由于 Turborepo 缓存机制，重复构建不会浪费时间。

### 6.3 .vscodeignore 规则

```ignore
.vscode/**                                   # 调试配置
.vscode-test/**                              # 测试配置
src/**                                       # TypeScript 源码（已编译）
.gitignore
.yarnrc
vsc-extension-quickstart.md
**/tsconfig.json                             # 编译配置
**/.eslintrc.json                            # Lint 配置
**/*.map                                     # Source Map
**/*.ts                                      # TypeScript 文件
!node_modules/@vscode/codicons/dist/**       # 保留 codicons 图标字体
```

**VSIX 中实际包含的文件：**
- `out/` — 编译后的 JS 文件（含 webview 构建产物）
- `node_modules/` — 仅 `dependencies` 中的包（simple-git, yaml, @vscode/codicons）
- `package.json` — 扩展清单
- `README.md`, `CHANGELOG.md`, `LICENSE`, `icon.png` — 由 copy-assets 复制

### 6.4 版本管理与发布检查清单

发布新版本前：

1. **更新版本号**：修改 `packages/extension/package.json` 的 `version` 字段
2. **更新 CHANGELOG.md**：记录新版本的变更内容
3. **提交代码**：确保所有更改已提交
4. **打标签**：`git tag v{version}`（如 `git tag v2.4.0`）
5. **推送标签**：`git push origin v{version}`
6. **CI 自动构建**：GitHub Actions 自动打包并创建 Release

---

## 7. CI/CD 自动化发布

### 7.1 GitHub Actions 工作流

文件：`.github/workflows/release-vsix.yml`

```yaml
name: Release VSIX on Tag
on:
  push:
    tags: ['v*']                    # 仅在 v 开头的标签推送时触发
```

**完整流程：**

```
git tag v2.4.0 → git push origin v2.4.0
  │
  ▼
GitHub Actions 触发
  │
  ├─ 1. Checkout 代码
  ├─ 2. 安装 pnpm（从 packageManager 字段读取版本）
  ├─ 3. 安装 Node.js 20 + pnpm 缓存
  ├─ 4. 版本校验：tag (v2.4.0 → 2.4.0) === package.json version
  ├─ 5. pnpm install --frozen-lockfile
  ├─ 6. pnpm run build（Turbo 编排构建）
  ├─ 7. node scripts/copy-assets.js（复制资产到 extension/）
  ├─ 8. pnpm exec vsce package（生成 .vsix）
  │     └─ vsce 触发 vscode:prepublish → Turbo cache hit（秒级）
  └─ 9. 创建 GitHub Release + 上传 .vsix 附件
```

### 7.2 工作流关键细节

**版本校验步骤**防止标签与 package.json 版本不一致：
```bash
TAG="${GITHUB_REF_NAME#v}"           # v2.4.0 → 2.4.0
PKG_VERSION="$(node -p "require('./packages/extension/package.json').version")"
# 不一致则失败退出
```

**pnpm 缓存**通过 `actions/setup-node` 的 `cache: 'pnpm'` 实现：
- 首次运行缓存 pnpm store
- 后续运行跳过已缓存的包下载

**vsce package 与 vscode:prepublish 的交互：**
- 工作流步骤 6 已完成 `pnpm run build`（Turbo 构建所有包）
- 步骤 8 的 `vsce package` 触发 `vscode:prepublish`（再次 `pnpm run build`）
- Turbo 检测到缓存命中，秒级跳过，不会重复构建

---

## 8. Turbo CLI 操作规范

### 8.1 常用命令

```bash
# 运行指定任务（通过根 package.json scripts 间接调用）
pnpm run build              # 等价于 turbo run build
pnpm run lint               # 等价于 turbo run lint

# 直接调用 turbo（效果相同）
pnpm exec turbo run build

# 强制重新构建（忽略缓存）
pnpm exec turbo run build --force

# 仅构建某个包及其依赖
pnpm exec turbo run build --filter=ampify

# 试运行（显示执行计划但不实际构建）
pnpm exec turbo run build --dry-run

# 显示依赖图（JSON 格式）
pnpm exec turbo run build --graph
```

### 8.2 过滤器语法

```bash
# 按包名过滤
--filter=ampify              # 仅 extension 包
--filter=ampify-webview      # 仅 webview 包
--filter=@ampify/shared      # 仅 shared 包

# 按目录过滤
--filter=./packages/extension

# 包含依赖
--filter=ampify...           # ampify 及其所有上游依赖（shared）

# 仅依赖（不含自身）
--filter=...^ampify          # ampify 的所有上游依赖（仅 shared）

# 基于 Git diff 过滤（构建受影响的包）
--filter=...[HEAD~1]         # 与上一次 commit 相比有变更的包
```

### 8.3 缓存调试

```bash
# 查看缓存状态
pnpm exec turbo run build --summarize
# 会在 .turbo/runs/ 生成 JSON 摘要

# 查看哪些文件影响了缓存 key
pnpm exec turbo run build --dry-run=json

# 清除本地缓存
pnpm exec turbo daemon stop
rm -rf node_modules/.cache/turbo
```

### 8.4 Turbo Daemon

Turbo 2.x 使用后台 daemon 进程加速文件监视：

```bash
# 查看 daemon 状态
pnpm exec turbo daemon status

# 停止 daemon
pnpm exec turbo daemon stop

# daemon 日志位置
# Linux/macOS: ~/.turbo/daemon/
# Windows:     %LOCALAPPDATA%\turbo\daemon\
```

---

## 9. 故障排查

### 9.1 常见问题

**Q: `pnpm install` 后子包找不到 `@ampify/shared` 模块？**
```bash
# 确保 shared 已构建
pnpm run build --filter @ampify/shared
# 检查 shared/dist/ 是否存在
```

**Q: Turbo 缓存似乎不生效，每次都重新构建？**
```bash
# 检查是否有未追踪文件影响 inputs
pnpm exec turbo run build --dry-run
# 确认 inputs 配置正确，排除不稳定文件
```

**Q: VSIX 打包报错"找不到 README.md / icon.png"？**
```bash
# 需先运行资产复制
node scripts/copy-assets.js
# 或直接用完整打包命令
pnpm run package
```

**Q: Webview 更新后 extension 未加载最新版？**
```bash
# 确认 webview 构建产物已更新
ls packages/extension/out/webview/assets/
# 若不存在，重新构建
pnpm run build --filter ampify-webview
```

**Q: `vsce package` 报 `prepublish` 脚本失败？**
```bash
# vscode:prepublish 执行 "cd ../.. && pnpm run build"
# 确保从 packages/extension/ 目录执行时，cd ../.. 能回到根目录
# 或直接用根目录的 pnpm run package
```

### 9.2 开发环境最佳实践

1. **始终在项目根目录执行 `pnpm install`**，不要在子包目录单独 install
2. **子包间引用必须使用 `workspace:*` 协议**，确保本地链接
3. **修改 `@ampify/shared` 后需重新构建**，下游包才能获取类型更新
4. **优先使用 `pnpm run build` 而非直接调用子包构建命令**，让 Turbo 处理拓扑排序
5. **调试时使用 `pnpm run watch`**，所有包进入持续监视模式
6. **VSIX 打包前务必执行 `pnpm run package`**（含资产复制步骤）
7. **不要手动删除 `pnpm-lock.yaml`**，它保证依赖版本一致性
8. **CI 中必须使用 `--frozen-lockfile`**，防止锁文件被意外修改
