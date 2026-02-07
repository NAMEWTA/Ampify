# 编码规范与开发流程

## 命名约定

| 类型 | 规范 | 示例 |
| --- | --- | --- |
| 类名 | PascalCase | `SkillConfigManager` |
| 接口 | PascalCase | `LoadedSkill` |
| 函数/方法 | camelCase | `loadAllSkills()` |
| 变量/属性 | camelCase | `skillsDir` |
| 常量 | UPPER_SNAKE_CASE | `APP_ROOT_NAME` |
| 文件名 | camelCase | `skillConfigManager.ts` |
| 目录名 | camelCase | `mainView` |
| 命令 ID | ampify.{module}.{action} | `ampify.skills.refresh` |

## TypeScript 与 ESLint
- `tsconfig.json` 启用 `strict: true`
- ESLint 使用 Flat Config，见 [packages/extension/eslint.config.js](../../../packages/extension/eslint.config.js)
- 禁止未使用变量（允许 `_` 前缀）

## 国际化规范
- 所有用户可见文本必须通过 `I18n.get()`
- 新增翻译键必须同时维护 `en` 与 `zh-cn`
- 占位符使用 `{0}`、`{1}`

## 错误处理
- 异步命令使用 `try/catch`
- 统一输出控制台日志与用户提示

示例：
```typescript
try {
    await doSomething();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Operation failed:', message);
    vscode.window.showErrorMessage(I18n.get('module.error', message));
}
```

## 配置与存储
- VS Code 设置通过 `vscode.workspace.getConfiguration('ampify')` 读取
- Git 同步相关数据存放在 `gitshare/` 目录
- 本地独立配置可继承 `BaseConfigManager<T>`

## 命令与视图
- 所有命令必须在 [packages/extension/package.json](../../../packages/extension/package.json) 中声明
- MainView 使用 Webview + Bridge，禁止新增 TreeDataProvider

## MainView Bridge 接入
1. 新建 Bridge（参照 `src/modules/mainView/bridges/`）
2. 实现 `getTreeData()` / `getToolbar()` / `executeAction()`
3. 在 `AmpifyViewProvider` 的 `sendSectionData()` 中挂载

## 开发流程
1. 创建目录：`packages/extension/src/modules/{moduleName}/`
2. 定义类型：`packages/extension/src/common/types/index.ts`
3. 增加 i18n：`packages/extension/src/common/i18n.ts`
4. 注册命令：`packages/extension/package.json`
5. 注册模块：`packages/extension/src/extension.ts`
6. 接入 MainView Bridge

## 构建与调试
- `pnpm run build`
- `pnpm run watch`
- `pnpm run lint`
- 调试：F5 启动扩展开发宿主

## 版本发布
1. 更新版本号与变更记录
2. 打 Tag
3. GitHub Actions 构建 VSIX
