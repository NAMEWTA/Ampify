# Launcher 模块

## 模块概述
Launcher 提供 VS Code 多实例启动能力：每个实例使用独立 `user-data-dir`，并共享扩展目录。

## 目录结构
- `src/modules/launcher/index.ts`
- `src/modules/launcher/core/configManager.ts`
- `src/modules/launcher/core/processEngine.ts`

## 关键类
- `ConfigManager`：管理 `vscodemultilauncher/config.json` 与 `userdata/`、`shareExtensions/`。
- `ProcessEngine`：解析 VS Code 可执行路径，拼装参数并启动子进程。

## 注册命令
- `ampify.launcher.add`
- `ampify.launcher.refresh`
- `ampify.launcher.editConfig`
- `ampify.launcher.launch`
- `ampify.launcher.switchNext`
- `ampify.launcher.delete`

## 启动链路
1. `launch(instance,key)` -> `launchInternal(...)`。
2. 计算并确保目录：
   - `--user-data-dir ~/.vscode-ampify/vscodemultilauncher/userdata/<dirName>`
   - `--extensions-dir ~/.vscode-ampify/vscodemultilauncher/shareExtensions`
3. 写入实例标识文件：`<user-data-dir>/.ampify-instance-key`。
4. 追加工作区路径（优先当前 workspace，否则 `defaultProject`）。
5. spawn 新 VS Code 进程并 `unref()`。

## 平台细节
- Windows 优先尝试 `code.cmd`，回退 `Code.exe` 或 `process.execPath`。
- 显式移除 `ELECTRON_RUN_AS_NODE`，避免子进程异常。
- 遇到 “Code is currently being updated” 时自动重试（最多 6 次，每次 2 秒）。

## 数据存储
```text
~/.vscode-ampify/vscodemultilauncher/
├── config.json
├── userdata/
└── shareExtensions/
```

`config.json` 关键字段：
- `instances: Record<string, InstanceConfig>`
- `lastUsedKey`
- `lastUsedAt`
