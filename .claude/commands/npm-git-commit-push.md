---
command: npm-git-commit-push
description: 读取最近标签到当前的所有 Git 变更，更新版本号与文档，提交推送并创建标签
tags:
  - frontend
  - npm
  - git
---

# Git Commit & Push

## 用途

自动化版本发布流程：收集从最近 Git 标签到当前 HEAD 的所有变更，更新版本号与文档（CHANGELOG.md、README.md、AGENTS.md、package.json），生成提交信息，执行提交推送，并自动创建版本标签。

## 指令内容

你是一个专业的版本发布助手，负责自动化项目的版本发布流程。

## 输入参数

- **新版本号**（必填）：语义化版本号，如 `1.5.0`

## 任务

### 1. 获取最近标签

```bash
git describe --tags --abbrev=0
```

如果没有标签，则使用第一次提交作为起点：

```bash
git rev-list --max-parents=0 HEAD
```

### 2. 读取 Commit 日志

获取从最近标签到 HEAD 的所有提交：

```bash
git log <last-tag>..HEAD --pretty=format:"%h %s" --date=short
```

### 3. 归类变更

根据 Conventional Commits 规范，将提交按类型归类：

| Commit 前缀 | 归类 |
|-------------|------|
| `feat:` / `feat(...):`| Added |
| `fix:` / `fix(...):` | Fixed |
| `refactor:` / `perf:` | Changed |
| `docs:` | Changed |
| `BREAKING CHANGE` | Changed |
| `revert:` | Removed |
| 其他 | Changed |

### 4. 更新文档

#### 4.1 更新 package.json

将 `version` 字段更新为新版本号。

#### 4.2 更新 CHANGELOG.md

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

#### 4.3 更新 README.md

如果有功能性变更（`feat:` 或 `BREAKING CHANGE`），根据变更内容更新 README.md 中的：

- Features / 功能 章节
- Usage / 使用方法 章节

保持中英双语结构一致。

#### 4.4 更新 AGENTS.md

如果有架构或模块变更，同步更新 AGENTS.md 中的：

- 项目结构
- 命令与快捷键
- 相关模块说明

### 5. 生成提交信息

遵循 Conventional Commits 规范：

```
chore(release): v<新版本号>

- 更新 CHANGELOG.md
- 更新 README.md
- 更新 AGENTS.md
- 更新 package.json 版本号
```

### 6. 执行提交推送

```bash
git add CHANGELOG.md README.md AGENTS.md package.json
git commit -m "chore(release): v<新版本号>"
git push
```

### 7. 创建并推送标签

```bash
git tag v<新版本号>
git push origin v<新版本号>
```

## 约束

- 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 遵循 [Semantic Versioning](https://semver.org/) 语义化版本
- 保持 README.md 中英双语结构一致
- 仅更新指定的四个文件：CHANGELOG.md、README.md、AGENTS.md、package.json

## 输出格式

```
📋 变更摘要
-----------
从 v<上一版本> 到 HEAD 共 <N> 个提交

### Added
- <变更列表>

### Changed
- <变更列表>

### Fixed
- <变更列表>

📝 待更新文件
-----------
- package.json (版本: <旧版本> → <新版本>)
- CHANGELOG.md (新增 <新版本> 条目)
- README.md (更新功能说明)
- AGENTS.md (更新模块说明)

✅ 操作结果
-----------
- [x] 文档已更新
- [x] 已提交: <commit hash>
- [x] 已推送到远程
- [x] 已创建标签: v<新版本号>
- [x] 标签已推送
```

## 注意事项

- 如果没有标签，将从第一次提交开始收集变更
- 执行前确保工作目录干净（无未提交的更改）
- 确保已配置远程仓库且有推送权限
- 如果远程分支有冲突，需要先解决冲突再执行
