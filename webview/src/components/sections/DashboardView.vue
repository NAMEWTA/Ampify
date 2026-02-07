<template>
  <div class="dashboard-view">
    <SectionToolbar title="DASHBOARD" :actions="[]" />

    <div class="dashboard-content" v-if="dashboardStore.data">
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div
          v-for="stat in dashboardStore.data.stats"
          :key="stat.label"
          class="stat-card"
        >
          <div class="stat-icon" :style="{ color: stat.color || '#d97757', backgroundColor: (stat.color || '#d97757') + '22' }">
            <CodiconIcon :name="stat.iconId" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions" v-if="dashboardStore.data.quickActions.length">
        <h3 class="section-title">Quick Actions</h3>
        <div class="quick-action-grid">
          <button
            v-for="action in dashboardStore.data.quickActions"
            :key="action.id"
            class="quick-action-btn"
            @click="handleQuickAction(action)"
          >
            <CodiconIcon :name="action.iconId" />
            <span>{{ action.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <EmptyState v-else icon="dashboard" message="Loading..." />
  </div>
</template>

<script setup lang="ts">
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import CodiconIcon from '@/components/common/CodiconIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useDashboardStore } from '@/stores/dashboardStore'
import { rpcClient } from '@/utils/rpcClient'
import type { QuickAction } from '@/types/protocol'

const dashboardStore = useDashboardStore()

function handleQuickAction(action: QuickAction) {
  if (action.action === 'command' && action.command) {
    rpcClient.send({ type: 'executeCommand', command: action.command })
  } else if (action.action === 'toolbar' && action.section && action.actionId) {
    rpcClient.send({ type: 'quickAction', actionId: action.actionId, section: action.section })
  }
}
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dashboard-content {
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

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 6px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 16px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
}

.stat-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground, #717171);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 6px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  background: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-foreground, #cccccc);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: background 0.1s;
}

.quick-action-btn:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
  border-color: #d97757;
}

.quick-action-btn .codicon {
  color: #d97757;
  font-size: 14px;
}
</style>
