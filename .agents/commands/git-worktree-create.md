---
command: git-worktree-create
description: 基于当前或指定分支创建 Git Worktree，自动生成规范化的分支名和目录结构
tags:
  - git
  - worktree
---

# Git Worktree Create

## 用途

快速创建 Git Worktree 进行并行开发。自动在仓库同级目录下创建规范命名的 worktree 目录，并生成包含功能描述和时间戳的分支名，便于多任务并行开发。

## 指令内容

你是一个 Git Worktree 管理助手，负责创建规范化的 worktree 工作目录。

## 输入参数

- **功能名称**（必填）：本次开发的功能描述，如 `user-login`、`fix-bug-123`（使用 kebab-case）
- **基准分支**（可选）：从哪个分支创建 worktree，默认为当前分支

## 任务

### 1. 获取项目信息

获取当前 Git 仓库的根目录和项目名称：

```bash
# 获取仓库根目录
git rev-parse --show-toplevel

# 项目名称为仓库根目录的最后一级目录名
```

### 2. 确定基准分支

```bash
# 如果用户未指定基准分支，获取当前分支
git branch --show-current
```

如果当前处于 detached HEAD 状态，提示用户必须指定基准分支。

### 3. 生成规范化名称

#### 3.1 生成时间戳

格式：`YYMMDDHHmm`（年月日时分）

```bash
date +"%y%m%d%H%M"
```

#### 3.2 生成分支名

格式：`<功能名称>-<时间戳>`

示例：`user-login-2602051430`

#### 3.3 生成 worktree 目录路径

格式：`<仓库同级目录>/worktree-<项目名称>/<分支名>`

示例：若项目为 `cde-base`，则路径为 `../worktree-cde-base/user-login-2602051430`

### 4. 验证目录状态

```bash
# 检查目标目录是否已存在
ls -la <目标目录路径>
```

如果目录已存在，提示用户并询问是否使用其他名称。

### 5. 创建 Worktree

```bash
# 创建父目录（如果不存在）
mkdir -p ../worktree-<项目名称>

# 创建 worktree 并同时创建新分支
git worktree add <目标目录路径> -b <分支名> <基准分支>
```

### 6. 验证创建结果

```bash
# 列出所有 worktree
git worktree list
```

确认新 worktree 已正确创建。

## 约束

- 功能名称必须使用 kebab-case（小写字母和连字符）
- 不允许在 worktree 目录内再创建 worktree
- 每个 worktree 绑定唯一分支，不得在 worktree 内切换分支
- worktree 目录固定创建在仓库同级目录下的 `worktree-<项目名>` 文件夹中

## 输出格式

```
📋 Worktree 创建摘要
-------------------
项目名称: <项目名称>
基准分支: <基准分支>
新分支名: <分支名>

📂 目录信息
-------------------
Worktree 路径: <完整路径>
相对路径: <相对路径>

✅ 操作结果
-------------------
- [x] 新分支已创建: <分支名>
- [x] Worktree 已创建: <目录路径>

🚀 下一步
-------------------
1. 进入 worktree 目录开发:
   cd <相对路径>

2. 开发完成后，使用 /git-worktree-finish 命令合并并清理
```

## 注意事项

- 每个 worktree 需要独立安装依赖（node_modules 不共享）
- 定期将基准分支的更新合并到功能分支，避免冲突
- 如果遇到 "already checked out" 错误，说明该分支已被其他 worktree 使用
