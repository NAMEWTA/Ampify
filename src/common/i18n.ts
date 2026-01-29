import * as vscode from 'vscode';

export type Lang = 'en' | 'zh-cn';

const translations = {
    'en': {
        'copier.noFilePath': 'Unable to get file path',
        'copier.copied': 'Copied: "{0}"',
        'launcher.noInstances': 'No accounts available',
        'launcher.addInstancePlaceholder': 'Click + above to add a new instance',
        'launcher.inputKey': 'Enter unique identifier (key), e.g. "work"',
        'launcher.inputDirName': 'Enter data directory name (dirName), e.g. "github-work"',
        'launcher.inputDesc': 'Enter description',
        'launcher.confirmDelete': 'Are you sure you want to delete "{0}"?',
        'launcher.launchSuccess': 'Launched instance: {0}',
        'launcher.launchFail': 'Launch failed: {0}',
        'launcher.codeNotFound': 'Executable not found or launch failed. Please ensure VS Code is installed correctly.',
        'launcher.spawnError': 'Process launch error: {0}'
    },
    'zh-cn': {
        'copier.noFilePath': '无法获取文件路径',
        'copier.copied': '已复制："{0}"',
        'launcher.noInstances': '没有可用的账号',
        'launcher.addInstancePlaceholder': '点击上方 + 号添加新实例',
        'launcher.inputKey': '输入唯一标识 (key), 如 "work"',
        'launcher.inputDirName': '输入数据目录名 (dirName), 如 "github-work"',
        'launcher.inputDesc': '输入描述',
        'launcher.confirmDelete': '确定要删除 "{0}" 吗?',
        'launcher.launchSuccess': '已启动实例: {0}',
        'launcher.launchFail': '启动失败: {0}',
        'launcher.codeNotFound': '未找到可执行文件或启动失败。请确保 VS Code 安装正确。',
        'launcher.spawnError': '进程启动错误: {0}'
    }
};

export type TranslationKey = keyof typeof translations['en'];

export class I18n {
    static get(key: TranslationKey, ...args: string[]): string {
        const config = vscode.workspace.getConfiguration('ampify');
        const lang = config.get<Lang>('language') || 'zh-cn';
        
        const langData = translations[lang] || translations['zh-cn'];
        let template = langData[key as keyof typeof langData] || translations['en'][key as keyof typeof translations['en']] || key;
        
        args.forEach((arg, index) => {
            template = template.replace(`{${index}}`, arg);
        });
        
        return template;
    }
}
