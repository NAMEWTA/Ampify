/**
 * RPC Client for Webview ↔ Extension Host communication.
 *
 * Supports two modes:
 * 1. RPC request/response with correlation IDs (new protocol)
 * 2. Legacy fire-and-forget postMessage (backward compatibility)
 *
 * Also handles incoming push events from the extension.
 */
import { getVsCodeApi } from './vscodeApi'
import type { RpcRequest, RpcResponse, RpcEvent, ExtensionMessage } from '@ampify/shared'

type EventHandler = (data: unknown) => void
type MessageHandler = (message: ExtensionMessage) => void

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const DEFAULT_TIMEOUT = 15000 // 15s

class RpcClient {
  private pendingRequests = new Map<string, PendingRequest>()
  private eventHandlers = new Map<string, Set<EventHandler>>()
  private rawMessageHandlers = new Set<MessageHandler>()
  private idCounter = 0
  private initialized = false

  /**
   * Initialize the message listener. Call once on app startup.
   */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    window.addEventListener('message', (event: MessageEvent) => {
      const message = event.data as ExtensionMessage
      this.handleMessage(message)
    })
  }

  /**
   * Send an RPC request and await the response.
   */
  async request<T = unknown>(method: string, params?: unknown, timeout = DEFAULT_TIMEOUT): Promise<T> {
    const id = this.generateId()
    const msg: RpcRequest = { type: 'request', id, method, params }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`RPC timeout: ${method} (${timeout}ms)`))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })

      getVsCodeApi().postMessage(msg)
    })
  }

  /**
   * Send a legacy fire-and-forget message (no response expected).
   */
  send(message: Record<string, unknown>): void {
    getVsCodeApi().postMessage(message)
  }

  /**
   * Register a handler for push events from the extension.
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler)
    }
  }

  /**
   * Register a handler for ALL raw messages (for legacy message handling).
   */
  onMessage(handler: MessageHandler): () => void {
    this.rawMessageHandlers.add(handler)
    return () => {
      this.rawMessageHandlers.delete(handler)
    }
  }

  private handleMessage(message: ExtensionMessage): void {
    if (!message || typeof message !== 'object') return

    // Handle RPC response
    if (message.type === 'response') {
      const resp = message as RpcResponse
      const pending = this.pendingRequests.get(resp.id)
      if (pending) {
        this.pendingRequests.delete(resp.id)
        clearTimeout(pending.timer)
        if (resp.error) {
          pending.reject(new Error(resp.error))
        } else {
          pending.resolve(resp.result)
        }
        return
      }
    }

    // Handle push events
    if (message.type === 'event') {
      const evt = message as RpcEvent
      const handlers = this.eventHandlers.get(evt.event)
      if (handlers) {
        handlers.forEach(h => h(evt.data))
      }
      return
    }

    // Handle legacy messages — dispatch to raw handlers
    this.rawMessageHandlers.forEach(h => h(message))
  }

  private generateId(): string {
    return `rpc_${++this.idCounter}_${Date.now()}`
  }
}

/** Singleton RPC client instance */
export const rpcClient = new RpcClient()
