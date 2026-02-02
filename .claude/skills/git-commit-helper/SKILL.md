---
name: git-commit-helper
description: 通过分析 git diff 生成描述性的提交信息。当用户请求帮助编写提交信息或审查暂存的更改时使用。
version: 1.0.0
tags:
  - git
---

# Git 提交助手

## 1. 使用范围

- 生成提交信息
- 审查暂存更改
- 规范化提交格式
- 高级主题通过附录按需展开

## 2. 渐进式披露使用方式

你可以按需要触发我展开对应附录：

- 生成提交信息：说“生成提交信息”
- 审查暂存更改：说“审查暂存更改”
- 展开附录A：提交信息格式与示例
- 展开附录B：模板工作流与多文件提交
- 展开附录C：交互式提交与修改提交
- 展开附录D：分支合并规范
- 展开附录E：标签规范
- 展开附录F：Git worktree 使用指南
- 展开附录G：最佳实践
- 展开附录H：仓库结构

若需我生成提交信息，请先暂存更改并提供暂存 diff，或允许我读取 `git diff --staged` 的输出。

## 3. 主流程（最小可用）

1. 确认目标仓库
2. 审查暂存内容并提取关键变化
3. 生成一条符合约定式提交规范的提交信息
4. 给出必要的风险提醒与补充建议

## 4. 输出规范

- 提交信息一条
- 变更摘要要点 3-6 条
- 风险或遗漏提示（若有）

## 5. 提交信息检查清单

- [ ] 类型是否合适 (feat/fix/docs/etc.)
- [ ] 范围是否具体且清晰
- [ ] 摘要是否在 50 个字符以内
- [ ] 摘要是否使用了祈使语气
- [ ] 正文是否解释了“为什么”而不仅仅是“什么”
- [ ] 破坏性变更是否已清晰标记
- [ ] 是否包含了相关的 Issue 编号

## 6. 已知问题

- 未暂存的更改无法生成可靠提交信息
- 多仓库场景必须先切换到正确目录
- 未提供 diff 时仅能给出模板化建议

## 附录A：提交信息格式与示例

遵循 Conventional Commits（约定式提交）格式：

```
<类型>(<范围>): <描述>

[可选正文]

[可选脚注]
```

### 类型 (Types)

- **feat**: 新功能 (New feature)
- **fix**: Bug 修复 (Bug fix)
- **docs**: 文档变更 (Documentation changes)
- **style**: 代码风格变更（格式化，丢失分号等）
- **refactor**: 代码重构 (Code refactoring)
- **test**: 添加或更新测试
- **chore**: 维护任务

### 范围 (Scope) 示例

**前端 (Frontend):**
- `feat(ui): 仪表盘添加加载旋转器`
- `fix(form): 验证电子邮件格式`

**后端 (Backend):**
- `feat(api): 添加用户资料端点`
- `fix(db): 解决连接池泄漏`

**基础设施 (Infrastructure):**
- `chore(ci): 更新 Node 版本至 20`
- `feat(docker): 添加多阶段构建`

### 示例

**功能提交 (Feature commit):**
```
feat(auth): 添加 JWT 认证

实现基于 JWT 的认证系统，包含：
- 带令牌生成的登录端点
- 令牌验证中间件
- 刷新令牌支持
```

**Bug 修复 (Bug fix):**
```
fix(api): 处理用户资料中的空值

防止用户资料字段为空时发生崩溃。
在访问嵌套属性前添加空值检查。
```

**重构 (Refactor):**
```
refactor(database): 简化查询构建器

将通用查询模式提取为可重用函数。
减少数据库层中的代码重复。
```

### 破坏性变更 (Breaking Changes)

清晰地标明破坏性变更：

```
feat(api)!: 重构 API 响应格式

破坏性变更：所有 API 响应现在遵循 JSON:API 规范

旧格式：
{ "data": {...}, "status": "ok" }

新格式：
{ "data": {...}, "meta": {...} }

迁移指南：更新客户端代码以处理新的响应结构
```

## 附录B：模板工作流与多文件提交

### 模板工作流

1. 审查更改：`git diff --staged`
2. 识别类型：是 feat, fix, refactor 等等
3. 确定范围：代码库的哪一部分
4. 编写摘要：简短、祈使句式的描述
5. 添加正文：解释原因和影响
6. 注明破坏性变更：如果适用

### 多文件提交示例

```
refactor(core): 重构认证模块

- 将认证逻辑从控制器移动到服务层
- 将验证提取到单独的验证器中
- 更新测试以使用新结构
- 添加认证流程的集成测试

破坏性变更：Auth 服务现在需要配置对象
```

## 附录C：交互式提交与修改提交

### 交互式提交助手

```bash
# 交互式暂存更改
git add -p

# 审查已暂存内容
git diff --staged

# 提交并附带信息
git commit -m "type(scope): description"
```

### 修改提交

```bash
# 仅修改提交信息
git commit --amend

# 修改并添加更多更改
git add forgotten-file.js
git commit --amend --no-edit
```

## 附录D：分支合并规范

为确保代码历史清晰可追溯，合并分支时需遵循以下规范。

### 合并原则

1. **保留完整合并记录**
   - 使用 `--no-ff` 选项进行合并，即使可以快进合并也要创建合并提交
   - 合并提交能清晰展示分支关系，便于后续代码审查和问题追溯

2. **清晰的合并提交信息**
   - 合并提交信息应明确说明合并的分支和主要功能
   - 遵循 Conventional Commits 格式，使用 `feat` 或 `fix` 等类型
   - 在正文中列出合并的主要功能和变更点

### 合并流程

**步骤 1：切换到目标分支**
```bash
# 切换到 develop 或主分支
git checkout develop
```

**步骤 2：更新目标分支**
```bash
# 拉取最新的远程更改
git pull origin develop
```

**步骤 3：查看待合并分支的提交历史**
```bash
# 查看分支差异
git log develop..feature/your-branch --oneline

# 查看详细的提交信息
git log develop..feature/your-branch --pretty=format:"%h - %s (%an, %ar)"
```

**步骤 4：执行合并（保留完整记录）**
```bash
# 使用 --no-ff 选项合并
git merge --no-ff feature/your-branch -m "feat(scope): 合并功能分支

实现[功能名称]，包含：
- 主要功能点 1
- 主要功能点 2
- 主要功能点 3

合并自 feature/your-branch 分支"
```

**步骤 5：验证合并结果**
```bash
# 查看合并提交历史
git log --oneline --graph -5

# 查看合并统计
git diff --stat develop...feature/your-branch
```

**步骤 6：删除已合并的 feature 分支**
```bash
# 删除本地分支
git branch -d feature/your-branch

# 删除远程分支（如果已推送）
git push origin --delete feature/your-branch
```

### 合并提交信息示例

**示例 1：功能分支合并**
```
feat(statistics): 合并数据导出功能分支

实现广东数据博览会统计数据的导出功能，包含：
- 添加 MPW_KEY 环境变量并更新启动命令
- 新增报名数据导出功能
- 实现 cde-gddatafair-statistics 的 Excel 导出功能

合并自 feature/gddatafair-upload-export 分支
```

**示例 2：Bug 修复分支合并**
```
fix(auth): 合并认证模块修复分支

修复用户认证过程中的相关问题：
- 修复 JWT 令牌过期验证逻辑
- 解决并发登录导致的会话冲突
- 优化认证失败时的错误提示

合并自 feature/auth-fix 分支
```

**示例 3：重构分支合并**
```
refactor(database): 合并数据库层重构分支

优化数据库访问层架构：
- 将数据访问逻辑从控制器迁移到 Repository 层
- 实现统一的查询构建器
- 添加数据库连接池管理

合并自 feature/database-refactor 分支
```

### 合并冲突处理

如果在合并过程中遇到冲突：

```bash
# 1. 查看冲突文件
git status

# 2. 手动解决冲突
# 编辑冲突文件，选择需要保留的代码

# 3. 标记冲突已解决
git add <resolved-file>

# 4. 继续合并
git commit -m "feat(scope): 合并功能分支并解决冲突

实现[功能名称]，包含：
- 主要功能点 1
- 主要功能点 2

合并自 feature/your-branch 分支

冲突解决：解决了与 [其他功能] 的冲突"
```

### 合并后清理

**重要：合并完成后必须删除已合并的 feature 分支**

```bash
# 删除本地分支（如果已合并）
git branch -d feature/your-branch

# 如果分支未完全合并，使用 -D 强制删除（谨慎使用）
git branch -D feature/your-branch

# 删除远程分支
git push origin --delete feature/your-branch

# 清理已删除的远程分支引用
git remote prune origin
```

### 分支管理检查清单

合并分支前：
- [ ] 确认目标分支已更新到最新版本
- [ ] 查看待合并分支的提交历史
- [ ] 确认所有相关测试已通过
- [ ] 代码已通过代码审查

合并过程中：
- [ ] 使用 `--no-ff` 选项保留合并记录
- [ ] 编写清晰的合并提交信息
- [ ] 如有冲突，正确解决并记录

合并完成后：
- [ ] 验证合并结果（查看提交历史）
- [ ] 删除本地 feature 分支
- [ ] 删除远程 feature 分支（如果已推送）
- [ ] 推送合并结果到远程仓库

## 附录E：标签规范

为保证版本发布可追溯性，创建标签时必须创建带注释的标签并提供明确说明。

**强制要求：**
- 必须使用 `-a` 参数并以版本号作为标签名（例如 `v1.2.3`）
- 必须同时使用 `-m` 参数提供标签提交信息
- 如发现轻量标签或缺少说明，应先纠正再发布

**推荐示例：**

```bash
# 在当前提交上创建带注释标签，并写明标签说明
git tag -a v1.2.3 -m "release: v1.2.3"

# 或者为指定提交打标签
git tag -a v1.2.3 <commit_sha> -m "release: v1.2.3"
```

**纠正方式：**

```bash
# 删除本地错误标签
git tag -d v1.2.3

# 重新创建带注释标签并补充说明
git tag -a v1.2.3 -m "release: v1.2.3"
```

## 附录F：Git worktree 使用指南

### 基本概念

- **worktree**：在同一个 Git 仓库中同时拥有多个独立工作目录，每个工作目录可以检出不同分支或不同提交。
- **主工作区**：最初 `git clone` 产生的工作目录。
- **附加工作区**：通过 `git worktree add` 创建的额外工作目录。
- **共享对象库**：多个工作区共享同一套 Git 对象数据库，不会重复下载历史。

### 环境配置要求

1. **Git 版本**：建议使用 Git 2.5+（`git worktree` 在此版本后稳定可用）。
2. **文件系统权限**：创建 worktree 的父目录需具备写权限。
3. **目录规划**：推荐在仓库同级目录或统一的 `worktrees/` 目录集中管理。

### 常用命令

**查看与清理**

```bash
# 列出所有 worktree
git worktree list

# 检查 worktree 状态并清理无效记录
git worktree prune

# 对 worktree 进行详细检查
git worktree list --verbose
```

**创建与移除**

```bash
# 在指定路径创建新 worktree 并检出分支
git worktree add <path> <branch>

# 创建并检出新分支
git worktree add -b <new-branch> <path> <base-branch>

# 创建 worktree 但不检出分支（适合临时查看）
git worktree add --detach <path> <commit>

# 移除 worktree（先保证该工作区无未提交更改）
git worktree remove <path>
```

**分支与锁定**

```bash
# 锁定 worktree，防止误删
git worktree lock <path>

# 解锁 worktree
git worktree unlock <path>

# 查看锁定状态
git worktree list --verbose
```

### 常见参数说明

- `-b <new-branch>`：创建新分支并检出。
- `--detach`：以分离头指针方式检出提交。
- `--force`：强制创建或移除（谨慎使用）。
- `--verbose`：显示更多元数据，包括分支、锁定状态。

### 分支管理策略

1. **一工作区一分支**：同一分支不要在多个 worktree 中同时检出。
2. **功能隔离**：每个 feature 分支使用独立 worktree。
3. **短期任务优先**：临时排查、回归测试可使用 `--detach`。
4. **命名规范**：worktree 目录名称建议与分支名保持一致。

### 工作区切换流程

**场景 1：已有分支切换到新工作区**

```bash
# 在主工作区创建新 worktree
git worktree add ../worktrees/feature-auth feature/auth

# 进入新工作区
cd ../worktrees/feature-auth
```

**场景 2：新分支并行开发**

```bash
# 基于 develop 创建新分支并创建 worktree
git worktree add -b feature/auth ../worktrees/feature-auth develop

# 进入新工作区
cd ../worktrees/feature-auth
```

**场景 3：临时查看历史版本**

```bash
git worktree add --detach ../worktrees/release-2024-12 <commit_sha>
cd ../worktrees/release-2024-12
```

### 冲突解决方法

1. **避免同分支多工作区**：Git 会锁定分支，阻止重复检出。
2. **处理未提交更改**：在移除 worktree 前先 `git status` 确认无修改。
3. **重建异常 worktree**：
   - 删除已不存在的目录记录：`git worktree prune`
   - 重新创建 worktree：`git worktree add <path> <branch>`
4. **冲突排查路径**：
   - `git worktree list --verbose` 查找锁定分支与路径
   - `git branch -vv` 确认分支当前关联的 worktree

### 最佳实践建议

1. **统一目录管理**：建议集中在仓库同级目录下建立 `worktrees/` 目录。
2. **及时清理**：完成任务后先合并分支，再移除工作区并执行 `git worktree prune`。
3. **配合分支策略**：与 `feature/*`、`bugfix/*` 命名规范一致。
4. **避免直接在主工作区实验**：主工作区建议仅用于稳定分支或代码审查。
5. **配合 `git status` 习惯**：进入任何 worktree 后先检查当前分支与工作区状态。

### 注意事项

1. **不要手动删除 worktree 目录**：应使用 `git worktree remove <path>`。
2. **锁定重要 worktree**：关键分支的 worktree 建议 `git worktree lock`。
3. **磁盘与路径规划**：注意空间与路径长度限制。
4. **依赖环境隔离**：不同 worktree 的依赖与构建产物需独立管理。
5. **CI 与脚本兼容**：自动化脚本中应避免硬编码主工作区路径。

## 附录G：最佳实践

1. **原子提交**：每次提交只包含一个逻辑变更
2. **提交前测试**：确保代码可运行
3. **引用 Issue**：如果适用，包含 Issue 编号
4. **保持专注**：不要混合不相关的更改
5. **为人而写**：未来的你或他人会阅读这些内容

## 附录H：仓库结构

- `cde-standard`：当前文档所在的根仓库，默认在此执行 git 操作。
- `cde-base`：独立 git 仓库，路径位于 `cde-base/`，进行 git 操作前需先 `cd cde-base`。
- `plus-ui`：前端独立 git 仓库，路径 `plus-ui/`，需进入目录后再执行 git 操作。
- `datahub-ui`：前端独立 git 仓库，路径 `datahub-ui/`，需进入目录后再执行 git 操作。