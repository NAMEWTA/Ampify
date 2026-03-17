<template>
  <el-dialog
    :model-value="Boolean(store.confirm)"
    :title="store.confirm?.title"
    width="420px"
    class="brand-dialog"
    @close="respond(false)"
  >
    <p class="confirm-copy">{{ store.confirm?.message }}</p>
    <template #footer>
      <div class="dialog-actions">
        <el-button @click="respond(false)">{{ store.confirm?.cancelLabel || 'Cancel' }}</el-button>
        <el-button :type="store.confirm?.danger ? 'danger' : 'primary'" @click="respond(true)">
          {{ store.confirm?.confirmLabel || 'Confirm' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useSectionActions } from '@/composables/useSectionActions';
import { useOverlayStore } from '@/stores/overlay';

const store = useOverlayStore();
const actions = useSectionActions('dashboard');

function respond(confirmed: boolean) {
  if (!store.confirm) {
    return;
  }
  actions.confirmResult(store.confirm.confirmId, confirmed);
}
</script>
