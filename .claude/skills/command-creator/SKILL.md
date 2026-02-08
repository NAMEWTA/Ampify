---
name: command-creator
description: 创建 Claude Agent Commands（自动化命令）的专用指南。帮助生成符合规范的 `.md` 命令文件，包含正确的 YAML frontmatter、标准化章节结构（用途、输入参数、任务步骤、约束、输出格式）。当用户提到"创建 command / agent 命令 / 新建自动化命令 / 制作命令模板 / 编写 Claude 命令"时使用。
tags:
  - creator
---

# Command Creator

帮助创建符合规范的 Claude Agent Commands。

## Commands 与 Skills 的区别

| 维度 | Commands | Skills |
|------|----------|--------|
| **定位** | 特定任务的执行指令 | 领域知识与能力扩展 |
| **触发方式** | 用户显式调用（`/command-name`） | 语义自动匹配 |
| **文件位置** | `.agents/commands/*.md` | `.agents/skills/<name>/SKILL.md` |
| **结构** | 单文件、线性步骤 | 可多层嵌套（含子资源） |

## Command 结构规范

### YAML Frontmatter（必填）

```yaml
---
command: <command-name>       # kebab-case，如 git-release
description: <一句话描述功能>   # 简洁明了
tags:                          # 可选，分类标签
  - <tag1>
  - <tag2>
---
```

### Markdown Body 标准章节

| 章节 | 必填 | 说明 |
|------|------|------|
| `# 标题` | ✅ | 与 command 名对应 |
| `## 用途` | ✅ | 核心目的和应用场景 |
| `## 指令内容` | ✅ | 定义 Claude 角色 |
| `## 输入参数` | ⚠️ | 有参数时必填 |
| `## 任务` | ✅ | 编号步骤，每步原子化 |
| `## 约束` | ⚠️ | 有限制条件时必填 |
| `## 输出格式` | ⚠️ | 需结构化输出时必填 |
| `## 注意事项` | ⚠️ | 有异常处理时必填 |

## 快速开始

### 方式一：使用初始化脚本

```bash
python3 .agents/skills/command-creator/scripts/init_command.py <command-name>
```

生成 `.agents/commands/<command-name>.md` 模板文件。

### 方式二：手动创建

直接在 `.agents/commands/` 下创建 `.md` 文件，参照 [command-template.md](references/command-template.md) 填充内容。

## 设计指南

详细的设计模式和最佳实践，参见 [best-practices.md](references/best-practices.md)。

核心原则：
- **命名**：kebab-case，动词优先（如 `git-release`、`generate-report`）
- **步骤**：原子化、可验证、有回退策略
- **输出**：结构化、使用 emoji 和 checklist 增强可读性
