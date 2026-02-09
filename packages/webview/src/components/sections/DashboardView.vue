<template>
  <div class="dashboard-view">
    <SectionToolbar title="DASHBOARD" :actions="[]" />

    <div class="dashboard-content" v-if="dashboardStore.data">
      <!-- Module Health Bar -->
      <div class="section-block">
        <h3 class="section-title">{{ dashboardStore.data.labels.moduleHealth }}</h3>
        <div class="health-bar">
          <button
            v-for="mod in dashboardStore.data.moduleHealth"
            :key="mod.moduleId"
            class="health-pill"
            :title="mod.detail"
            @click="dashboardStore.navigateToSection(mod.moduleId)"
          >
            <span class="health-dot" :class="`health-${mod.status}`" />
            <CodiconIcon :name="mod.iconId" :style="{ color: mod.color }" />
            <span class="health-label">{{ mod.label }}</span>
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="section-block">
        <div class="stats-grid">
          <button
            v-for="stat in dashboardStore.data.stats"
            :key="stat.label"
            class="stat-card"
            :class="{ clickable: !!stat.targetSection }"
            @click="stat.targetSection && dashboardStore.navigateToSection(stat.targetSection)"
          >
            <div class="stat-icon" :style="{ color: stat.color || '#d97757', backgroundColor: (stat.color || '#d97757') + '22' }">
              <CodiconIcon :name="stat.iconId" />
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Next Up Panel -->
      <div class="section-block" v-if="hasNextUp">
        <h3 class="section-title">{{ dashboardStore.data.labels.nextUp }}</h3>
        <div class="next-up-grid">
          <!-- Launcher Next Up -->
          <div class="next-up-card" v-if="dashboardStore.data.launcher">
            <div class="next-up-header">
              <CodiconIcon name="rocket" />
              <span class="next-up-module">{{ dashboardStore.data.labels.launcher }}</span>
            </div>
            <div class="next-up-body">
              <div class="next-up-info" v-if="dashboardStore.data.launcher.lastLabel">
                <span class="next-up-label">{{ dashboardStore.data.labels.lastSwitched }}</span>
                <span class="next-up-value">{{ dashboardStore.data.launcher.lastLabel }}</span>
              </div>
              <div class="next-up-info" v-if="dashboardStore.data.launcher.nextLabel">
                <span class="next-up-label">{{ dashboardStore.data.labels.nextAccount }}</span>
                <span class="next-up-value">{{ dashboardStore.data.launcher.nextLabel }}</span>
              </div>
              <div class="next-up-info" v-if="dashboardStore.data.launcher.lastAt">
                <span class="next-up-label">{{ dashboardStore.data.labels.lastSwitched }}</span>
                <span class="next-up-value">{{ formatRelativeTime(dashboardStore.data.launcher.lastAt) }}</span>
              </div>
            </div>
            <div class="next-up-actions">
              <button class="next-up-btn" @click="executeCommand('ampify.launcher.switchNext')">
                <CodiconIcon name="arrow-swap" />
                {{ dashboardStore.data.labels.switchNow }}
              </button>
            </div>
          </div>

          <!-- OpenCode Next Up -->
          <div class="next-up-card" v-if="dashboardStore.data.opencode">
            <div class="next-up-header">
              <CodiconIcon name="key" />
              <span class="next-up-module">{{ dashboardStore.data.labels.opencode }}</span>
            </div>
            <div class="next-up-body">
              <div class="next-up-info" v-if="dashboardStore.data.opencode.lastLabel">
                <span class="next-up-label">{{ dashboardStore.data.labels.activeAccount }}</span>
                <span class="next-up-value">{{ dashboardStore.data.opencode.lastLabel }}</span>
              </div>
              <div class="next-up-info" v-if="dashboardStore.data.opencode.nextLabel">
                <span class="next-up-label">{{ dashboardStore.data.labels.nextAccount }}</span>
                <span class="next-up-value">{{ dashboardStore.data.opencode.nextLabel }}</span>
              </div>
              <div class="next-up-info" v-if="dashboardStore.data.opencode.lastAt">
                <span class="next-up-label">{{ dashboardStore.data.labels.lastSwitched }}</span>
                <span class="next-up-value">{{ formatRelativeTime(dashboardStore.data.opencode.lastAt) }}</span>
              </div>
            </div>
            <div class="next-up-actions">
              <button class="next-up-btn" @click="executeCommand('ampify.opencodeAuth.switchNext')">
                <CodiconIcon name="arrow-swap" />
                {{ dashboardStore.data.labels.switchNow }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Git Info Bar -->
      <div class="section-block" v-if="dashboardStore.data.gitInfo.initialized">
        <h3 class="section-title">{{ dashboardStore.data.labels.gitInfo }}</h3>
        <div class="git-info-bar" :class="{ 'git-has-changes': dashboardStore.data.gitInfo.hasChanges }">
          <div class="git-info-left">
            <span class="git-branch">
              <CodiconIcon name="git-branch" />
              {{ dashboardStore.data.gitInfo.branch || 'main' }}
            </span>
            <span class="git-remote" v-if="dashboardStore.data.gitInfo.remoteUrl" :title="dashboardStore.data.gitInfo.remoteUrl">
              <CodiconIcon name="remote" />
              {{ truncateUrl(dashboardStore.data.gitInfo.remoteUrl) }}
            </span>
            <span class="git-badge" v-if="dashboardStore.data.gitInfo.changedFileCount > 0">
              <CodiconIcon name="diff" /> {{ dashboardStore.data.gitInfo.changedFileCount }}
            </span>
            <span class="git-badge git-badge-warn" v-if="dashboardStore.data.gitInfo.unpushedCount > 0">
              <CodiconIcon name="cloud-upload" /> {{ dashboardStore.data.gitInfo.unpushedCount }}
            </span>
          </div>
          <div class="git-info-actions">
            <el-tooltip :content="dashboardStore.data.labels.gitSync" placement="top">
              <button class="icon-btn" @click="executeCommand('ampify.gitShare.sync')">
                <CodiconIcon name="sync" />
              </button>
            </el-tooltip>
            <el-tooltip :content="dashboardStore.data.labels.gitPull" placement="top">
              <button class="icon-btn" @click="executeCommand('ampify.gitShare.pull')">
                <CodiconIcon name="cloud-download" />
              </button>
            </el-tooltip>
            <el-tooltip :content="dashboardStore.data.labels.gitPush" placement="top">
              <button class="icon-btn" @click="executeCommand('ampify.gitShare.push')">
                <CodiconIcon name="cloud-upload" />
              </button>
            </el-tooltip>
          </div>
        </div>
      </div>

      <!-- Model Proxy Mini Panel -->
      <div class="section-block" v-if="dashboardStore.data.proxyInfo.running">
        <h3 class="section-title">{{ dashboardStore.data.labels.proxyPanel }}</h3>
        <div class="proxy-mini-panel">
          <div class="proxy-mini-status">
            <span class="health-dot health-active" />
            <span>{{ dashboardStore.data.labels.proxyRunning }} :{{ dashboardStore.data.proxyInfo.port }}</span>
          </div>
          <div class="proxy-mini-stats">
            <span class="proxy-mini-stat">
              <CodiconIcon name="pulse" />
              {{ dashboardStore.data.proxyInfo.todayRequests }}
            </span>
            <span class="proxy-mini-stat">
              <CodiconIcon name="symbol-key" />
              {{ dashboardStore.data.proxyInfo.todayTokens }}
            </span>
            <span class="proxy-mini-stat" v-if="dashboardStore.data.proxyInfo.todayErrors > 0" style="color: #f48771">
              <CodiconIcon name="warning" />
              {{ dashboardStore.data.proxyInfo.todayErrors }}
            </span>
          </div>
          <div class="proxy-mini-actions">
            <el-tooltip :content="dashboardStore.data.labels.copyBaseUrl" placement="top">
              <button class="icon-btn" @click="executeCommand('ampify.modelProxy.copyBaseUrl')">
                <CodiconIcon name="copy" />
              </button>
            </el-tooltip>
            <button class="text-link" @click="goToModelProxy">
              {{ dashboardStore.data.labels.viewDetail }} →
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section-block" v-if="dashboardStore.data.quickActions.length">
        <h3 class="section-title">{{ dashboardStore.data.labels.quickActions }}</h3>
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

      <!-- Recent Logs -->
      <div class="section-block">
        <h3 class="section-title">{{ dashboardStore.data.labels.recentLogs }}</h3>
        <div class="recent-logs-table" v-if="dashboardStore.data.recentLogs && dashboardStore.data.recentLogs.length > 0">
          <div class="log-row log-header">
            <span class="log-col log-col-time">{{ dashboardStore.data.labels.logTime }}</span>
            <span class="log-col log-col-model">Model</span>
            <span class="log-col log-col-status">Status</span>
            <span class="log-col log-col-duration">ms</span>
            <span class="log-col log-col-tokens">Tokens</span>
          </div>
          <div
            v-for="(log, idx) in dashboardStore.data.recentLogs"
            :key="idx"
            class="log-row"
          >
            <span class="log-col log-col-time">{{ formatLogTime(log.timestamp) }}</span>
            <span class="log-col log-col-model" :title="log.model">{{ truncateModel(log.model) }}</span>
            <span class="log-col log-col-status">
              <span class="log-status-dot" :class="isSuccessStatus(log.status) ? 'log-status-ok' : 'log-status-err'" />
            </span>
            <span class="log-col log-col-duration">{{ log.durationMs }}</span>
            <span class="log-col log-col-tokens">{{ log.inputTokens + log.outputTokens }}</span>
          </div>
          <button class="text-link log-view-all" @click="goToModelProxyLogs">
            {{ dashboardStore.data.labels.viewAllLogs }} →
          </button>
        </div>
        <div v-else class="recent-logs-empty">
          <EmptyState icon="output" :message="dashboardStore.data.labels.noLogs" />
          <button class="text-link log-view-all" @click="goToModelProxyLogs">
            {{ dashboardStore.data.labels.viewAllLogs }} →
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
import { computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboardStore'
import { rpcClient } from '@/utils/rpcClient'
import type { QuickAction } from '@ampify/shared'

const dashboardStore = useDashboardStore()

const hasNextUp = computed(() => {
  return !!dashboardStore.data?.launcher || !!dashboardStore.data?.opencode
})


function handleQuickAction(action: QuickAction) {
  if (action.action === 'command' && action.command) {
    rpcClient.send({ type: 'executeCommand', command: action.command })
  } else if (action.action === 'toolbar' && action.section && action.actionId) {
    rpcClient.send({ type: 'quickAction', actionId: action.actionId, section: action.section })
  }
}

function executeCommand(command: string) {
  rpcClient.send({ type: 'executeCommand', command })
}

function goToModelProxy() {
  dashboardStore.navigateToSection('modelProxy')
}

function goToModelProxyLogs() {
  dashboardStore.navigateToSection('modelProxy')
}

function truncateUrl(url: string): string {
  if (url.length <= 35) return url
  const parts = url.split('/')
  const repo = parts.slice(-2).join('/')
  return `.../${repo}`
}

function formatLogTime(timestamp: string): string {
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return timestamp
  }
}

function truncateModel(model: string): string {
  if (model.length <= 20) return model
  return model.slice(0, 18) + '…'
}

function isSuccessStatus(status: string): boolean {
  const normalized = status.toLowerCase()
  return normalized === 'ok' || normalized === 'success' || normalized === '200'
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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
  scroll-behavior: smooth;
}

.section-block {
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

/* ===== Module Health Bar ===== */
.health-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.health-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  background: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-foreground, #cccccc);
  border-radius: 16px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s;
}

.health-pill:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
  border-color: var(--vscode-focusBorder, #007fd4);
}

.health-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.health-active { background: #89d185; }
.health-inactive { background: #717171; }
.health-warning { background: #d97757; }
.health-error { background: #f48771; }

.health-label {
  white-space: nowrap;
}

/* ===== Stats Grid ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 6px;
  text-align: left;
  color: inherit;
  font: inherit;
  cursor: default;
  transition: background 0.1s, border-color 0.1s;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
  border-color: var(--vscode-focusBorder, #007fd4);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 16px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
}

/* ===== Git Info Bar ===== */
.git-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 6px;
  font-size: 12px;
}

.git-info-bar.git-has-changes {
  border-color: #d9775744;
  background: #d977570a;
}

.git-info-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.git-branch {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--vscode-foreground, #cccccc);
  font-weight: 500;
}

.git-remote {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--vscode-descriptionForeground, #717171);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.git-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--vscode-badge-background, #4d4d4d);
  color: var(--vscode-badge-foreground, #ffffff);
  font-size: 11px;
}

.git-badge-warn {
  background: #d9775733;
  color: #d97757;
}

.git-info-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
}

.icon-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #5a5d5e50);
}

/* ===== Model Proxy Mini Panel ===== */
.proxy-mini-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 6px;
  font-size: 12px;
  flex-wrap: wrap;
}

.proxy-mini-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #89d185;
  font-weight: 500;
}

.proxy-mini-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--vscode-descriptionForeground, #717171);
}

.proxy-mini-stat {
  display: flex;
  align-items: center;
  gap: 3px;
}

.proxy-mini-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.text-link {
  background: none;
  border: none;
  color: var(--vscode-textLink-foreground, #3794ff);
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}

.text-link:hover {
  text-decoration: underline;
}

/* ===== Quick Actions ===== */
.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
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

/* ===== Recent Logs ===== */
.recent-logs-table {
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 6px;
  overflow: hidden;
}

.log-row {
  display: flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
}

.log-row:last-of-type {
  border-bottom: none;
}

.log-row.log-header {
  font-weight: 600;
  color: var(--vscode-descriptionForeground, #717171);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
}

.log-col {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-col-time { width: 70px; flex-shrink: 0; }
.log-col-model { flex: 1; min-width: 0; }
.log-col-status { width: 36px; flex-shrink: 0; text-align: center; }
.log-col-duration { width: 48px; flex-shrink: 0; text-align: right; }
.log-col-tokens { width: 56px; flex-shrink: 0; text-align: right; }

.log-status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.log-status-ok { background: #89d185; }
.log-status-err { background: #f48771; }

.log-view-all {
  display: block;
  width: 100%;
  padding: 6px 10px;
  text-align: center;
  background: none;
  border: none;
  border-top: 1px solid var(--vscode-panel-border, #2b2b2b);
  color: var(--vscode-textLink-foreground, #3794ff);
  cursor: pointer;
  font-size: 11px;
}

.log-view-all:hover {
  text-decoration: underline;
}

.recent-logs-empty {
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 6px;
  background: var(--vscode-editor-background, #1e1e1e);
}

/* ===== Next Up ===== */
.next-up-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}

.next-up-card {
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.next-up-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 12px;
  color: var(--vscode-foreground, #cccccc);
}

.next-up-header .codicon {
  color: #d97757;
  font-size: 14px;
}

.next-up-module {
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
}

.next-up-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.next-up-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.next-up-label {
  color: var(--vscode-descriptionForeground, #717171);
}

.next-up-value {
  color: var(--vscode-foreground, #cccccc);
  font-weight: 500;
}

.next-up-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.next-up-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #d97757;
  background: transparent;
  color: #d97757;
  cursor: pointer;
  border-radius: 4px;
  font-size: 11px;
  transition: background 0.1s, color 0.1s;
}

.next-up-btn:hover {
  background: #d97757;
  color: #fff;
}

.next-up-btn .codicon {
  font-size: 12px;
}

.next-up-btn--secondary {
  border-color: var(--vscode-panel-border, #2b2b2b);
  color: var(--vscode-foreground, #cccccc);
}

.next-up-btn--secondary:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
  color: var(--vscode-foreground, #ffffff);
  border-color: var(--vscode-foreground, #cccccc);
}

</style>
