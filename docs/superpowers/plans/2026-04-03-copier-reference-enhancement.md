# Copier 复制能力增强 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在保持两个既有 Copier 命令 ID 不变的前提下，新增 Explorer 文件列表复制、同行列范围复制，并保证相对路径与绝对路径两套输出一致可用。

**架构：** 采用方案 B：将 Copier 拆分为命令入口层、来源解析层、格式化层。入口层只负责 VS Code API 交互（命令参数、活动编辑器、剪贴板、状态栏）；来源解析层统一 Explorer 与编辑器输入；格式化层负责严格输出规则（单反引号与三反引号块）。纯逻辑层不依赖 vscode 运行时，使用 node:test 做 TDD。

**技术栈：** TypeScript、VS Code Extension API、node:test、node:assert/strict、npm scripts（compile:extension / lint）

---

## 范围检查

本规格仅覆盖单一子系统（Copier 模块增强），不涉及 MainView、GitShare、Skills/Commands/Agents/Rules 业务子系统，适合单一实现计划执行。

## 参考资料

- 规格文档：`docs/superpowers/specs/2026-04-03-copier-reference-enhancement-design.md`
- Copier 现状参考：`src/modules/copier/index.ts`
- 仓库测试风格参考：`src/modules/mainView/bridges/dashboardSearchRanking.test.ts`
- 建议执行技能：@superpowers:test-driven-development、@superpowers:verification-before-completion

## 文件结构（先锁定）

### 新建文件

1. `src/modules/copier/copierTypes.ts`
   - 职责：定义纯逻辑共享类型（来源模型、选择区快照、路径转换函数签名）。

2. `src/modules/copier/referenceFormatter.ts`
   - 职责：按规格输出三类编辑器引用与 Explorer 列表代码块。

3. `src/modules/copier/referenceFormatter.test.ts`
   - 职责：覆盖格式规则、反引号包裹、多选顺序、相对/绝对路径切换。

4. `src/modules/copier/sourceResolver.ts`
   - 职责：将命令参数和编辑器快照统一解析为结构化来源模型。

5. `src/modules/copier/sourceResolver.test.ts`
   - 职责：覆盖来源优先级（Explorer > Editor）、多选解析、空输入保护。

### 修改文件

1. `src/modules/copier/index.ts`
   - 职责：保留命令 ID，接入新解析/格式化层；实现剪贴板写入成功提示与失败提示。

2. `package.json`
   - 职责：在 `menus.explorer/context` 增加两个既有命令入口，不改变快捷键与 editor/context 行为。

## 任务总览

1. 任务 1：实现并验证 `referenceFormatter`（TDD）
2. 任务 2：实现并验证 `sourceResolver`（TDD）
3. 任务 3：接入命令入口与 Explorer 菜单，完成回归验证
4. 任务 4：全量验证与交付提交

---

### 任务 1：实现引用格式化层（referenceFormatter）

**文件：**
- 创建：`src/modules/copier/copierTypes.ts`
- 创建：`src/modules/copier/referenceFormatter.ts`
- 测试：`src/modules/copier/referenceFormatter.test.ts`

- [ ] **步骤 1：编写失败的测试**

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { formatCopyReference } from './referenceFormatter';
import type { CopySourceSnapshot } from './copierTypes';

function rel(path: string): string {
    return path.replace('D:\\\\Data\\\\01-Code\\\\toolCode\\\\Ampify\\\\', '');
}

test('empty selection outputs `path:line` with inline backticks', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: true,
        activeLine: 54,
        startLine: 54,
        endLine: 54,
        startCharacter: 8,
        endCharacter: 8
    };

    const text = formatCopyReference(source, true, rel);
    assert.equal(text, '`src\\modules\\copier\\index.ts:55`');
});

test('single-line non-empty selection outputs `path:line(colStart-colEnd)`', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: false,
        activeLine: 53,
        startLine: 53,
        endLine: 53,
        startCharacter: 8,
        endCharacter: 28
    };

    const text = formatCopyReference(source, true, rel);
    assert.equal(text, '`src\\modules\\copier\\index.ts:54(9-29)`');
});

test('multi-line selection outputs `path:start-end`', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: false,
        activeLine: 53,
        startLine: 53,
        endLine: 62,
        startCharacter: 0,
        endCharacter: 5
    };

    const text = formatCopyReference(source, true, rel);
    assert.equal(text, '`src\\modules\\copier\\index.ts:54-63`');
});

test('file list outputs fenced block and preserves order', () => {
    const source: CopySourceSnapshot = {
        kind: 'fileList',
        absolutePaths: [
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\gitShare',
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts'
        ]
    };

    const text = formatCopyReference(source, true, rel);
    assert.equal(
        text,
        '```\nsrc\\modules\\copier\\index.ts\nsrc\\modules\\gitShare\nsrc\\extension.ts\n```'
    );
});

test('falls back to absolute path when relative transformer returns empty string', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: true,
        activeLine: 10,
        startLine: 10,
        endLine: 10,
        startCharacter: 0,
        endCharacter: 0
    };

    const text = formatCopyReference(source, true, () => '');
    assert.equal(text, '`D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts:11`');
});

test('file list also falls back to absolute path when transformer returns empty string', () => {
    const source: CopySourceSnapshot = {
        kind: 'fileList',
        absolutePaths: [
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
            'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts'
        ]
    };

    const text = formatCopyReference(source, true, () => '');
    assert.equal(
        text,
        '```\nD:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts\nD:\\Data\\01-Code\\toolCode\\Ampify\\src\\extension.ts\n```'
    );
});

test('falls back to absolute path when transformer returns whitespace only', () => {
    const source: CopySourceSnapshot = {
        kind: 'editorSelection',
        absolutePath: 'D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts',
        isEmptySelection: true,
        activeLine: 1,
        startLine: 1,
        endLine: 1,
        startCharacter: 0,
        endCharacter: 0
    };

    const text = formatCopyReference(source, true, () => '   ');
    assert.equal(text, '`D:\\Data\\01-Code\\toolCode\\Ampify\\src\\modules\\copier\\index.ts:2`');
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm run compile:extension`
预期：FAIL，报错包含 `referenceFormatter` 或 `copierTypes` 尚未实现/导出不完整。

- [ ] **步骤 3：编写最少实现代码**

```ts
// src/modules/copier/copierTypes.ts
export interface EditorSelectionSnapshot {
    kind: 'editorSelection';
    absolutePath: string;
    isEmptySelection: boolean;
    activeLine: number; // 0-based
    startLine: number; // 0-based
    endLine: number; // 0-based
    startCharacter: number; // 0-based
    endCharacter: number; // 0-based
}

export interface FileListSnapshot {
    kind: 'fileList';
    absolutePaths: string[];
}

export type CopySourceSnapshot = EditorSelectionSnapshot | FileListSnapshot;

export type PathTransformer = (absolutePath: string) => string;
```

```ts
// src/modules/copier/referenceFormatter.ts
import type {
    CopySourceSnapshot,
    EditorSelectionSnapshot,
    PathTransformer
} from './copierTypes';

function toInlineReference(body: string): string {
    return `\`${body}\``;
}

function toDisplayPath(absolutePath: string, transformer: PathTransformer): string {
    const transformed = transformer(absolutePath);
    return transformed && transformed.length > 0 ? transformed : absolutePath;
}

function formatEditorSelection(source: EditorSelectionSnapshot, transformer: PathTransformer): string {
    const path = toDisplayPath(source.absolutePath, transformer);

    if (source.isEmptySelection) {
        return toInlineReference(`${path}:${source.activeLine + 1}`);
    }

    const startLine = source.startLine + 1;
    const endLine = source.endLine + 1;

    if (startLine !== endLine) {
        return toInlineReference(`${path}:${startLine}-${endLine}`);
    }

    const startCol = source.startCharacter + 1;
    const endCol = source.endCharacter + 1;
    return toInlineReference(`${path}:${startLine}(${startCol}-${endCol})`);
}

function formatFileList(paths: string[]): string {
    return `\`\`\`\n${paths.join('\n')}\n\`\`\``;
}

export function formatCopyReference(
    source: CopySourceSnapshot,
    useRelativePath: boolean,
    asRelativePath: PathTransformer
): string {
    const transformer: PathTransformer = useRelativePath ? asRelativePath : (absolutePath) => absolutePath;

    if (source.kind === 'fileList') {
        const displayPaths = source.absolutePaths.map((path) => toDisplayPath(path, transformer));
        if (displayPaths.length === 0) {
            return '';
        }
        return formatFileList(displayPaths);
    }

    return formatEditorSelection(source, transformer);
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：
1. `npm run compile:extension`
2. `node --test out/modules/copier/referenceFormatter.test.js`

预期：PASS，所有 formatter 用例通过。

- [ ] **步骤 5：Commit**

```bash
git add src/modules/copier/copierTypes.ts src/modules/copier/referenceFormatter.ts src/modules/copier/referenceFormatter.test.ts
git commit -m "test+feat: add copier reference formatter with TDD"
```

---

### 任务 2：实现来源解析层（sourceResolver）

**文件：**
- 创建：`src/modules/copier/sourceResolver.ts`
- 测试：`src/modules/copier/sourceResolver.test.ts`
- 依赖：`src/modules/copier/copierTypes.ts`

- [ ] **步骤 1：编写失败的测试**

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolveCopySource } from './sourceResolver';

test('explorer uris take priority over active editor snapshot', () => {
    const source = resolveCopySource(
        [{ fsPath: 'D:\\repo\\a.ts' }, { fsPath: 'D:\\repo\\b.ts' }],
        {
            absolutePath: 'D:\\repo\\editor.ts',
            isUntitled: false,
            isEmptySelection: true,
            activeLine: 0,
            startLine: 0,
            endLine: 0,
            startCharacter: 0,
            endCharacter: 0
        },
        true
    );

    assert.deepEqual(source, {
        kind: 'fileList',
        absolutePaths: ['D:\\repo\\a.ts', 'D:\\repo\\b.ts']
    });
});

test('falls back to editor when explorer input is empty', () => {
    const source = resolveCopySource(undefined, {
        absolutePath: 'D:\\repo\\editor.ts',
        isUntitled: false,
        isEmptySelection: true,
        activeLine: 9,
        startLine: 9,
        endLine: 9,
        startCharacter: 0,
        endCharacter: 0
    }, false);

    assert.equal(source?.kind, 'editorSelection');
});

test('returns null when explorer argument exists but has no valid fsPath', () => {
    const source = resolveCopySource(
        [{ nope: 'x' }],
        {
            absolutePath: 'D:\\repo\\editor.ts',
            isUntitled: false,
            isEmptySelection: true,
            activeLine: 0,
            startLine: 0,
            endLine: 0,
            startCharacter: 0,
            endCharacter: 0
        },
        true
    );

    assert.equal(source, null);
});

test('returns null when neither explorer nor valid editor is available', () => {
    const source = resolveCopySource(undefined, undefined, false);
    assert.equal(source, null);
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：
1. `npm run compile:extension`
2. `node --test out/modules/copier/sourceResolver.test.js`

预期：FAIL，`resolveCopySource` 尚未实现或行为不符合断言。

- [ ] **步骤 3：编写最少实现代码**

```ts
// src/modules/copier/sourceResolver.ts
import type { CopySourceSnapshot, EditorSelectionSnapshot } from './copierTypes';

export interface EditorSnapshotInput {
    absolutePath: string;
    isUntitled: boolean;
    isEmptySelection: boolean;
    activeLine: number;
    startLine: number;
    endLine: number;
    startCharacter: number;
    endCharacter: number;
}

interface UriLike {
    fsPath?: unknown;
}

function toFsPath(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const maybe = value as UriLike;
    return typeof maybe.fsPath === 'string' && maybe.fsPath.length > 0 ? maybe.fsPath : null;
}

function normalizeExplorerPaths(explorerInput: unknown): string[] {
    if (Array.isArray(explorerInput)) {
        return explorerInput
            .map((item) => toFsPath(item))
            .filter((path): path is string => Boolean(path));
    }

    const one = toFsPath(explorerInput);
    return one ? [one] : [];
}

function toEditorSelection(editor: EditorSnapshotInput): EditorSelectionSnapshot {
    return {
        kind: 'editorSelection',
        absolutePath: editor.absolutePath,
        isEmptySelection: editor.isEmptySelection,
        activeLine: editor.activeLine,
        startLine: editor.startLine,
        endLine: editor.endLine,
        startCharacter: editor.startCharacter,
        endCharacter: editor.endCharacter
    };
}

export function resolveCopySource(
    explorerInput: unknown,
    editorInput?: EditorSnapshotInput,
    explorerProvided = false
): CopySourceSnapshot | null {
    const explorerPaths = normalizeExplorerPaths(explorerInput);
    if (explorerPaths.length > 0) {
        return {
            kind: 'fileList',
            absolutePaths: explorerPaths
        };
    }

    // Explorer 触发但未解析出有效路径时，不回退编辑器，避免误复制。
    if (explorerProvided) {
        return null;
    }

    if (!editorInput || editorInput.isUntitled) {
        return null;
    }

    return toEditorSelection(editorInput);
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：
1. `npm run compile:extension`
2. `node --test out/modules/copier/sourceResolver.test.js`

预期：PASS，来源优先级与空输入保护用例通过。

- [ ] **步骤 5：Commit**

```bash
git add src/modules/copier/sourceResolver.ts src/modules/copier/sourceResolver.test.ts
git commit -m "test+feat: add copier source resolver with explorer priority"
```

---

### 任务 3：接入命令入口与 Explorer 菜单

**文件：**
- 修改：`src/modules/copier/index.ts`
- 修改：`package.json`
- 依赖：`src/modules/copier/sourceResolver.ts`
- 依赖：`src/modules/copier/referenceFormatter.ts`

- [ ] **步骤 1：补充失败测试（回归约束）**

在 `src/modules/copier/sourceResolver.test.ts` 增加一条用例，锁定“多选顺序保持不变”：

```ts
test('preserves explorer selection order', () => {
    const source = resolveCopySource(
        [{ fsPath: 'D:\\repo\\z.ts' }, { fsPath: 'D:\\repo\\a.ts' }],
        undefined
    );

    assert.deepEqual(source, {
        kind: 'fileList',
        absolutePaths: ['D:\\repo\\z.ts', 'D:\\repo\\a.ts']
    });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：
1. `npm run compile:extension`
2. `node --test out/modules/copier/sourceResolver.test.js`

预期：若实现误改为排序，将 FAIL；否则可直接 PASS（该步骤用于先锁定回归边界）。

- [ ] **步骤 3：实现命令入口改造（最小代码）**

```ts
// src/modules/copier/index.ts（核心片段）
import * as vscode from 'vscode';
import { I18n } from '../../common/i18n';
import { resolveCopySource, EditorSnapshotInput } from './sourceResolver';
import { formatCopyReference } from './referenceFormatter';

function toEditorSnapshot(editor: vscode.TextEditor | undefined): EditorSnapshotInput | undefined {
    if (!editor) {
        return undefined;
    }

    const doc = editor.document;
    return {
        absolutePath: doc.fileName,
        isUntitled: doc.isUntitled,
        isEmptySelection: editor.selection.isEmpty,
        activeLine: editor.selection.active.line,
        startLine: editor.selection.start.line,
        endLine: editor.selection.end.line,
        startCharacter: editor.selection.start.character,
        endCharacter: editor.selection.end.character
    };
}

function pickExplorerInput(args: unknown[]): unknown {
    if (args.length === 0) {
        return {
            explorerInput: undefined,
            explorerProvided: false
        };
    }

    if (Array.isArray(args[1])) {
        return {
            explorerInput: args[1],
            explorerProvided: true
        };
    }

    return {
        explorerInput: args[0],
        explorerProvided: true
    };
}

function toRelativePath(absolutePath: string): string {
    const uri = vscode.Uri.file(absolutePath);
    const relative = vscode.workspace.asRelativePath(uri, false);
    return relative && relative.length > 0 ? relative : absolutePath;
}

function buildReference(useRelativePath: boolean, args: unknown[]): string {
    const { explorerInput, explorerProvided } = pickExplorerInput(args) as {
        explorerInput: unknown;
        explorerProvided: boolean;
    };

    const source = resolveCopySource(
        explorerInput,
        toEditorSnapshot(vscode.window.activeTextEditor),
        explorerProvided
    );

    if (!source) {
        return '';
    }

    return formatCopyReference(source, useRelativePath, toRelativePath);
}
```

并在命令注册中改为接收参数：

```ts
const copyRelativePathLine = vscode.commands.registerCommand('ampify.copy-relative-path-line', (...args: unknown[]) => {
    const msg = buildReference(true, args);
    if (msg === '') {
        vscode.window.showErrorMessage(I18n.get('copier.noFilePath'));
        return;
    }

    vscode.env.clipboard.writeText(msg).then(
        () => showMessage(msg),
        (error) => {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Copy failed: ${message}`);
        }
    );
});

const copyAbsolutePathLine = vscode.commands.registerCommand('ampify.copy-absolute-path-line', (...args: unknown[]) => {
    const msg = buildReference(false, args);
    if (msg === '') {
        vscode.window.showErrorMessage(I18n.get('copier.noFilePath'));
        return;
    }

    vscode.env.clipboard.writeText(msg).then(
        () => showMessage(msg),
        (error) => {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Copy failed: ${message}`);
        }
    );
});
```

- [ ] **步骤 4：修改 package.json 增加 Explorer 菜单入口**

在 `contributes.menus` 下增加：

```json
"explorer/context": [
  {
    "command": "ampify.copy-relative-path-line"
  },
  {
    "command": "ampify.copy-absolute-path-line"
  }
]
```

注意：
1. 不修改已有 `editor/context` 项。
2. 不修改已有快捷键。

- [ ] **步骤 5：运行验证**

运行：
1. `npm run compile:extension`
2. `node --test out/modules/copier/referenceFormatter.test.js`
3. `node --test out/modules/copier/sourceResolver.test.js`
4. `npm run lint:extension`

预期：全部 PASS。

- [ ] **步骤 6：手工验收（扩展宿主）**

1. 在编辑器空选区触发相对/绝对命令：得到 `` `path:line` ``。
2. 在同一行选中部分字符触发命令：得到 `` `path:line(colStart-colEnd)` ``。
3. 在跨行选区触发命令：得到 `` `path:start-end` ``。
4. 在 Explorer 选中单个文件触发命令：得到三反引号块（1 行路径）。
5. 在 Explorer 多选文件/目录触发命令：得到三反引号块（多行，顺序与选择一致）。
6. 在 Explorer 触发但参数无有效路径时：出现错误提示，且不会回退复制编辑器引用。

- [ ] **步骤 7：Commit**

```bash
git add src/modules/copier/index.ts package.json src/modules/copier/sourceResolver.test.ts
git commit -m "feat: wire copier source/formatter and add explorer context menu"
```

---

### 任务 4：全量回归与交付提交

**文件：**
- 检查：`src/modules/copier/index.ts`
- 检查：`src/modules/copier/*.ts`
- 检查：`package.json`
- 检查：`docs/superpowers/specs/2026-04-03-copier-reference-enhancement-design.md`

- [ ] **步骤 1：执行全量验证命令**

运行：
1. `npm run compile`
2. `npm run lint`

预期：PASS，无新增 TypeScript/ESLint 错误。

- [ ] **步骤 2：对照规格逐条验收**

按规格文档第 11 节逐条核对：
1. `path:line`
2. `path:line(colStart-colEnd)`
3. `path:start-end`
4. Explorer 三反引号列表
5. 相对/绝对双命令可用
6. 既有快捷键与 editor/context 无回归
7. Explorer 参数无效时不回退编辑器内容
8. 剪贴板写入失败时有显式错误提示

- [ ] **步骤 3：最终提交（仅当仍有变更）**

```bash
git status --short
# 仅当仍有变更时执行：
git add src/modules/copier package.json
git diff --cached --quiet || git commit -m "feat: enhance copier references for editor selection and explorer resources"
```

- [ ] **步骤 4：记录验证证据**

在提交说明或 PR 描述中附上：
1. 运行命令清单
2. 关键测试输出摘要
3. 手工验收截图或复制结果样例

---

## 失败处理预案

1. 若 `node --test` 报 `vscode` 模块缺失：
   - 确认测试文件仅依赖纯逻辑层（`referenceFormatter.ts` / `sourceResolver.ts`），不要直接 import `index.ts`。
2. 若 Windows 路径分隔符与预期不一致：
   - 以运行平台输出为准，不在 formatter 里强制替换分隔符；同时同步调整测试夹具。
3. 若 Explorer 多选参数行为与预期不同：
   - 在 `pickExplorerInput` 内兼容 `args[1]`（数组）与 `args[0]`（单项）。

## 完成定义（DoD）

1. 全部任务复选框已勾选。
2. 任务 1~4 的测试与验证命令均通过。
3. 与规格文档 100% 对齐，无范围蔓延。
4. 至少 3 次小步提交（formatter、resolver、integration）。
5. 代码改动聚焦 Copier 模块与菜单配置。
