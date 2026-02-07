/**
 * App Store — global navigation & app state.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getVsCodeApi } from '@/utils/vscodeApi'
import { rpcClient } from '@/utils/rpcClient'
import type { SectionId } from '@ampify/shared'

export const useAppStore = defineStore('app', () => {
  const activeSection = ref<SectionId>('dashboard')
  const navExpanded = ref(false)
  const instanceKey = ref('default')

  // Restore persisted state
  function restoreState() {
    try {
      const saved = getVsCodeApi().getState() as Record<string, unknown> | null
      if (saved) {
        if (saved.activeSection) activeSection.value = saved.activeSection as SectionId
        if (typeof saved.navExpanded === 'boolean') navExpanded.value = saved.navExpanded
        if (saved.instanceKey) instanceKey.value = saved.instanceKey as string
      }
    } catch {
      // ignore
    }
  }

  function persistState() {
    getVsCodeApi().setState({
      activeSection: activeSection.value,
      navExpanded: navExpanded.value,
      instanceKey: instanceKey.value,
    })
  }

  function switchSection(section: SectionId) {
    activeSection.value = section
    rpcClient.send({ type: 'switchSection', section })
    persistState()
  }

  function toggleNav() {
    navExpanded.value = !navExpanded.value
    persistState()
  }

  function setInstanceKey(key: string) {
    instanceKey.value = key
    persistState()
  }

  return {
    activeSection,
    navExpanded,
    instanceKey,
    restoreState,
    persistState,
    switchSection,
    toggleNav,
    setInstanceKey,
  }
})
