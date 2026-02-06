# Ampify Model Proxy API

This document describes the OpenAI- and Anthropic-compatible HTTP APIs exposed by Ampify Model Proxy.
It is intended for third-party clients such as OpenCode and ClaudeCode.

## Base URL

Default base URL (local only):

- http://127.0.0.1:18080

You can change the bind address and port via Ampify settings:

- ampify.modelProxy.bindAddress
- ampify.modelProxy.port

## Authentication

Ampify Model Proxy requires an API key for all requests except /health.

Send one of the following headers:

- x-api-key: <API_KEY>
- Authorization: Bearer <API_KEY>

API key is stored in:

- ~/.vscode-ampify/modelproxy/config.json

## Common Behavior

- Content-Type must be application/json for POST requests.
- CORS is enabled with default settings.
- The proxy is a compatibility layer over VS Code Language Model APIs.
- Some capabilities depend on the selected model and the VS Code host.

## Endpoints Overview

- GET /health
- GET /v1/models
- POST /v1/chat/completions (OpenAI-compatible)
- POST /v1/messages (Anthropic-compatible)

---

# OpenAI-Compatible API

## GET /v1/models

Returns the list of available models.

### Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "claude-haiku-4.5",
      "object": "model",
      "created": 1738800000,
      "owned_by": "anthropic",
      "permission": [],
      "root": "claude-haiku-4.5",
      "parent": null
    }
  ]
}
```

## POST /v1/chat/completions

OpenAI Chat Completions-compatible endpoint.

### Request Body

```json
{
  "model": "claude-haiku-4.5",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "stream": false,
  "temperature": 0.7,
  "top_p": 1,
  "max_tokens": 256,
  "max_completion_tokens": 256,
  "stop": ["\n\n"],
  "presence_penalty": 0,
  "frequency_penalty": 0,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_time",
        "description": "Return current time",
        "parameters": {
          "type": "object",
          "properties": {}
        }
      }
    }
  ],
  "tool_choice": "auto",
  "response_format": { "type": "text" },
  "user": "user-123"
}
```

### Notes

- content supports text or image_url parts.
- If tool_calls are generated, finish_reason is "tool_calls".
- The proxy maps tool calls to VS Code tool-calling parts.

### Response (non-stream)

```json
{
  "id": "chatcmpl-<id>",
  "object": "chat.completion",
  "created": 1738800000,
  "model": "claude-haiku-4.5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello!"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```

### Response (stream)

Server-Sent Events (SSE). Each chunk is a JSON object in `data:` lines.

- Content chunks: delta.content
- Tool call chunks: delta.tool_calls
- End: data: [DONE]

Example:

```
data: {"id":"chatcmpl-<id>","object":"chat.completion.chunk","created":1738800000,"model":"claude-haiku-4.5","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-<id>","object":"chat.completion.chunk","created":1738800000,"model":"claude-haiku-4.5","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-<id>","object":"chat.completion.chunk","created":1738800000,"model":"claude-haiku-4.5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### Example (curl)

```bash
curl http://127.0.0.1:18080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_KEY>" \
  -d '{
    "model": "claude-haiku-4.5",
    "messages": [
      {"role":"user","content":"Hello"}
    ]
  }'
```

---

# Anthropic-Compatible API

## POST /v1/messages

Anthropic Messages-compatible endpoint.

### Request Body

```json
{
  "model": "claude-haiku-4.5",
  "max_tokens": 256,
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "system": "You are helpful",
  "stream": false,
  "temperature": 0.7,
  "top_p": 1,
  "top_k": 40,
  "stop_sequences": ["\n\n"],
  "thinking": { "type": "disabled" },
  "output_config": { "effort": "low" },
  "metadata": { "user_id": "user-123" },
  "service_tier": "auto",
  "inference_geo": "us",
  "tools": [
    {
      "name": "get_time",
      "description": "Return current time",
      "input_schema": {
        "type": "object",
        "properties": {}
      }
    }
  ],
  "tool_choice": { "type": "auto" }
}
```

### Content Blocks

The proxy accepts Anthropic-style content blocks:

- text
- image (base64 supported)
- tool_use
- tool_result
- thinking / redacted_thinking
- document, search_result (treated as text)

### Response (non-stream)

```json
{
  "id": "msg_<id>",
  "type": "message",
  "role": "assistant",
  "model": "claude-haiku-4.5",
  "content": [
    { "type": "text", "text": "Hello!" }
  ],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 10,
    "output_tokens": 5
  }
}
```

### Response (stream)

Server-Sent Events (SSE) following Anthropic event names:

- message_start
- content_block_start
- content_block_delta
- content_block_stop
- message_delta
- message_stop

Example:

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_<id>","type":"message","role":"assistant","model":"claude-haiku-4.5","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":5}}

event: message_stop
data: {"type":"message_stop"}
```

### Example (curl)

```bash
curl http://127.0.0.1:18080/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "model": "claude-haiku-4.5",
    "max_tokens": 128,
    "messages": [
      {"role":"user","content":"Hello"}
    ]
  }'
```

---

# Errors

Errors are returned as JSON with HTTP status codes.

OpenAI format:

```json
{
  "error": {
    "message": "Invalid or missing API key",
    "type": "unauthorized",
    "code": 401
  }
}
```

Anthropic format:

```json
{
  "type": "error",
  "error": {
    "type": "permission_error",
    "message": "Invalid or missing API key"
  }
}
```

---

# Health Check

## GET /health

No auth required. Returns proxy status and model count.

```json
{
  "status": "ok",
  "models": 3
}
```
