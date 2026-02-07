/**
 * Settings Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rpcClient } from '@/utils/rpcClient'
import type { SettingsData, SettingsScope } from '@ampify/shared'

export const useSettingsStore = defineStore('settings', () => {
  const data = ref<SettingsData | null>(null)
  const loading = ref(false)

  function setData(newData: SettingsData) {
    data.value = newData
    loading.value = false
  }

  function updateSetting(key: string, value: string, scope: SettingsScope) {
    rpcClient.send({ type: 'changeSetting', key, value, scope })
  }

  function settingsAction(command: string) {
    rpcClient.send({ type: 'settingsAction', command })
  }

  return { data, loading, setData, updateSetting, settingsAction }
})
