<template>
  <el-dialog
    v-model="overlayStore.confirmVisible"
    :title="overlayStore.confirmData?.title || ''"
    width="350px"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    @close="handleCancel"
    append-to-body
    destroy-on-close
  >
    <p class="confirm-message">{{ overlayStore.confirmData?.message || '' }}</p>

    <template #footer>
      <el-button size="small" @click="handleCancel">
        {{ overlayStore.confirmData?.cancelLabel || 'Cancel' }}
      </el-button>
      <el-button
        size="small"
        :type="overlayStore.confirmData?.danger ? 'danger' : 'primary'"
        @click="handleConfirm"
      >
        {{ overlayStore.confirmData?.confirmLabel || 'Confirm' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useOverlayStore } from '@/stores/overlayStore'

const overlayStore = useOverlayStore()

function handleConfirm() {
  const confirmId = overlayStore.confirmData?.confirmId
  if (confirmId) {
    overlayStore.confirmResult(confirmId, true)
  }
}

function handleCancel() {
  const confirmId = overlayStore.confirmData?.confirmId
  if (confirmId) {
    overlayStore.confirmResult(confirmId, false)
  }
}
</script>

<style scoped>
.confirm-message {
  font-size: 13px;
  color: var(--vscode-foreground, #cccccc);
  line-height: 1.5;
}
</style>
