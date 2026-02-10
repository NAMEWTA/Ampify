---
name: vscode-api
description:
  当用户询问 VS Code API 的定义、methods、interfaces、events、types，或希望了解可用的 VS Code APIs 时使用。
  触发场景包括类似 “what does vscode.X do”、“how to use VS Code API”、“VS Code type definition”，或检查 API compatibility 的问题。
version: 1.0.0
tags:
  - vscode
---

# VS Code API Lookup

此技能用于从官方的 TypeScript declaration files 和 documentation 中查找 VS Code API definitions。

## Sources

### 1. TypeScript Definitions (vscode.d.ts)

VS Code API 的 type definitions 来自官方仓库：

- **Local vscode.d.ts**:
  `./vscode.d.ts`

- **Latest (main branch)**:
  `https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts`

- **Current version (matching project's @types/vscode)**: 
  `https://raw.githubusercontent.com/microsoft/vscode/{version}/src/vscode-dts/vscode.d.ts`


### 2. VS Code API Documentation Website

官方 documentation 位于 `https://code.visualstudio.com/api`，提供更丰富的上下文，包括 screenshots、examples 和 guides。请从 overview pages 开始，并按需导航到子页面：

| Section                | Entry Point                                      | Use For                                                      |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| UX Guidelines          | `/api/ux-guidelines/overview`                    | UI/UX best practices, visual patterns                        |
| Extension Capabilities | `/api/extension-capabilities/overview`           | Common capabilities, extending workbench                     |
| Extension Guides       | `/api/extension-guides/overview`                 | Implementation guides (tree views, webviews, commands, etc.) |
| Language Extensions    | `/api/language-extensions/overview`              | LSP, syntax highlighting, language features                  |
| References             | `/api/references/vscode-api`                     | API docs, contribution points, activation events             |
| Testing & Publishing   | `/api/working-with-extensions/testing-extension` | Testing strategies, bundling                                 |
| Advanced Topics        | `/api/advanced-topics/extension-host`            | Extension host, remote development                           |

## Process

### 1. Determine the Project's VS Code Version

读取项目的 `package.json` 以找到 `@types/vscode` 版本：

```bash
grep -A1 '"@types/vscode"' package.json
```

版本一般类似 `"^1.96.0"` —— 提取其基础版本号（例如 `1.96.0`）。

### 2. Choose the Right Source

**在以下场景使用 vscode.d.ts：**

- 查找准确的 type signatures、interfaces 或 method definitions
- 检查特定 VS Code versions 的 API compatibility
- 理解 parameter types 和 return values

**在以下场景使用 documentation website：**

- 理解 UI/UX best practices 和 visual guidelines
- 查找 implementation examples 和 patterns
- 理解不同 APIs 如何协同工作
- 评估 views、notifications 等 UI elements 的设计决策
- 了解 Language Server Protocol 或 language features

**在以下场景同时使用两者：**

- 实现涉及 UI/UX 决策的新功能
- 需要同时获得 type signature 以及 usage context/examples

### 3. Fetch API Definitions (vscode.d.ts)

使用 WebFetch 获取 vscode.d.ts 文件：

**项目当前版本：**

```
https://raw.githubusercontent.com/microsoft/vscode/{version}/src/vscode-dts/vscode.d.ts
```

**最新 main branch：**

```
https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts
```

### 4. Fetch Documentation Pages

从顶层 section pages 开始，并按需探索子页面。此方式通常能随 documentation 更新保持最新。

**Top-level entry points：**

```
https://code.visualstudio.com/api/ux-guidelines/overview
https://code.visualstudio.com/api/extension-capabilities/overview
https://code.visualstudio.com/api/extension-guides/overview
https://code.visualstudio.com/api/language-extensions/overview
https://code.visualstudio.com/api/references/vscode-api
https://code.visualstudio.com/api/working-with-extensions/testing-extension
https://code.visualstudio.com/api/advanced-topics/extension-host
```

**Navigation strategy：**

1. 先获取相关的 overview page
2. 在页面内容中寻找子页面链接
3. 基于用户问题获取具体子页面
4. 这样可确保始终获取最新内容，即使某些 section 快速演进（例如 AI extensibility）

### 5. Search for Specific APIs

当用户询问特定 API（例如 `TreeView`、`workspace.onDidChangeConfiguration`）时：

1. 获取 vscode.d.ts 以查找 type definitions
2. 搜索相关的 interface、class、function 或 type
3. 提取 definition，并包含 JSDoc comments 作为上下文
4. 如需 implementation guidance，同步获取相关 documentation page
5. 同时呈现 API signature 与 contextual documentation

### 6. Compare Versions (Optional)

当用户希望检查 API changes 或 new features 时：

1. 获取当前版本和 main branch 的 definitions
2. 对比特定 API 或搜索新增内容
3. 标注 differences、deprecations 或 new additions

## Output Format

### Type Definitions Only

当展示来自 vscode.d.ts 的 API definitions 时：

```typescript
// From vscode.d.ts (version X.X.X)

/**
 * [JSDoc description from the file]
 */
interface/class/function ApiName {
  // ... relevant members
}
```

### Combined Type + Documentation

当同时呈现 type definitions 与 documentation context 时：

```
## API: [name]

### Type Definition
[TypeScript definition from vscode.d.ts]

### Documentation
[Summary from code.visualstudio.com/api]

### Key Points
- [Important usage notes]
- [Best practices from UX guidelines if applicable]
- [Related APIs or patterns]
```

### Version Comparison

当进行版本对比时，展示两者并附带变更总结：

```
## API: [name]

### Current (v1.96.0)
[definition]

### Latest (main)
[definition]

### Changes
- [list of differences]
```

## Common Lookup Patterns

- **Interfaces**: `TreeDataProvider`, `TextDocument`, `Uri`, `Position`, `Range`
- **Namespaces**: `vscode.window`, `vscode.workspace`, `vscode.commands`
- **Events**: `onDid*` patterns like `onDidChangeConfiguration`
- **Disposables**: Classes implementing `Disposable`
- **Enums**: `TreeItemCollapsibleState`, `DiagnosticSeverity`

## Tips

### vscode.d.ts

- vscode.d.ts 文件较大（~15,000+ lines）—— 始终针对具体 APIs 搜索，而不是通读整个文件
- 文件中的 JSDoc comments 提供了有价值的 usage guidance
- Deprecated APIs 会标注 `@deprecated` tags
- 部分 APIs 为 proposed/experimental，可能尚未进入稳定版本

### Documentation Website

- 从 overview pages 开始并按需导航到子页面 —— 可避免过时的 hardcoded URLs
- UX guidelines 包含 recommended patterns 的 screenshots —— 可用于 UI 决策参考
- Extension guides 提供完整 working examples，而不仅是 type signatures
- 该 documentation site 会随 VS Code releases 更新，可能包含尚未进入稳定版的功能
- 如不确定应如何实现（不仅是 API 是什么），请查阅 guides
- 某些 section 演进较快（例如 AI extensibility）—— 始终获取最新内容，而非假设结构
