/**
 * Dashboard Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rpcClient } from '@/utils/rpcClient'
import type { DashboardData } from '@ampify/shared'

export const useDashboardStore = defineStore('dashboard', () => {
  const data = ref<DashboardData | null>(null)
  const loading = ref(false)

  function setData(newData: DashboardData) {
    data.value = newData
    loading.value = false
  }

  function fetchData() {
    loading.value = true
    // Legacy: extension pushes dashboard data via 'updateDashboard' message on 'ready' or 'switchSection'
    // The data will arrive via the message handler and be set with setData()
    rpcClient.send({ type: 'ready' })
  }

  return { data, loading, setData, fetchData }
})
