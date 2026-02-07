/**
 * Message Router composable.
 * Routes incoming legacy messages from the extension host to the appropriate Pinia stores.
 */
import { onMounted, onUnmounted } from 'vue'
import { rpcClient } from '@/utils/rpcClient'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useLauncherStore, useSkillsStore, useCommandsStore, useGitShareStore } from '@/stores/sectionStore'
import { useModelProxyStore } from '@/stores/modelProxyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useOverlayStore } from '@/stores/overlayStore'
import { useAppStore } from '@/stores/appStore'
import type { ExtensionMessage, SectionId } from '@/types/protocol'

export function useMessageRouter() {
  let unsubscribe: (() => void) | undefined

  function getSectionStore(section: SectionId) {
    switch (section) {
      case 'launcher': return useLauncherStore()
      case 'skills': return useSkillsStore()
      case 'commands': return useCommandsStore()
      case 'gitshare': return useGitShareStore()
      default: return null
    }
  }

  function handleMessage(message: ExtensionMessage) {
    switch (message.type) {
      case 'updateDashboard': {
        useDashboardStore().setData(message.data)
        break
      }

      case 'updateSection': {
        if (message.section === 'modelProxy') {
          // Model proxy only sends toolbar via updateSection
          useModelProxyStore().setToolbar(message.toolbar)
        } else {
          const store = getSectionStore(message.section)
          if (store) {
            store.setData(message.tree, message.toolbar, message.tags, message.activeTags)
          }
        }
        break
      }

      case 'setActiveSection': {
        useAppStore().activeSection = message.section
        break
      }

      case 'updateSettings': {
        useSettingsStore().setData(message.data)
        break
      }

      case 'updateModelProxy': {
        useModelProxyStore().setDashboard(message.data)
        break
      }

      case 'updateLogFiles': {
        useModelProxyStore().setLogFiles(message.files)
        break
      }

      case 'updateLogQuery': {
        useModelProxyStore().setLogQuery(message.result)
        break
      }

      case 'showOverlay': {
        useOverlayStore().showOverlay(message.data)
        break
      }

      case 'hideOverlay': {
        useOverlayStore().hideOverlay()
        break
      }

      case 'showConfirm': {
        useOverlayStore().showConfirm(message.data)
        break
      }

      case 'showNotification': {
        // Use Element Plus notification
        import('element-plus').then(({ ElMessage }) => {
          ElMessage({
            message: message.message,
            type: message.level === 'error' ? 'error' : message.level === 'warn' ? 'warning' : 'success',
            duration: 3000,
          })
        })
        break
      }
    }
  }

  onMounted(() => {
    unsubscribe = rpcClient.onMessage(handleMessage)
    // Signal ready to extension
    rpcClient.send({ type: 'ready' })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })
}
