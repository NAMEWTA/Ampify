#!/usr/bin/env python3
"""
Command Initializer - 创建新的 Claude Agent Command 模板

Usage:
    init_command.py <command-name> [--path <path>]

Examples:
    init_command.py git-release
    init_command.py deploy-staging --path /custom/commands
"""

import sys
import argparse
from pathlib import Path

COMMAND_TEMPLATE = '''---
command: {command_name}
description: [TODO: 一句话描述命令的核心功能]
tags:
  - [TODO: tag1]
  - [TODO: tag2]
---

# {command_title}

## 用途

[TODO: 描述命令的核心目的、解决什么问题、适用场景]

## 指令内容

你是一个专业的 [TODO: 领域] 助手，负责 [TODO: 核心职责]。

## 输入参数

- **[TODO: 参数名]**（必填）：[TODO: 参数说明]，如 `[TODO: 示例值]`

## 任务

### 1. [TODO: 步骤名称]

[TODO: 步骤说明]

```bash
[TODO: 具体命令]
```

### 2. [TODO: 步骤名称]

[TODO: 步骤说明]

### 3. [TODO: 步骤名称]

[TODO: 步骤说明]

## 约束

- [TODO: 约束条件1]
- [TODO: 约束条件2]

## 输出格式

```
📋 [TODO: 摘要标题]
-----------
[TODO: 摘要内容]

✅ 操作结果
-----------
- [x] [TODO: 已完成项]
- [ ] [TODO: 待完成项]
```

## 注意事项

- [TODO: 注意事项1]
- [TODO: 注意事项2]
'''


def kebab_to_title(name: str) -> str:
    """将 kebab-case 转换为 Title Case"""
    return ' '.join(word.capitalize() for word in name.split('-'))


def create_command(command_name: str, output_path: Path) -> None:
    """创建 command 文件"""
    # 确保目录存在
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 生成文件路径
    file_path = output_path / f"{command_name}.md"
    
    # 检查文件是否已存在
    if file_path.exists():
        print(f"❌ 错误：文件已存在 {file_path}")
        print("   如需覆盖，请先手动删除该文件。")
        sys.exit(1)
    
    # 生成内容
    content = COMMAND_TEMPLATE.format(
        command_name=command_name,
        command_title=kebab_to_title(command_name)
    )
    
    # 写入文件
    file_path.write_text(content, encoding='utf-8')
    
    print(f"✅ 已创建 command 文件：{file_path}")
    print()
    print("后续步骤：")
    print(f"1. 编辑 {file_path} 填充 [TODO] 占位符")
    print("2. 参照 best-practices.md 设计任务步骤")
    print("3. 测试 command 是否按预期执行")


def main():
    parser = argparse.ArgumentParser(
        description="创建新的 Claude Agent Command 模板",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s git-release
  %(prog)s deploy-staging --path /custom/commands
        """
    )
    
    parser.add_argument(
        'command_name',
        help='Command 名称（kebab-case），如 git-release'
    )
    
    parser.add_argument(
        '--path',
        type=Path,
        default=None,
        help='输出目录路径（默认：.claude/commands）'
    )
    
    args = parser.parse_args()
    
    # 验证 command 名称格式
    if not args.command_name.replace('-', '').isalnum():
        print(f"❌ 错误：command 名称只能包含字母、数字和连字符")
        print(f"   收到：{args.command_name}")
        sys.exit(1)
    
    # 确定输出路径
    if args.path:
        output_path = args.path
    else:
        # 默认路径：从当前目录查找 .claude/commands
        current = Path.cwd()
        output_path = current / '.claude' / 'commands'
        
        # 如果当前目录没有 .claude，尝试向上查找
        if not (current / '.claude').exists():
            for parent in current.parents:
                if (parent / '.claude').exists():
                    output_path = parent / '.claude' / 'commands'
                    break
    
    print(f"🚀 正在创建 command: {args.command_name}")
    print(f"   目标目录: {output_path}")
    print()
    
    create_command(args.command_name, output_path)


if __name__ == '__main__':
    main()
