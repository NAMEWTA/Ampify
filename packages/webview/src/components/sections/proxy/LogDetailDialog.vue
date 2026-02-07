<template>
  <el-dialog
    :model-value="!!modelValue"
    :title="labels?.logDetailTitle || 'Log Detail'"
    width="500px"
    @close="emit('update:modelValue', null)"
    append-to-body
    destroy-on-close
  >
    <div v-if="modelValue" class="log-detail">
      <div class="meta-grid">
        <div class="meta-row">
          <span class="meta-label">{{ labels?.logRequestId || 'Request ID' }}</span>
          <span class="meta-value">{{ modelValue.requestId }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">{{ labels?.logTime || 'Time' }}</span>
          <span class="meta-value">{{ new Date(modelValue.timestamp).toLocaleString() }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Model</span>
          <span class="meta-value">{{ modelValue.model }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Format</span>
          <span class="meta-value">{{ modelValue.format }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">{{ labels?.logDuration || 'Duration' }}</span>
          <span class="meta-value">{{ (modelValue.durationMs / 1000).toFixed(2) }}s</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Tokens</span>
          <span class="meta-value">{{ modelValue.inputTokens }}↑ {{ modelValue.outputTokens }}↓</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Status</span>
          <span class="meta-value" :class="modelValue.status === 'success' ? 'status-ok' : 'status-err'">
            {{ modelValue.status }}
          </span>
        </div>
      </div>

      <div v-if="modelValue.error" class="log-section error-section">
        <h4>{{ labels?.logError || 'Error' }}</h4>
        <pre>{{ modelValue.error }}</pre>
      </div>

      <div v-if="modelValue.inputContent" class="log-section">
        <h4>{{ labels?.logInput || 'Input' }}</h4>
        <pre>{{ prettyJson(modelValue.inputContent) }}</pre>
      </div>

      <div v-if="modelValue.outputContent" class="log-section">
        <h4>{{ labels?.logOutput || 'Output' }}</h4>
        <pre>{{ modelValue.outputContent }}</pre>
      </div>
    </div>

    <template #footer>
      <el-button size="small" @click="emit('update:modelValue', null)">
        {{ labels?.logClose || 'Close' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ModelProxyLogInfo, ModelProxyLabels } from '@ampify/shared'

defineProps<{
  modelValue: ModelProxyLogInfo | null
  labels?: ModelProxyLabels
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ModelProxyLogInfo | null]
}>()

function prettyJson(content: string): string {
  try { return JSON.stringify(JSON.parse(content), null, 2) }
  catch { return content }
}
</script>

<style scoped>
.log-detail { font-size: 12px; }

.meta-grid { margin-bottom: 12px; }

.meta-row {
  display: flex;
  padding: 3px 0;
  border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
}

.meta-label {
  min-width: 90px;
  color: var(--vscode-descriptionForeground, #717171);
}

.meta-value {
  flex: 1;
  word-break: break-all;
}

.status-ok { color: #89d185; }
.status-err { color: #f48771; }

.log-section {
  margin-top: 12px;
}

.log-section h4 {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--vscode-foreground, #cccccc);
}

.log-section pre {
  font-size: 11px;
  font-family: var(--vscode-editor-font-family, monospace);
  background: var(--vscode-textCodeBlock-background, #1e1e1e);
  padding: 8px;
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-section pre {
  color: #f48771;
  border: 1px solid #f4877133;
}
</style>
