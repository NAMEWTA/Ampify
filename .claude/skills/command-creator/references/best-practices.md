# Command 设计最佳实践

## 命名约定

### 文件名
- 使用 **kebab-case**：`git-release.md`、`generate-report.md`
- 动词优先：以动作开头（如 `create-`、`update-`、`sync-`）
- 简洁明了：3-4 个单词以内

### command 字段
- 与文件名一致（不含 `.md` 后缀）
- 示例：`npm-git-commit-push`、`deploy-staging`

### tags 选择
常用标签分类：
- **技术栈**：`frontend`、`backend`、`devops`、`database`
- **工具**：`git`、`npm`、`docker`、`kubernetes`
- **操作类型**：`release`、`deploy`、`migrate`、`cleanup`

## 步骤设计原则

### 原子化（Atomic）
每个步骤只完成一个独立任务：

```markdown
❌ 错误示例：
### 1. 处理版本发布
获取标签、生成日志、更新文件、提交推送

✅ 正确示例：
### 1. 获取最近标签
### 2. 读取提交日志
### 3. 更新版本文件
### 4. 提交并推送
```

### 可验证（Verifiable）
每个步骤应有明确的成功/失败判断：

```markdown
### 3. 检查远程分支状态

```bash
git fetch origin
git status
```

如果显示 "Your branch is behind"，需先执行 `git pull`。
```

### 有回退（Recoverable）
关键操作提供回退策略：

```markdown
### 5. 执行数据库迁移

```bash
python manage.py migrate
```

**回退方案**：如果迁移失败，执行 `python manage.py migrate <app> <previous_migration>` 回滚。
```

## 输入参数设计

### 必填 vs 可选
- 核心功能必需的参数标记为 **必填**
- 有合理默认值的参数标记为 **可选**

### 参数格式
```markdown
## 输入参数

- **版本号**（必填）：语义化版本，如 `1.5.0`
- **环境**（可选）：部署环境，默认 `staging`，可选 `production`
- **跳过测试**（可选）：布尔值，默认 `false`
```

### 参数验证
在任务步骤中加入验证：

```markdown
### 1. 验证输入参数

检查版本号格式是否符合 SemVer 规范（`X.Y.Z`）。
如果格式错误，提示用户并终止执行。
```

## 输出格式规范

### Emoji 使用指南
| Emoji | 用途 |
|-------|------|
| 📋 | 摘要、概览 |
| 📝 | 详情、文件列表 |
| ✅ | 成功、已完成 |
| ❌ | 失败、错误 |
| ⚠️ | 警告、注意 |
| 🔄 | 进行中、同步 |
| 🚀 | 发布、部署 |

### Checklist 格式
```markdown
✅ 操作结果
-----------
- [x] 文档已更新
- [x] 已提交: abc1234
- [x] 已推送到远程
- [ ] 待人工审核
```

### 结构化输出模板
```markdown
📋 变更摘要
-----------
从 v1.4.0 到 HEAD 共 12 个提交

### Added
- 新增用户导出功能
- 新增批量删除 API

### Fixed
- 修复登录超时问题

📝 待更新文件
-----------
- package.json (1.4.0 → 1.5.0)
- CHANGELOG.md (新增 1.5.0 条目)

✅ 操作结果
-----------
- [x] 文档已更新
- [x] 已提交: abc1234
- [x] 已创建标签: v1.5.0
```

## 约束条件编写

### 明确边界
```markdown
## 约束

- 仅更新以下文件：package.json、CHANGELOG.md、README.md
- 不修改 src/ 目录下的源代码
- 不执行任何破坏性操作（如 `git push --force`）
```

### 引用外部规范
```markdown
## 约束

- 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 遵循 [Semantic Versioning](https://semver.org/) 语义化版本
- 遵循项目 [CONTRIBUTING.md](../../CONTRIBUTING.md) 贡献指南
```

## 常见模式

### Git 操作类
```markdown
## 任务

### 1. 检查工作目录状态
确保无未提交的更改。

### 2. 获取远程更新
同步远程分支状态。

### 3. 执行核心操作
<具体 Git 操作>

### 4. 推送变更
将本地变更同步到远程。
```

### 文件处理类
```markdown
## 任务

### 1. 扫描目标文件
识别需要处理的文件列表。

### 2. 备份原文件
创建处理前的备份。

### 3. 执行转换/处理
<具体处理逻辑>

### 4. 验证输出结果
检查处理后的文件是否正确。
```

### API 调用类
```markdown
## 任务

### 1. 验证认证信息
检查 API Key 或 Token 是否有效。

### 2. 构建请求参数
根据输入组装 API 请求。

### 3. 发送请求
调用目标 API。

### 4. 处理响应
解析并格式化 API 返回结果。
```

## 反模式（避免）

### ❌ 模糊的步骤描述
```markdown
### 1. 处理文件
对文件进行必要的处理。
```

### ✅ 明确的步骤描述
```markdown
### 1. 提取 PDF 中的文本内容
使用 pdfplumber 读取 PDF 文件，提取所有页面的文本内容。
```

### ❌ 缺少错误处理
```markdown
### 3. 推送到远程
git push origin main
```

### ✅ 包含错误处理
```markdown
### 3. 推送到远程

```bash
git push origin main
```

如果推送失败（如远程有冲突），先执行 `git pull --rebase` 后重试。
```

### ❌ 过于冗长的单步骤
一个步骤包含 10+ 行操作

### ✅ 拆分为多个原子步骤
每个步骤 3-5 行，职责单一
