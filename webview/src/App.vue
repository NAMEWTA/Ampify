<template>
  <div class="app-layout">
    <NavRail />
    <ContentArea />
    <OverlayPanel />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import NavRail from '@/components/layout/NavRail.vue'
import ContentArea from '@/components/layout/ContentArea.vue'
import OverlayPanel from '@/components/common/OverlayPanel.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAppStore } from '@/stores/appStore'
import { useMessageRouter } from '@/composables/useMessageRouter'

const appStore = useAppStore()

// Initialize message routing from extension → stores
useMessageRouter()

onMounted(() => {
  appStore.restoreState()
})
</script>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
