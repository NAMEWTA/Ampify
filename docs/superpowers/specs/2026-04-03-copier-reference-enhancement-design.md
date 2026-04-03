# Copier 复制能力增强设计（方案 B）

- 日期：2026-04-03
- 目标模块：src/modules/copier
- 设计状态：已与用户逐节确认（架构、数据流、错误处理、验收标准）

## 1. 背景与目标

当前 Copier 仅支持在编辑器中复制 `path:line` 或 `path:start-end`。本次需要在保持命令不变的前提下，扩展为三类输出能力，并提供相对路径与绝对路径两套命令行为。

### 1.1 目标

1. 保留既有命令 ID：
   - `ampify.copy-relative-path-line`
   - `ampify.copy-absolute-path-line`
2. 扩展输出能力：
   - 编辑器空选区：单行引用
   - 编辑器同一行选区：行+列范围引用
   - 编辑器跨行选区：行范围引用
   - Explorer 选中一个或多个文件/目录：多行列表引用
3. 输出格式严格符合约定：
   - 单条引用使用单反引号包裹，无首尾空格
   - 文件列表使用三反引号包裹，内部每项一行

### 1.2 非目标（YAGNI）

1. 不新增命令 ID。
2. 不新增设置项。
3. 不做与本需求无关的 Copier 重构。
4. 不改动 MainView 结构。

## 2. 术语与规则定义

## 2.1 来源类型

1. Explorer 来源：命令由资源管理器触发，传入 `uri` 或 `uri[]`。
2. 编辑器来源：命令由编辑器触发，读取活动编辑器与选区。

## 2.2 优先级

1. 若存在 Explorer 传参（`uri` 或 `uri[]`），优先按 Explorer 逻辑处理。
2. 否则回退到编辑器逻辑。

## 2.3 输出规则

1. 编辑器空选区：
   - 输出：`path:line`
   - 示例：`src\\modules\\copier\\index.ts:54`
2. 编辑器同一行非空选区：
   - 输出：`path:line(colStart-colEnd)`
   - 示例：`src\\modules\\copier\\index.ts:54(9-29)`
3. 编辑器跨行选区：
   - 输出：`path:start-end`
   - 示例：`src\\modules\\copier\\index.ts:54-63`
4. Explorer 单选或多选：
   - 输出：三反引号代码块
   - 内部：每个路径占一行，保持选择顺序

## 3. 方案选择

已选方案：方案 B（命令不变，逻辑拆分为来源层与格式化层）。

### 3.1 选择理由

1. 改动边界清晰：入口层仅调度，规则在格式化层集中维护。
2. 便于测试：格式化层可作为纯逻辑单元测试。
3. 可扩展：后续新增输出格式时，不必扩大命令入口复杂度。

## 4. 架构设计

## 4.1 文件与职责

1. `src/modules/copier/index.ts`（保留并改造）
   - 命令注册
   - 来源解析调用
   - 格式化调用
   - 剪贴板写入与状态提示

2. `src/modules/copier/sourceResolver.ts`（新增）
   - 识别来源（Explorer / 编辑器）
   - 统一生成结构化输入

3. `src/modules/copier/referenceFormatter.ts`（新增）
   - 将结构化输入格式化为最终字符串
   - 处理相对/绝对路径转换
   - 处理单反引号与三反引号输出

4. `package.json`（增量修改）
   - 在 `menus.explorer/context` 挂载现有两个命令
   - 保持 `editor/context` 与快捷键不变

## 4.2 结构化模型（概念）

```ts
interface EditorSelectionSource {
  kind: 'editorSelection';
  documentUri: vscode.Uri;
  selection: vscode.Selection;
}

interface FileListSource {
  kind: 'fileList';
  uris: vscode.Uri[];
}

type CopySource = EditorSelectionSource | FileListSource;
```

注：上面是设计模型，具体类型命名可在实现中微调。

## 5. 关键数据流

1. 用户触发命令（相对或绝对）。
2. `index.ts` 接收可选参数（`uri` 或 `uri[]`）。
3. `sourceResolver` 判定来源并输出 `CopySource`。
4. `referenceFormatter` 根据 `useRelativePath` + `CopySource` 生成文案。
5. 若文案为空：提示 `copier.noFilePath`。
6. 若文案非空：写入剪贴板，并提示 `copier.copied`。

## 6. 详细行为约束

## 6.1 列号规则

1. 列号使用 1 基准。
2. 同行选区输出 `(startCol-endCol)`。
3. 选区方向反向时，使用规范化后的 start/end，保证从小到大。

## 6.2 多选顺序

1. Explorer 多选输出顺序遵循传入顺序。
2. 不进行额外排序。

## 6.3 路径模式

1. 相对命令：优先输出工作区相对路径。
2. 绝对命令：输出文件系统绝对路径。
3. 相对路径不可解析时回退到路径字符串（避免空值）。

## 6.4 文件与目录

1. 文件与目录统一按路径一行输出。
2. 文件列表模式不附加行号或列号。

## 7. 错误处理

1. 无活动编辑器且无 Explorer 参数：
   - 提示 `copier.noFilePath`
2. 文档为 untitled 且无 Explorer 参数：
   - 提示 `copier.noFilePath`
3. 剪贴板写入失败：
   - 显式报错（不静默失败）
4. 解析后无有效项：
   - 提示 `copier.noFilePath`

## 8. 测试设计

## 8.1 单元测试重点（referenceFormatter）

1. 空选区 -> `path:line`
2. 同行非空选区 -> `path:line(colStart-colEnd)`
3. 跨行选区 -> `path:start-end`
4. 文件列表单项 -> 三反引号块
5. 文件列表多项 -> 三反引号块且保持顺序
6. 相对/绝对路径模式切换

## 8.2 回归验证点

1. 现有命令 ID 不变。
2. 现有快捷键不变。
3. 编辑器右键入口不变。
4. 新增 Explorer 右键入口可用。

## 9. 风险与缓解

1. 风险：Explorer 参数在不同触发路径下形态不一致（单 uri、数组、空值）。
   - 缓解：来源解析层统一规范化为 `vscode.Uri[]`。
2. 风险：列号边界导致 off-by-one。
   - 缓解：统一使用 1 基准并补充分支测试。
3. 风险：多根工作区相对路径判断不一致。
   - 缓解：统一复用 `vscode.workspace.asRelativePath(uri, false)`。

## 10. 实施清单

1. 新增 `sourceResolver.ts`。
2. 新增 `referenceFormatter.ts`。
3. 改造 `index.ts` 为调度入口。
4. 修改 `package.json` 增加 Explorer 菜单项。
5. 新增格式化层测试。
6. 执行编译与测试验证。

## 11. 验收标准

1. 编辑器空选区：输出单反引号包裹的 `path:line`。
2. 编辑器同行选区：输出单反引号包裹的 `path:line(colStart-colEnd)`。
3. 编辑器跨行选区：输出单反引号包裹的 `path:start-end`。
4. Explorer 复制单个/多个项：输出三反引号包裹、每项一行。
5. 相对与绝对路径两个命令均可用，行为一致。
6. 既有命令、快捷键、编辑器入口无回归。
