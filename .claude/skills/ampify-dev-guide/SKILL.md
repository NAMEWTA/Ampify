---
name: ampify-dev-guide
description: Ampify VS Code 扩展开发规范指南。用于新建功能模块、添加代码、理解项目结构、配置管理、国际化、类型定义等开发任务。当用户提到开发、新增模块、代码规范、项目结构时使用。
version: 1.0.0
tags:
  - ampify
---

# Ampify 开发规范指南

本 Skill 为 Ampify VS Code 扩展项目的开发规范文档，指导开发者如何正确地组织代码、新增模块、遵循编码规范。

## 项目概述

Ampify 是一个多功能 VS Code 扩展，目前包含三大核心模块：
1. **Copier**：快速复制"文件路径 + 行号"
2. **Launcher**：VS Code 多实例启动器
3. **Skills Manager**：全局 Skills 库管理与注入

## 目录结构规范

```
Ampify/
├── src/                          # 源代码根目录
│   ├── extension.ts              # 扩展入口（仅编排，不写业务逻辑）
│   ├── common/                   # 公共能力模块
│   │   ├── paths.ts              # 路径工具函数（APP_ROOT_NAME、ensureDir、copyDir）
│   │   ├── baseConfigManager.ts  # 配置管理基类（泛型抽象类）
│   │   ├── i18n.ts               # 国际化工具
│   │   └── types/                # 类型定义
│   │       └── index.ts          # 所有接口与类型
│   └── modules/                  # 功能模块（每个模块独立子目录）
│       ├── copier/               # 复制路径模块
│       │   └── index.ts          # 模块入口与命令注册
│       ├── launcher/             # 多实例启动器模块
│       │   ├── index.ts          # 模块入口与命令注册
│       │   ├── core/             # 核心逻辑
│       │   │   ├── configManager.ts   # 配置管理（继承 BaseConfigManager）
│       │   │   └── processEngine.ts   # 进程启动引擎
│       │   └── views/            # 视图层
│       │       └── instanceTreeProvider.ts  # TreeView 数据提供者
│       └── skills/               # Skills Manager 模块
│           ├── index.ts          # 模块入口与命令注册
│           ├── core/             # 核心逻辑
│           │   ├── skillConfigManager.ts  # 配置管理（继承 BaseConfigManager）
│           │   ├── skillGitManager.ts     # Git 操作
│           │   ├── skillApplier.ts        # Skill 应用到项目
│           │   ├── skillImporter.ts       # Skill 导入
│           │   ├── skillCreator.ts        # Skill 创建
│           │   └── skillDiffViewer.ts     # Diff 查看
│           ├── templates/        # 模板
│           │   └── skillMdTemplate.ts     # SKILL.md 模板生成
│           └── views/            # 视图层
│               └── skillTreeProvider.ts   # TreeView 数据提供者
├── package.json                  # 扩展清单、命令、配置、依赖
├── tsconfig.json                 # TypeScript 配置
├── eslint.config.js              # ESLint 配置
├── README.md                     # 项目说明
├── CHANGELOG.md                  # 变更日志
├── AGENT.md                      # AI Agent 上下文文档
├── LICENSE                       # 许可证
└── .vscode/                      # VS Code 工作区配置
    ├── launch.json               # 调试配置
    └── tasks.json                # 构建任务
```

## 模块开发规范

### 1. 模块目录结构

每个功能模块位于 `src/modules/{模块名}/`，标准结构：

```
{模块名}/
├── index.ts          # 必须：模块入口，导出 register{ModuleName}() 函数
├── core/             # 可选：核心业务逻辑
│   └── *.ts          # 配置管理、业务引擎等
├── views/            # 可选：视图相关（TreeView、WebView）
│   └── *Provider.ts  # TreeDataProvider 实现
└── templates/        # 可选：模板文件
    └── *.ts          # 模板生成器
```

### 2. 模块入口规范

模块入口文件 `index.ts` 必须导出注册函数：

```typescript
import * as vscode from 'vscode';

// 同步模块
export function registerModuleName(context: vscode.ExtensionContext) {
    // 1. 初始化核心组件
    // 2. 注册 TreeDataProvider（如有）
    // 3. 注册命令
    console.log('Module "ModuleName" loaded');
}

// 异步模块（需要 await 初始化）
export async function registerModuleName(context: vscode.ExtensionContext): Promise<void> {
    // 1. 初始化核心组件（await）
    // 2. 注册 TreeDataProvider（如有）
    // 3. 注册命令
    console.log('Module "ModuleName" loaded');
}
```

### 3. 在扩展入口注册模块

修改 `src/extension.ts`：

```typescript
import { registerNewModule } from './modules/newModule';

export async function activate(context: vscode.ExtensionContext) {
    // 同步模块直接调用
    registerCopier(context);
    registerLauncher(context);

    // 异步模块使用 try-catch
    try {
        await registerNewModule(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to register NewModule:', message);
        vscode.window.showErrorMessage(`NewModule failed to load: ${message}`);
    }
}
```

## 公共能力使用规范

### 1. 路径工具 (`src/common/paths.ts`)

```typescript
import { 
    APP_ROOT_NAME,      // '.vscode-ampify' 根目录名常量
    getAppRootDir,      // 获取 ~/.vscode-ampify
    getModuleDir,       // 获取 ~/.vscode-ampify/{moduleName}
    ensureDir,          // 确保目录存在
    copyDir             // 递归复制目录
} from '../../common/paths';

// 示例
const moduleRoot = getModuleDir('mymodule');  // ~/.vscode-ampify/mymodule
ensureDir(moduleRoot);
```

### 2. 配置管理基类 (`src/common/baseConfigManager.ts`)

新模块如需配置管理，必须继承 `BaseConfigManager<TConfig>`：

```typescript
import { BaseConfigManager } from '../../../common/baseConfigManager';
import { ensureDir } from '../../../common/paths';
import { MyModuleConfig } from '../../../common/types';

export class MyConfigManager extends BaseConfigManager<MyModuleConfig> {
    private dataDir: string;

    constructor() {
        super();
        this.dataDir = path.join(this.rootDir, 'data');
    }

    // 必须实现：返回模块目录名
    protected getModuleName(): string {
        return 'mymodule';  // 对应 ~/.vscode-ampify/mymodule
    }

    // 必须实现：返回默认配置
    protected getDefaultConfig(): MyModuleConfig {
        return {
            setting1: 'default',
            setting2: true
        };
    }

    // 可选覆写：初始化子目录
    protected initializeDirectories(): void {
        ensureDir(this.dataDir);
    }

    // 继承的公共方法：
    // - getConfig(): TConfig
    // - saveConfig(config: TConfig): void
    // - getRootDir(): string
    // - getConfigPath(): string
    // - ensureInit(): void
}
```

### 3. 国际化 (`src/common/i18n.ts`)

所有用户可见文本必须使用 `I18n.get()`：

```typescript
import { I18n } from '../../common/i18n';

// 简单文本
vscode.window.showInformationMessage(I18n.get('module.success'));

// 带参数文本
vscode.window.showErrorMessage(I18n.get('module.error', errorMessage));
```

添加新翻译键：
1. 在 `src/common/i18n.ts` 的 `translations` 对象中添加
2. 同时添加 `en` 和 `zh-cn` 两种语言

```typescript
const translations = {
    'en': {
        'mymodule.success': 'Operation successful',
        'mymodule.error': 'Error: {0}'
    },
    'zh-cn': {
        'mymodule.success': '操作成功',
        'mymodule.error': '错误：{0}'
    }
};
```

### 4. 类型定义 (`src/common/types/index.ts`)

所有共享接口必须定义在此文件：

```typescript
// 模块配置接口
export interface MyModuleConfig {
    setting1: string;
    setting2: boolean;
}

// 业务数据接口
export interface MyDataItem {
    id: string;
    name: string;
    // ...
}
```

## 命令注册规范

### 1. 在 `package.json` 声明命令

```json
{
  "contributes": {
    "commands": [
      {
        "command": "ampify.mymodule.action",
        "title": "My Action Title",
        "icon": "$(icon-name)"
      }
    ]
  }
}
```

### 2. 命令 ID 命名规范

格式：`ampify.{模块名}.{动作}`

示例：
- `ampify.launcher.add`
- `ampify.skills.refresh`
- `ampify.copier.copyRelativePath`

### 3. 注册命令实现

```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('ampify.mymodule.action', async (item?: MyItem) => {
        // 命令实现
    })
);
```

## TreeView 开发规范

### 1. 在 `package.json` 声明视图

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "ampify-mymodule",
          "title": "My Module",
          "icon": "$(icon-name)"
        }
      ]
    },
    "views": {
      "ampify-mymodule": [
        {
          "id": "ampify-mymodule-tree",
          "name": "My Items"
        }
      ]
    }
  }
}
```

### 2. TreeDataProvider 实现

```typescript
import * as vscode from 'vscode';

export class MyTreeProvider implements vscode.TreeDataProvider<MyTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<MyTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private configManager: MyConfigManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: MyTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MyTreeItem): Thenable<MyTreeItem[]> {
        // 返回子节点
    }
}

export class MyTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}
```

### 3. 注册 TreeDataProvider

```typescript
const treeProvider = new MyTreeProvider(configManager);
vscode.window.registerTreeDataProvider('ampify-mymodule-tree', treeProvider);
```

## 编码规范

### 1. TypeScript 严格模式

`tsconfig.json` 已开启 `strict: true`，必须遵守：
- 显式类型声明
- 严格空检查
- 严格属性初始化

### 2. ESLint 规则

主要规则（见 `eslint.config.js`）：
- 禁止未使用变量（允许 `_` 前缀忽略）
- 使用 TypeScript 推荐规则

### 3. 命名约定

| 类型 | 规范 | 示例 |
|------|------|------|
| 类名 | PascalCase | `SkillConfigManager` |
| 接口 | PascalCase | `LoadedSkill` |
| 函数/方法 | camelCase | `loadAllSkills()` |
| 变量/属性 | camelCase | `skillsDir` |
| 常量 | UPPER_SNAKE_CASE | `APP_ROOT_NAME` |
| 文件名 | camelCase | `skillConfigManager.ts` |
| 目录名 | camelCase | `skillManager` |

### 4. 错误处理

```typescript
try {
    await riskyOperation();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Operation failed:', message);
    vscode.window.showErrorMessage(I18n.get('module.error', message));
}
```

### 5. 异步操作

- 优先使用 `async/await`
- 避免回调地狱
- Promise 链需要错误处理

## 配置项规范

### 1. 在 `package.json` 声明配置

```json
{
  "contributes": {
    "configuration": {
      "title": "Ampify",
      "properties": {
        "ampify.mymodule.setting": {
          "type": "string",
          "default": "value",
          "description": "Setting description"
        }
      }
    }
  }
}
```

### 2. 读取配置

```typescript
const config = vscode.workspace.getConfiguration('ampify');
const value = config.get<string>('mymodule.setting') || 'default';
```

## 数据存储规范

### 1. 全局数据目录

所有模块数据存储于统一根目录：`~/.vscode-ampify/`

```
~/.vscode-ampify/
├── vscodeskillsmanager/      # Skills 模块
│   ├── config.json           # 模块配置
│   └── skills/               # Skills 数据
├── vscodemultilauncher/      # Launcher 模块
│   ├── config.json           # 模块配置
│   ├── userdata/             # 实例用户数据
│   └── shareExtensions/      # 共享扩展
└── {newmodule}/              # 新模块数据目录
    └── config.json
```

### 2. 模块目录命名

继承 `BaseConfigManager` 时，`getModuleName()` 返回值即为目录名。

## 开发流程

### 1. 新增功能模块

1. 创建目录：`src/modules/{moduleName}/`
2. 创建入口：`src/modules/{moduleName}/index.ts`
3. 定义类型：在 `src/common/types/index.ts` 添加接口
4. 创建配置管理：继承 `BaseConfigManager<TConfig>`
5. 添加国际化：在 `src/common/i18n.ts` 添加翻译
6. 声明命令/视图：修改 `package.json`
7. 注册模块：修改 `src/extension.ts`

### 2. 构建与调试

```bash
# 编译
npm run compile

# 监视模式
npm run watch

# 代码检查
npm run lint
```

调试：按 F5 启动扩展开发宿主。

### 3. 版本发布

1. 更新 `package.json` 中的 `version`
2. 更新 `CHANGELOG.md`
3. 提交并打 Tag
4. GitHub Actions 自动构建发布 VSIX

## 注意事项

1. **扩展入口 (`extension.ts`) 保持简洁**：只做模块编排，不写业务逻辑
2. **公共能力优先复用**：使用 `src/common/` 中的工具，避免重复代码
3. **国际化必须**：所有用户可见文本必须支持中英文
4. **类型安全**：充分利用 TypeScript 类型系统
5. **错误友好**：向用户展示有意义的错误信息
6. **日志规范**：使用 `console.log/error` 记录关键操作
