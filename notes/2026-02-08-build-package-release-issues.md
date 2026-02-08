# 编译打包发版问题汇总

> 日期：2026-02-08  
> 版本：v2.4.0  
> 环境：Node.js v20/v24、pnpm 9.15.0、turbo 2.8.3、@vscode/vsce 3.0.0

---

## 问题 1：GitHub Actions CI — turbo 模块找不到

### 现象

```
Error: Cannot find module '/home/runner/work/Ampify/Ampify/node_modules/turbo/bin/turbo'
```

CI 在 `vsce package` 阶段触发了 `vscode:prepublish` 脚本，该脚本执行 `cd ../.. && pnpm run build`，而 `build` 依赖根目录的 `turbo`。

### 根因

工作流在打包前执行了：

```yaml
- name: Install extension prod deps (pnpm)
  working-directory: packages/extension
  run: HUSKY=0 pnpm install --prod --ignore-scripts --config.node-linker=hoisted
```

这条命令以 `--prod` 模式重装依赖，**裁剪了根目录的 `devDependencies`**（包括 `turbo`），导致后续 `vsce package` 触发的 `vscode:prepublish → pnpm run build → turbo run build` 找不到 turbo 二进制。

### 修复

移除独立的 prod install 步骤和子目录 vsce 调用，改为直接在根目录执行 `pnpm run package`：

```yaml
# 修复前
- name: Install extension prod deps (pnpm)
  working-directory: packages/extension
  run: HUSKY=0 pnpm install --prod --ignore-scripts --config.node-linker=hoisted

- name: Package VSIX
  working-directory: packages/extension
  run: pnpm dlx @vscode/vsce@3.0.0 package

# 修复后
- name: Package VSIX
  run: pnpm run package
```

这样 `vsce package` 触发 `vscode:prepublish` 时，所有 devDependencies（含 turbo）仍然可用。

---

## 问题 2：本地打包 — @vscode/vsce 模块找不到

### 现象

```
Error: Cannot find module 'C:\...\packages\extension\node_modules\@vscode\vsce\vsce'
```

### 根因

根目录 `package.json` 的 `package` 脚本使用了 `pnpm exec vsce package`，但 `@vscode/vsce` 未作为依赖安装，仅在 CI 中通过 `pnpm dlx` 一次性调用。

### 修复

将 `@vscode/vsce` 加入根目录 `devDependencies`：

```bash
pnpm add -D -w @vscode/vsce@3.0.0
```

```json
// package.json
{
  "devDependencies": {
    "@vscode/vsce": "3.0.0",
    "turbo": "^2.5.0",
    "typescript": "^5.6.3"
  }
}
```

---

## 问题 3：本地打包 — npm 大量 missing dependency 警告导致失败

### 现象

`vsce package` 内部使用 npm 检查依赖树时，输出数百条 `npm error missing:` 警告并以 exit code 1 退出。

```
npm error missing: typedoc@^0.28.5, required by @isaacs/balanced-match@4.0.1
npm error missing: tap@^7.0.1, required by once@1.4.0
... (数百条)
```

### 根因

vsce 默认会运行 `npm ls` 验证 `node_modules` 完整性。pnpm 的 `.pnpm` 虚拟存储结构与 npm 的 `node_modules` 扁平结构不同，npm 无法正确解析 pnpm 管理的依赖树，误报大量缺失。

### 修复

使用 `--no-dependencies` 参数跳过依赖验证：

```bash
pnpm exec vsce package --no-dependencies
```

> **注意**：此参数仅跳过 npm 依赖检查，不影响 VSIX 内容。扩展运行时的依赖打包由 `.vscodeignore` 和实际 `node_modules` 内容决定。

---

## 修复后的完整打包流程

### 本地打包

```bash
# 1. 安装依赖（首次或依赖变更后）
pnpm install

# 2. 打包
pnpm run prepackage                                    # 复制 README/icon 等资源
cd packages/extension && pnpm exec vsce package --no-dependencies
```

### GitHub Actions CI

```yaml
- name: Install dependencies
  run: HUSKY=0 pnpm install --frozen-lockfile

- name: Build packages
  run: pnpm turbo run build

- name: Copy assets for packaging
  run: node scripts/copy-assets.js

- name: Package VSIX
  run: pnpm run package
```

---

## 经验总结

| 要点 | 说明 |
|------|------|
| 不要在打包前裁剪 devDependencies | `vscode:prepublish` 会触发完整构建，需要 turbo 等构建工具 |
| pnpm 项目使用 vsce 需加 `--no-dependencies` | pnpm 虚拟存储与 npm 依赖检查不兼容 |
| 构建工具应作为显式依赖安装 | `@vscode/vsce` 应在 `devDependencies` 中声明，而非依赖 `pnpm dlx` |
| CI 与本地打包路径应保持一致 | 统一从根目录 `pnpm run package` 入口打包 |
