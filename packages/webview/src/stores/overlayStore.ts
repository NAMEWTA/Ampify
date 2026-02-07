/**
 * Overlay Store — manages overlay and confirm dialog state.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rpcClient } from '@/utils/rpcClient'
import type { OverlayData, ConfirmData } from '@ampify/shared'

export const useOverlayStore = defineStore('overlay', () => {
  const overlayData = ref<OverlayData | null>(null)
  const overlayVisible = ref(false)
  const confirmData = ref<ConfirmData | null>(null)
  const confirmVisible = ref(false)

  function showOverlay(data: OverlayData) {
    overlayData.value = data
    overlayVisible.value = true
  }

  function hideOverlay() {
    overlayVisible.value = false
    overlayData.value = null
  }

  function submitOverlay(overlayId: string, values: Record<string, string>) {
    rpcClient.send({ type: 'overlaySubmit', overlayId, values })
    hideOverlay()
  }

  function cancelOverlay(overlayId: string) {
    rpcClient.send({ type: 'overlayCancel', overlayId })
    hideOverlay()
  }

  function showConfirm(data: ConfirmData) {
    confirmData.value = data
    confirmVisible.value = true
  }

  function hideConfirm() {
    confirmVisible.value = false
    confirmData.value = null
  }

  function confirmResult(confirmId: string, confirmed: boolean) {
    rpcClient.send({ type: 'confirmResult', confirmId, confirmed })
    hideConfirm()
  }

  return {
    overlayData,
    overlayVisible,
    confirmData,
    confirmVisible,
    showOverlay,
    hideOverlay,
    submitOverlay,
    cancelOverlay,
    showConfirm,
    hideConfirm,
    confirmResult,
  }
})
