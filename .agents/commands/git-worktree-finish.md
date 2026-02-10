---
command: git-worktree-finish
description: 将已完成的 Worktree 分支合并到原分支，并彻底清理 Worktree 残留
tags:
  - git
  - worktree
---

# Git Worktree Finish

## 用途

完成 Worktree 开发后的收尾工作：将功能分支合并到原分支（可选），然后彻底清理 worktree 目录和相关分支，保持仓库整洁。

## 指令内容

你是一个 Git Worktree 管理助手，负责安全地合并和清理已完成开发的 worktree。

## 输入参数

- **Worktree 路径或分支名**（必填）：要清理的 worktree 路径或其关联的分支名
- **目标分支**（可选）：合并到的目标分支，默认为创建 worktree 时的基准分支
- **是否合并**（可选）：是否执行合并操作，默认 `true`。设为 `false` 则仅清理不合并
- **是否删除远程分支**（可选）：合并后是否删除远程分支，默认 `false`

## 任务

### 1. 定位 Worktree 信息

```bash
# 列出所有 worktree 及其关联分支
git worktree list --porcelain
```

根据用户输入（路径或分支名）确定目标 worktree：
- 如果输入是路径，直接匹配
- 如果输入是分支名，查找关联该分支的 worktree

### 2. 验证 Worktree 状态

```bash
# 进入 worktree 目录检查状态
cd <worktree-path>
git status
```

检查项：

| 状态 | 处理方式 |
|------|----------|
| 有未提交的更改 | 提示用户先提交或暂存，终止操作 |
| 有未推送的提交 | 警告用户，询问是否继续 |
| 干净状态 | 继续执行 |

### 3. 确定目标分支

如果用户未指定目标分支，尝试自动识别：

```bash
# 获取分支的上游（tracking）分支
git rev-parse --abbrev-ref <branch>@{upstream}

# 或获取分支的起点（需要 reflog）
git reflog show <branch> --pretty=format:"%gs" | grep "branch:" | head -1
```

如果无法自动识别，提示用户指定目标分支。

### 4. 执行合并（可选）

如果用户选择合并：

```bash
# 回到主仓库
cd <主仓库路径>

# 切换到目标分支
git checkout <目标分支>

# 拉取最新代码
git pull origin <目标分支>

# 合并功能分支
git merge <功能分支> --no-ff -m "Merge branch '<功能分支>' into <目标分支>"
```

合并冲突处理：

| 情况 | 处理方式 |
|------|----------|
| 合并成功 | 继续清理流程 |
| 有冲突 | 中止操作，提示用户手动解决冲突后重新执行 |

### 5. 推送合并结果

```bash
# 推送合并后的目标分支
git push origin <目标分支>
```

### 6. 清理 Worktree

```bash
# 回到主仓库（确保不在 worktree 目录内）
cd <主仓库路径>

# 删除 worktree
git worktree remove <worktree-path> --force
```

如果删除失败，尝试强制清理：

```bash
# 先解锁（如果被锁定）
git worktree unlock <worktree-path>

# 再删除
git worktree remove <worktree-path> --force

# 清理残留记录
git worktree prune
```

### 7. 清理本地分支

```bash
# 删除本地功能分支
git branch -d <功能分支>
```

如果分支未完全合并，会提示警告。此时询问用户是否强制删除（`-D`）。

### 8. 清理远程分支（可选）

如果用户选择删除远程分支：

```bash
# 删除远程分支
git push origin --delete <功能分支>
```

### 9. 清理空目录

```bash
# 检查 worktree 父目录是否为空
ls ../worktree-<项目名>/

# 如果为空，删除父目录
rmdir ../worktree-<项目名>/
```

### 10. 最终验证

```bash
# 确认 worktree 已清理
git worktree list

# 确认分支已删除
git branch -a | grep <功能分支>
```

## 约束

- 必须在主仓库（非 worktree 目录）中执行清理命令
- 不允许清理有未提交更改的 worktree（需先提交或放弃）
- 合并操作使用 `--no-ff` 保留分支历史
- 不执行 `git push --force` 等破坏性操作

## 输出格式

```
📋 Worktree 清理摘要
-------------------
Worktree 路径: <路径>
功能分支: <分支名>
目标分支: <目标分支>

🔄 合并状态
-------------------
- [x] 已合并到 <目标分支>
- [x] 已推送到远程

🧹 清理状态
-------------------
- [x] Worktree 目录已删除
- [x] 本地分支已删除
- [ ] 远程分支保留（未删除）

✅ 操作完成
-------------------
功能分支 '<分支名>' 已成功合并到 '<目标分支>' 并完成清理。

📝 当前 Worktree 列表
-------------------
<git worktree list 输出>
```

## 注意事项

- 确保所有重要代码已提交并推送后再执行清理
- 合并前建议先在功能分支上 rebase 或 merge 目标分支的最新代码，减少冲突
- 如果只想清理不合并，设置 `是否合并` 为 `false`
- 远程分支默认保留，如需删除请明确指定
- 如果遇到 "worktree is locked" 错误，可能是因为之前的操作中断，需要先 unlock
