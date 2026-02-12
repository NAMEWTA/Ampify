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
| 命令 ID | `ampify.{module}.{action}` | `ampify.skills.refresh` |

## TypeScript 与 ESLint
- `tsconfig.json` 启用 `strict: true`
- ESLint 使用 Flat Config：`eslint.config.js`
- 未使用变量需清理（`_` 前缀例外）

## i18n 规范
- 用户可见文本统一走 `I18n.get()`
- 新键同时维护 `en` 与 `zh-cn`
- 占位符使用 `{0}`、`{1}`

## 命令与配置规范
- 用户可见命令必须在 `package.json` `contributes.commands` 声明
- 内部命令（仅模块间调用）可仅在代码中 `registerCommand`
- 新增 `ampify.*` 配置需同步：`package.json` + 对应 Bridge/模块读取逻辑

## MainView 接入规范
1. 在 `protocol.ts` 增加必要类型。
2. 新增或扩展 Bridge（`bridges/*`）。
3. 在 `AmpifyViewProvider` 接线消息与 `sendSectionData()`。
4. 在 `templates/jsTemplate.ts` 增加渲染。

## 开发流程
1. 修改模块代码：`src/modules/<module>/...`
2. 如需共享类型，更新 `src/common/types/index.ts`
3. 如有新文案，更新 `src/common/i18n.ts`
4. 如有新命令/配置，更新 `package.json`
5. 本地验证：`npm run compile`、`npm run lint`
