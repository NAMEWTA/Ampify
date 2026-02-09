<template>
  <div class="section-view">
    <SectionToolbar title="MODEL PROXY" :actions="store.toolbar" @action="handleToolbarAction" />

    <div class="proxy-content" v-if="store.dashboard">
      <div class="proxy-dashboard" :data-labels="JSON.stringify(store.dashboard.labels)">
        <!-- Stats Grid -->
        <div class="stats-grid">
          <ProxyStatCard
            :icon="store.dashboard.running ? 'radio-tower' : 'debug-disconnect'"
            :value="store.dashboard.running ? `${L.statusRunning} :${store.dashboard.port}` : L.statusStopped"
            :label="'Status'"
            :color="store.dashboard.running ? '#89d185' : '#f48771'"
          />
          <ProxyStatCard icon="pulse" :value="String(store.dashboard.todayRequests)" :label="L.requests" color="#4fc1ff" />
          <ProxyStatCard icon="symbol-key" :value="String(store.dashboard.todayTokens)" :label="L.tokens" color="#dcdcaa" />
          <ProxyStatCard
            icon="warning"
            :value="errorRate"
            :label="L.errorRate"
            color="#f48771"
          />
          <ProxyStatCard
            icon="clock"
            :value="avgLatency"
            :label="L.avgLatency"
            color="#c586c0"
          />
        </div>

        <!-- Connection Info (only when running) -->
        <div class="connection-info" v-if="store.dashboard.running">
          <h3 class="section-title">{{ L.connection }}</h3>
          <div class="conn-row">
            <span class="conn-label">{{ L.baseUrl }}</span>
            <code class="conn-value">{{ store.dashboard.baseUrl }}</code>
            <el-tooltip :content="L.copy" placement="top">
              <button class="icon-btn" @click="store.proxyAction('copyUrl')">
                <CodiconIcon name="copy" />
              </button>
            </el-tooltip>
          </div>
        </div>

        <!-- API Key Bindings -->
        <div class="bindings-section" v-if="store.dashboard.running">
          <div class="section-header">
            <h3 class="section-title" style="margin-bottom: 0">API KEY BINDINGS ({{ store.dashboard.bindings.length }})</h3>
            <div class="section-header-actions">
              <button class="text-btn" @click="store.addBinding()">
                <CodiconIcon name="add" /> {{ L.addBinding }}
              </button>
            </div>
          </div>
          <div v-if="store.dashboard.bindings.length === 0" class="empty-hint">
            <CodiconIcon name="info" /> {{ L.noBindings }}
          </div>
          <div v-else class="binding-list">
            <div
              v-for="binding in store.dashboard.bindings"
              :key="binding.id"
              class="binding-row"
            >
              <CodiconIcon name="key" />
              <span class="binding-label">{{ binding.label || binding.id }}</span>
              <el-tag size="small" type="info">{{ binding.modelName || binding.modelId }}</el-tag>
              <code class="conn-value binding-key">{{ binding.maskedKey }}</code>
              <el-tooltip :content="L.copy" placement="top">
                <button class="icon-btn" @click="store.copyBindingKey(binding.id)">
                  <CodiconIcon name="copy" />
                </button>
              </el-tooltip>
              <el-tooltip :content="L.removeBinding" placement="top">
                <button class="icon-btn icon-btn-danger" @click="store.removeBinding(binding.id)">
                  <CodiconIcon name="trash" />
                </button>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- Available Models (read-only, collapsible) -->
        <div class="models-section">
          <div class="section-header" @click="modelsExpanded = !modelsExpanded">
            <i :class="['codicon', modelsExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right']"></i>
            <h3 class="section-title" style="margin-bottom: 0">{{ L.availableModels }} ({{ store.dashboard.models.length }})</h3>
          </div>
          <div v-if="modelsExpanded" class="model-list">
            <div v-if="store.dashboard.models.length === 0" class="empty-hint">{{ L.noModels }}</div>
            <div
              v-for="model in store.dashboard.models"
              :key="model.id"
              class="model-row"
            >
              <CodiconIcon name="symbol-misc" />
              <span class="model-name">{{ model.name }}</span>
              <el-tag size="small" type="info">{{ model.vendor }}</el-tag>
              <el-tag size="small">{{ model.family }}</el-tag>
              <span class="model-tokens">{{ formatTokens(model.maxInputTokens) }}</span>
            </div>
          </div>
        </div>

        <!-- Recent Logs -->
        <div class="recent-logs-section">
          <div class="section-header">
            <h3 class="section-title" style="margin-bottom: 0">{{ L.recentLogs }}</h3>
            <div class="section-header-actions">
              <button class="text-btn" @click="store.proxyAction('openLogs')">
                <CodiconIcon name="folder-opened" /> {{ L.openLogsFolder }}
              </button>
              <button class="text-btn" @click="store.openLogViewer()">
                <CodiconIcon name="list-flat" /> {{ L.viewAllLogs }}
              </button>
            </div>
          </div>
          <div v-if="store.dashboard.recentLogs.length === 0" class="empty-hint">{{ L.noLogs }}</div>
          <div v-else class="recent-log-list">
            <div
              v-for="log in store.dashboard.recentLogs"
              :key="log.requestId"
              class="log-row"
              @click="selectedLog = log"
            >
              <CodiconIcon
                :name="log.status === 'success' ? 'check' : 'error'"
                :color="log.status === 'success' ? '#89d185' : '#f48771'"
              />
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <el-tag size="small" type="info">{{ log.format }}</el-tag>
              <span class="log-model">{{ log.model }}</span>
              <span class="log-duration">{{ (log.durationMs / 1000).toFixed(1) }}s</span>
              <span class="log-tokens">
                {{ log.inputTokens }}↑ {{ log.outputTokens }}↓
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EmptyState v-else icon="radio-tower" message="Loading..." />

    <!-- Log Detail Dialog -->
    <LogDetailDialog v-model="selectedLog" :labels="store.dashboard?.labels" />

    <!-- Log Viewer -->
    <LogViewer v-if="store.logViewerOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import CodiconIcon from '@/components/common/CodiconIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ProxyStatCard from '@/components/sections/proxy/ProxyStatCard.vue'
import LogDetailDialog from '@/components/sections/proxy/LogDetailDialog.vue'
import LogViewer from '@/components/sections/proxy/LogViewer.vue'
import { useModelProxyStore } from '@/stores/modelProxyStore'
import { rpcClient } from '@/utils/rpcClient'
import type { ModelProxyLogInfo } from '@ampify/shared'

const store = useModelProxyStore()
const modelsExpanded = ref(false)
const selectedLog = ref<ModelProxyLogInfo | null>(null)

function handleToolbarAction(actionId: string) {
  // Toolbar actions map to VS Code commands via the bridge
  const action = store.toolbar.find(a => a.id === actionId)
  if (action?.command) {
    rpcClient.send({ type: 'executeCommand', command: action.command })
  }
}

const L = computed(() => store.dashboard?.labels || {} as Record<string, string>)

const errorRate = computed(() => {
  if (!store.dashboard) return '0%'
  const { todayRequests, todayErrors } = store.dashboard
  if (todayRequests === 0) return '0%'
  return ((todayErrors / todayRequests) * 100).toFixed(1) + '%'
})

const avgLatency = computed(() => {
  if (!store.dashboard) return '0s'
  return (store.dashboard.avgLatencyMs / 1000).toFixed(2) + 's'
})

function formatTokens(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}

function formatTime(ts: string): string {
  try { return new Date(ts).toLocaleTimeString() }
  catch { return ts }
}
</script>

<style scoped>
.section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.proxy-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground, #717171);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.connection-info {
  margin-bottom: 16px;
}

.conn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.conn-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
  min-width: 60px;
}

.conn-value {
  font-size: 12px;
  font-family: var(--vscode-editor-font-family, monospace);
  color: var(--vscode-foreground, #cccccc);
  background: var(--vscode-textCodeBlock-background, #1e1e1e);
  padding: 2px 6px;
  border-radius: 3px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0.7;
}
.icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31)); }
.icon-btn-danger:hover { color: #f48771; }

.bindings-section { margin-bottom: 16px; }

.binding-list { margin-top: 4px; }

.binding-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}
.binding-row:hover { background: var(--vscode-list-hoverBackground, #2a2d2e); }

.binding-label {
  font-weight: 500;
  min-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.binding-key { flex: 1; }

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 0;
  margin-bottom: 4px;
}

.section-header-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.text-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--vscode-textLink-foreground, #3794ff);
  cursor: pointer;
  font-size: 11px;
}
.text-btn:hover { text-decoration: underline; }

.models-section { margin-bottom: 16px; }

.model-list { margin-top: 4px; }

.model-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}
.model-row:hover { background: var(--vscode-list-hoverBackground, #2a2d2e); }

.model-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.model-tokens { font-size: 11px; color: var(--vscode-descriptionForeground, #717171); }

/* Tone down el-tag in model list to match VS Code dark theme */
.model-row :deep(.el-tag),
.binding-row :deep(.el-tag) {
  background: var(--vscode-badge-background, #4d4d4d);
  color: var(--vscode-badge-foreground, #ffffff);
  border: none;
  font-size: 10px;
  line-height: 16px;
  height: 18px;
  padding: 0 6px;
}
.model-row :deep(.el-tag--info),
.binding-row :deep(.el-tag--info) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--vscode-descriptionForeground, #717171);
}

.empty-hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #717171);
  padding: 8px;
}

.recent-logs-section { margin-bottom: 16px; }

.recent-log-list { margin-top: 4px; }

.log-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
}
.log-row:hover { background: var(--vscode-list-hoverBackground, #2a2d2e); }

.log-time { font-size: 11px; color: var(--vscode-descriptionForeground, #717171); min-width: 70px; }
.log-model { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-duration { font-size: 11px; color: var(--vscode-descriptionForeground, #717171); }
.log-tokens { font-size: 11px; color: var(--vscode-descriptionForeground, #717171); white-space: nowrap; }
</style>
