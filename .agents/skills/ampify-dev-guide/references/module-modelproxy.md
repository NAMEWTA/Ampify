# Model Proxy 模块

## 模块概述
Model Proxy 在本地启动 HTTP 服务，向外暴露 OpenAI/Anthropic 兼容接口，并转发到 VS Code `vscode.lm`。当前版本采用“一个 API Key 绑定一个模型”的多绑定设计。

## 目录结构
```text
src/modules/modelProxy/
├── index.ts
└── core/
    ├── proxyConfigManager.ts
    ├── proxyServer.ts
    ├── modelBridge.ts
    ├── openaiHandler.ts
    ├── anthropicHandler.ts
    ├── authManager.ts
    └── logManager.ts
```

## 核心要点
- `ProxyConfigManager`：管理 `modelproxy/config.json`（`apiKeyBindings`、`enabled`、`logEnabled`、`port`、`bindAddress`）。
- `AuthManager.validateRequest()`：从 `Authorization Bearer` 或 `x-api-key` 提取 key，并匹配绑定。
- `OpenAIHandler` / `AnthropicHandler`：忽略请求体的 `model`，强制使用绑定模型。
- `LogManager`：按实例 key 分目录记录 JSONL：`logs/{instanceKey}/YYYY-MM-DD.jsonl`。
- 扩展每次启动会将 `enabled` 重置为 `false`，避免沿用上次进程状态。

## HTTP 路由
- `GET /health`（无需鉴权）
- `GET /v1/models`（需鉴权，返回该 key 绑定模型）
- `POST /v1/chat/completions`（OpenAI 兼容）
- `POST /v1/messages`（Anthropic 兼容）
- `OPTIONS *`（CORS）

## 启动逻辑
1. `registerModelProxy()` 初始化 config / model bridge / log manager / server。
2. 启动前必须满足：
   - 可用模型不为空
   - 至少存在一个绑定
3. 端口冲突时自动尝试 `basePort + 0..49`。
4. 启动成功后写回 `enabled=true`，停止时写回 `enabled=false`。
5. `GET /v1/models` 仅返回当前 API Key 对应绑定模型，而非全部模型列表。

## 命令
- `ampify.modelProxy.toggle`
- `ampify.modelProxy.start`
- `ampify.modelProxy.stop`
- `ampify.modelProxy.copyKey`
- `ampify.modelProxy.regenerateKey`
- `ampify.modelProxy.copyBaseUrl`
- `ampify.modelProxy.addBinding`
- `ampify.modelProxy.removeBinding`
- `ampify.modelProxy.selectModel`（`addBinding` 别名）
- `ampify.modelProxy.viewLogs`
- `ampify.modelProxy.refresh`

## 配置与数据
### VS Code Settings
- `ampify.modelProxy.port`
- `ampify.modelProxy.bindAddress`

### 本地配置示例
```json
{
  "port": 18080,
  "apiKeyBindings": [
    {
      "id": "1a2b3c4d",
      "apiKey": "amp-...",
      "modelId": "...",
      "label": "work-default",
      "createdAt": 1739251200000
    }
  ],
  "enabled": false,
  "logEnabled": true,
  "bindAddress": "127.0.0.1"
}
```

## 安全与约束
- 默认监听 `127.0.0.1`。
- 请求体上限 1MB。
- 认证使用 `timingSafeEqual`。
- 客户端断开后通过 `CancellationToken` 取消模型请求。
