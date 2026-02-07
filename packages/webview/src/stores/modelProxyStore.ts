/**
 * Model Proxy Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rpcClient } from '@/utils/rpcClient'
import type { ModelProxyDashboardData, ToolbarAction, LogFileInfo, LogQueryResult } from '@ampify/shared'

export const useModelProxyStore = defineStore('modelProxy', () => {
  const dashboard = ref<ModelProxyDashboardData | null>(null)
  const toolbar = ref<ToolbarAction[]>([])
  const logFiles = ref<LogFileInfo[]>([])
  const logQuery = ref<LogQueryResult | null>(null)
  const logViewerOpen = ref(false)
  const selectedLogDate = ref('')
  const logStatusFilter = ref<'all' | 'success' | 'error'>('all')
  const logKeyword = ref('')
  const loading = ref(false)

  function setDashboard(data: ModelProxyDashboardData) {
    dashboard.value = data
    loading.value = false
  }

  function setToolbar(actions: ToolbarAction[]) {
    toolbar.value = actions
  }

  function setLogFiles(files: LogFileInfo[]) {
    logFiles.value = files
  }

  function setLogQuery(result: LogQueryResult) {
    logQuery.value = result
  }

  function selectModel(modelId: string) {
    rpcClient.send({ type: 'selectProxyModel', modelId })
  }

  function addBinding() {
    rpcClient.send({ type: 'addProxyBinding' })
  }

  function removeBinding(bindingId: string) {
    rpcClient.send({ type: 'removeProxyBinding', bindingId })
  }

  function copyBindingKey(bindingId: string) {
    rpcClient.send({ type: 'copyProxyBindingKey', bindingId })
  }

  function proxyAction(actionId: string) {
    rpcClient.send({ type: 'proxyAction', actionId })
  }

  function requestLogFiles() {
    rpcClient.send({ type: 'requestLogFiles' })
  }

  function queryLogs(date: string, page: number, pageSize: number, statusFilter: 'all' | 'success' | 'error', keyword?: string) {
    selectedLogDate.value = date
    logStatusFilter.value = statusFilter
    logKeyword.value = keyword || ''
    rpcClient.send({ type: 'queryLogs', date, page, pageSize, statusFilter, keyword })
  }

  function openLogViewer() {
    logViewerOpen.value = true
    requestLogFiles()
  }

  function closeLogViewer() {
    logViewerOpen.value = false
    logQuery.value = null
  }

  return {
    dashboard,
    toolbar,
    logFiles,
    logQuery,
    logViewerOpen,
    selectedLogDate,
    logStatusFilter,
    logKeyword,
    loading,
    setDashboard,
    setToolbar,
    setLogFiles,
    setLogQuery,
    selectModel,
    addBinding,
    removeBinding,
    copyBindingKey,
    proxyAction,
    requestLogFiles,
    queryLogs,
    openLogViewer,
    closeLogViewer,
  }
})
