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
    rpcClient.send({ type: 'ready' })
  }

  function navigateToSection(section: string) {
    rpcClient.send({ type: 'switchSection', section } as any)
  }

  return { data, loading, setData, fetchData, navigateToSection }
})
