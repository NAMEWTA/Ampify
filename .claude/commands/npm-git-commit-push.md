---
command: npm-git-commit-push
description: 全自动版本发布：自动确定版本号、提交未提交变更、更新文档、生成 notes 知识库记录、推送并创建标签（零交互）
tags:
  - frontend
  - pnpm
  - git
---

# Git Commit & Push（全自动零交互）

## 用途

全自动版本发布流程，**无需任何用户确认**。自动完成：检测未提交变更并提交、确定新版本号（minor +1）、收集变更日志、更新文档、生成 `notes/` 知识库记录文件、提交推送、创建并推送标签。

## 指令内容

你是一个专业的版本发布助手。执行此命令时**不得询问任何问题、不得等待用户确认**，全程自动完成所有步骤。

## 核心原则

- **零交互**：整个流程不得弹出任何确认、选择或输入提示
- **自动版本**：基于最新 tag 自动计算新版本号（minor +1，如 v1.5.0 → v1.6.0）
- **自动提交**：如有未提交的代码变更，先用 Conventional Commits 格式自动提交
- **自动检测远程**：通过 `git remote -v` 获取实际远程名称，不硬编码 `origin`

## 任务（按顺序自动执行，不得中断）

### 1. 处理未提交变更

检查工作区状态：

```bash
git status --short
```

**如果有未提交的改动**，执行以下步骤：
1. 运行 `git diff --stat` 和 `git diff` 查看变更内容
2. 根据变更内容生成符合 Conventional Commits 规范的提交信息
3. 自动提交：

```bash
git add .
git commit -m "<自动生成的 commit message>"
```

提交信息规则：
- 功能新增：`feat(<scope>): <描述>`
- Bug 修复：`fix(<scope>): <描述>`
- 重构：`refactor(<scope>): <描述>`
- 多种类型混合时，选择最主要的类型，其余写在 body 中

### 2. 获取最近标签并计算新版本

```bash
git describe --tags --abbrev=0
```

如果没有标签，则使用 `v0.0.0` 作为基准。

**版本计算规则**：在最新标签的 minor 版本上 +1，patch 归零。
- 例：`v1.5.0` → `v1.6.0`
- 例：`v2.3.1` → `v2.4.0`
- 例：`v0.0.0`（无标签）→ `v0.1.0`

### 3. 读取 Commit 日志

```bash
git log <last-tag>..HEAD --pretty=format:"%h %s" --date=short
```

### 4. 归类变更

| Commit 前缀 | 归类 |
|-------------|------|
| `feat:` / `feat(...):`| Added |
| `fix:` / `fix(...):` | Fixed |
| `refactor:` / `perf:` | Changed |
| `docs:` | Changed |
| `BREAKING CHANGE` | Changed |
| `revert:` | Removed |
| 其他 | Changed |

### 5. 更新文档（四个文件）

### 5.1 更新 package.json

将 `packages/extension/package.json` 的 `version` 字段更新为新版本号。

#### 5.2 更新 CHANGELOG.md

在文件顶部（`# Change Log` 之后）插入新版本条目：

```markdown
## <新版本号> - <当前日期 YYYY-MM-DD>
### Added
- <feat 类型的变更>

### Changed
- <refactor/docs/perf 类型的变更>

### Fixed
- <fix 类型的变更>

### Removed
- <revert 类型的变更>
```

注意：仅输出有内容的分类，空分类不输出。

#### 5.3 更新 README.md

如果有功能性变更（`feat:` 或 `BREAKING CHANGE`），更新 README.md 中的：
- Features / 功能 章节
- Usage / 使用方法 章节

保持中英双语结构一致。如无功能性变更则跳过。

#### 5.4 更新 AGENTS.md

如果有架构或模块变更，同步更新 AGENTS.md 中的：
- 项目概述（核心能力列表）
- 项目结构（目录树）
- 命令与快捷键
- 相关模块说明

如无架构变更则跳过。

#### 5.5 生成 notes 知识库记录

在项目根目录的 `notes/` 目录下生成一份**完整的版本变更知识库文件**。

**目录创建**：如果 `notes/` 目录不存在，自动创建。

**文件命名规则**：`<YYYY-MM-DD>-<功能摘要>.md`
- 日期部分：当前日期，格式 `YYYY-MM-DD`
- 功能摘要部分：根据本次变更的主要内容，用 kebab-case 生成 2~5 个单词的简短描述
- 例：`2026-02-07-add-notes-generation.md`、`2026-02-07-fix-proxy-auth-bug.md`

**文件内容结构**：

```markdown
---
title: "<本次版本的主要变更标题>"
description: "<一句话概述本次发布的核心内容>"
version: "<新版本号>"
date: <YYYY-MM-DD>
tags:
  - <根据变更内容自动生成 1~3 个标签>
---

# <本次版本的主要变更标题>

> 版本：v<新版本号> | 日期：<YYYY-MM-DD> | 标签上一版本：v<上一版本号>

## 概述

<用 2~3 句话概述本次发布的核心变更内容和目的>

## 变更详情

### 新增功能（Added）

- **<功能名>**：<详细描述该功能的用途、实现方式和影响范围>
  - 涉及文件：`<file1>`, `<file2>`, ...

<对每个 feat 提交展开描述，如无则省略该节>

### 变更优化（Changed）

- **<变更项>**：<详细描述变更内容、原因和影响>
  - 涉及文件：`<file1>`, `<file2>`, ...

<对每个 refactor/perf/docs 提交展开描述，如无则省略该节>

### 问题修复（Fixed）

- **<修复项>**：<详细描述问题现象、根因和修复方式>
  - 涉及文件：`<file1>`, `<file2>`, ...

<对每个 fix 提交展开描述，如无则省略该节>

### 移除项（Removed）

- **<移除项>**：<详细描述移除原因和迁移方案>

<对每个 revert 提交展开描述，如无则省略该节>

## 影响范围

- **涉及模块**：<列出受影响的模块/目录>
- **配置变更**：<如有配置项变化则描述，否则写"无">
- **破坏性变更**：<如有 BREAKING CHANGE 则描述，否则写"无">

## 提交记录

| Hash | 类型 | 描述 |
|------|------|------|
| `<hash>` | feat | <描述> |
| `<hash>` | fix | <描述> |
| ... | ... | ... |
```

**内容生成规则**：
1. 通过 `git log <last-tag>..HEAD --pretty=format:"%h %s" --name-only` 获取每个提交的变更文件列表
2. 通过 `git diff <last-tag>..HEAD --stat` 获取整体变更统计
3. 对每个提交进行展开描述，不得仅复制 commit message，要结合变更文件和 diff 内容生成有意义的说明
4. tags 根据变更内容自动选取，常用标签：`feature`、`bugfix`、`refactor`、`performance`、`docs`、`breaking-change`、`ui`、`api`、`config`

### 6. 提交发布

```bash
git add CHANGELOG.md README.md AGENTS.md packages/extension/package.json notes/
git commit -m "chore(release): v<新版本号>"
```

### 7. 推送到远程

先检测远程名称：

```bash
git remote -v
```

使用检测到的远程名（如 `github`、`origin` 等）推送：

```bash
git push
```

### 8. 创建并推送标签

```bash
git tag v<新版本号>
git push <remote-name> v<新版本号>
```

## 约束

- **全程零交互**，不得询问用户任何问题
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 遵循 [Semantic Versioning](https://semver.org/) 语义化版本
- 保持 README.md 中英双语结构一致
- 更新指定文件：CHANGELOG.md、README.md、AGENTS.md、packages/extension/package.json，以及 `notes/` 目录下的知识库记录
- `notes/` 知识库文件内容必须详实，不得仅复制 commit message，需结合 diff 生成有意义的描述
- 远程名称必须通过 `git remote -v` 动态获取，不得硬编码

## 输出格式

全部步骤完成后，输出一次性汇总：

```
📋 变更摘要
-----------
从 v<上一版本> 到 v<新版本> 共 <N> 个提交

### Added
- <变更列表>

### Changed
- <变更列表>

### Fixed
- <变更列表>

📝 已更新文件
-----------
- packages/extension/package.json (版本: <旧版本> → <新版本>)
- CHANGELOG.md (新增 <新版本> 条目)
- README.md (更新功能说明 / 无变更)
- AGENTS.md (更新模块说明 / 无变更)
- notes/<文件名>.md (版本知识库记录)

✅ 操作结果
-----------
- [x] 未提交变更已提交: <commit hash>（如有）
- [x] 文档已更新
- [x] 知识库记录已生成: notes/<文件名>.md
- [x] 发布已提交: <commit hash>
- [x] 已推送到远程: <remote-name>
- [x] 已创建标签: v<新版本号>
- [x] 标签已推送
```

## 注意事项

- 如果没有标签，将从第一次提交开始收集变更，版本从 v0.1.0 起
- 如果远程分支有冲突，自动尝试 `git pull --rebase` 后重新推送
- 如果 `git push` 失败，报告错误但不回滚已创建的本地标签
- `notes/` 目录首次使用时自动创建，后续持续追加，形成完整知识库
- notes 文件命名中同一天有多次发布时，通过功能摘要部分区分（不会覆盖）
- notes 文件内容应详实完整，适合后续回溯查阅，不得仅复制 commit message
