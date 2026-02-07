<template>
  <div class="log-viewer-backdrop" @click.self="store.closeLogViewer()">
    <div class="log-viewer-panel">
      <div class="log-viewer-header">
        <h3>{{ L.logViewerTitle || 'Log Viewer' }}</h3>
        <button class="icon-btn" @click="store.closeLogViewer()">
          <CodiconIcon name="close" />
        </button>
      </div>

      <!-- Toolbar -->
      <div class="log-viewer-toolbar">
        <el-select v-model="selectedYear" size="small" :placeholder="L.logYear || 'Year'" style="width: 90px" @change="onYearChange">
          <el-option v-for="y in years" :key="y" :label="y" :value="y" />
        </el-select>
        <el-select v-model="selectedMonth" size="small" :placeholder="L.logMonth || 'Month'" style="width: 90px" @change="onMonthChange">
          <el-option v-for="m in months" :key="m" :label="m" :value="m" />
        </el-select>
        <el-select v-model="selectedDay" size="small" :placeholder="L.logDay || 'Day'" style="width: 90px" @change="onDayChange">
          <el-option v-for="d in days" :key="d" :label="d" :value="d" />
        </el-select>
        <el-select v-model="statusFilter" size="small" style="width: 100px" @change="doQuery(1)">
          <el-option :label="L.logAll || 'All'" value="all" />
          <el-option :label="L.logSuccess || 'Success'" value="success" />
          <el-option :label="L.logErrors || 'Errors'" value="error" />
        </el-select>
        <el-input
          v-model="keyword"
          size="small"
          :placeholder="L.logSearchPlaceholder || 'Search...'"
          clearable
          style="flex: 1; min-width: 120px"
          @input="debouncedQuery"
        />
      </div>

      <!-- Content -->
      <div class="log-viewer-content">
        <div v-if="!selectedDate" class="empty-hint">{{ L.logSelectDate || 'Select a date to view logs' }}</div>
        <div v-else-if="!store.logQuery" class="empty-hint">Loading...</div>
        <div v-else-if="store.logQuery.entries.length === 0" class="empty-hint">{{ L.logNoResults || 'No results' }}</div>
        <div v-else>
          <div class="log-summary">
            {{ selectedDate }} — {{ store.logQuery.total }} {{ L.logTotalEntries || 'entries' }}
          </div>
          <el-table :data="store.logQuery.entries" size="small" @row-click="onRowClick" style="width: 100%">
            <el-table-column label="Status" width="60">
              <template #default="{ row }">
                <CodiconIcon
                  :name="row.status === 'success' ? 'check' : 'error'"
                  :color="row.status === 'success' ? '#89d185' : '#f48771'"
                />
              </template>
            </el-table-column>
            <el-table-column :label="L.logTime || 'Time'" width="90">
              <template #default="{ row }">
                {{ new Date(row.timestamp).toLocaleTimeString() }}
              </template>
            </el-table-column>
            <el-table-column label="Format" width="70" prop="format" />
            <el-table-column label="Model" prop="model" min-width="120" show-overflow-tooltip />
            <el-table-column :label="L.logDuration || 'Duration'" width="80">
              <template #default="{ row }">
                {{ (row.durationMs / 1000).toFixed(1) }}s
              </template>
            </el-table-column>
            <el-table-column label="Tokens" width="100">
              <template #default="{ row }">
                {{ row.inputTokens }}↑ {{ row.outputTokens }}↓
              </template>
            </el-table-column>
          </el-table>

          <div class="log-pagination" v-if="store.logQuery.totalPages > 1">
            <el-pagination
              small
              layout="prev, pager, next"
              :total="store.logQuery.total"
              :page-size="store.logQuery.pageSize"
              :current-page="store.logQuery.page"
              @current-change="doQuery"
            />
          </div>
        </div>
      </div>

      <!-- Detail dialog -->
      <LogDetailDialog v-model="selectedLog" :labels="store.dashboard?.labels" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import CodiconIcon from '@/components/common/CodiconIcon.vue'
import LogDetailDialog from './LogDetailDialog.vue'
import { useModelProxyStore } from '@/stores/modelProxyStore'
import type { ModelProxyLogInfo } from '@/types/protocol'

const store = useModelProxyStore()
const L = computed(() => store.dashboard?.labels || {} as Record<string, string>)

const selectedYear = ref('')
const selectedMonth = ref('')
const selectedDay = ref('')
const statusFilter = ref<'all' | 'success' | 'error'>('all')
const keyword = ref('')
const selectedLog = ref<ModelProxyLogInfo | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectedDate = computed(() => {
  if (selectedYear.value && selectedMonth.value && selectedDay.value) {
    return `${selectedYear.value}-${selectedMonth.value}-${selectedDay.value}`
  }
  return ''
})

const years = computed(() => [...new Set(store.logFiles.map(f => f.year))].sort().reverse())
const months = computed(() =>
  [...new Set(store.logFiles.filter(f => f.year === selectedYear.value).map(f => f.month))].sort()
)
const days = computed(() =>
  [...new Set(store.logFiles.filter(f => f.year === selectedYear.value && f.month === selectedMonth.value).map(f => f.day))].sort()
)

function onYearChange() {
  selectedMonth.value = ''
  selectedDay.value = ''
}

function onMonthChange() {
  selectedDay.value = ''
}

function onDayChange() {
  if (selectedDate.value) doQuery(1)
}

function doQuery(page: number) {
  if (!selectedDate.value) return
  store.queryLogs(selectedDate.value, page, 20, statusFilter.value, keyword.value || undefined)
}

function debouncedQuery() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => doQuery(1), 300)
}

function onRowClick(row: ModelProxyLogInfo) {
  selectedLog.value = row
}

// Auto-select today on mount
onMounted(() => {
  const today = new Date()
  const y = String(today.getFullYear())
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  if (store.logFiles.some(f => f.year === y && f.month === m && f.day === d)) {
    selectedYear.value = y
    selectedMonth.value = m
    selectedDay.value = d
  }
})

watch(() => store.logFiles, () => {
  // If nothing selected, auto-select today
  if (!selectedYear.value) {
    const today = new Date()
    const y = String(today.getFullYear())
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    if (store.logFiles.some(f => f.year === y && f.month === m && f.day === d)) {
      selectedYear.value = y
      selectedMonth.value = m
      selectedDay.value = d
      doQuery(1)
    }
  }
})
</script>

<style scoped>
.log-viewer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-viewer-panel {
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.log-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
}

.log-viewer-header h3 {
  font-size: 14px;
  font-weight: 600;
}

.log-viewer-toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
  flex-wrap: wrap;
}

.log-viewer-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.empty-hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #717171);
  padding: 16px;
  text-align: center;
}

.log-summary {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #717171);
  margin-bottom: 8px;
}

.log-pagination {
  display: flex;
  justify-content: center;
  padding: 8px 0;
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
  border-radius: 3px;
}
.icon-btn:hover { background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31)); }
</style>
