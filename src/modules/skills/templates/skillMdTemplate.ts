import { SkillMeta } from '../../../common/types';

/**
 * 生成 SKILL.md 内容
 */
export function generateSkillMdContent(meta: SkillMeta): string {
    const lines: string[] = [];

    // YAML frontmatter
    lines.push('---');
    lines.push(`name: ${meta.name}`);
    lines.push(`description: ${meta.description}`);
    if (meta.allowedTools && meta.allowedTools.length > 0) {
        lines.push(`allowed-tools: ${meta.allowedTools.join(', ')}`);
    }
    lines.push('---');
    lines.push('');

    // 标题
    const titleName = meta.name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    lines.push(`# ${titleName}`);
    lines.push('');

    // 简要概述
    lines.push(meta.description);
    lines.push('');

    // 适用场景
    lines.push('## 适用场景');
    lines.push('');
    lines.push('使用此 Skill 当：');
    lines.push('- [请填写适用场景 1]');
    lines.push('- [请填写适用场景 2]');
    lines.push('- [请填写适用场景 3]');
    lines.push('');

    // 使用说明
    lines.push('## 使用说明');
    lines.push('');
    lines.push('### 步骤 1: [标题]');
    lines.push('');
    lines.push('[详细指引说明]');
    lines.push('');
    lines.push('### 步骤 2: [标题]');
    lines.push('');
    lines.push('[详细指引说明]');
    lines.push('');
    lines.push('### 步骤 3: [标题]');
    lines.push('');
    lines.push('[详细指引说明]');
    lines.push('');

    // 示例
    lines.push('## 示例');
    lines.push('');
    lines.push('```');
    lines.push('// 在这里添加具体的代码或命令示例');
    lines.push('```');
    lines.push('');

    // 最佳实践
    lines.push('## 最佳实践');
    lines.push('');
    lines.push('- [最佳实践 1]');
    lines.push('- [最佳实践 2]');
    lines.push('- [需要避免的情况]');
    lines.push('');

    // 依赖要求（如果有前置依赖）
    if (meta.prerequisites && meta.prerequisites.length > 0) {
        lines.push('## 依赖要求');
        lines.push('');
        lines.push('| 依赖 | 类型 | 检测命令 | 安装提示 |');
        lines.push('|------|------|---------|---------|');

        for (const prereq of meta.prerequisites) {
            const type = getPrereqTypeLabel(prereq.type);
            const checkCmd = prereq.checkCommand || '-';
            const hint = prereq.installHint || '-';
            lines.push(`| ${prereq.name} | ${type} | \`${checkCmd}\` | ${hint} |`);
        }

        lines.push('');
    }

    // 标签（如果有）
    if (meta.tags && meta.tags.length > 0) {
        lines.push('## 标签');
        lines.push('');
        lines.push(meta.tags.map(tag => `\`${tag}\``).join(' '));
        lines.push('');
    }

    // 版本信息
    lines.push('## 版本');
    lines.push('');
    lines.push(`当前版本：${meta.version}`);
    lines.push('');

    // 高级用法
    lines.push('## 高级用法');
    lines.push('');
    lines.push('[如需更详细的参考，可创建 reference.md 文件]');
    lines.push('');

    // 强制中文要求
    lines.push('---');
    lines.push('');
    lines.push('**重要提示**: 所有输出文档和交互必须使用简体中文。');

    return lines.join('\n');
}

/**
 * 获取依赖类型标签
 */
function getPrereqTypeLabel(type: string): string {
    switch (type) {
        case 'runtime': return '运行时';
        case 'tool': return '工具';
        case 'extension': return '扩展';
        case 'manual': return '手动步骤';
        default: return type;
    }
}

/**
 * 生成 skill.json 内容
 */
export function generateSkillJsonContent(meta: SkillMeta): string {
    return JSON.stringify(meta, null, 2);
}
