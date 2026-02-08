<template>
  <div class="empty-state">
    <CodiconIcon :name="icon" />
    <p class="empty-message">{{ message }}</p>
    <p v-if="hint" class="empty-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import CodiconIcon from './CodiconIcon.vue'

defineProps<{
  icon: string
  message: string
  hint?: string
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 8px;
  color: var(--vscode-descriptionForeground, #717171);
}

.empty-state .codicon {
  font-size: 32px;
  opacity: 0.5;
}

.empty-message {
  font-size: 12px;
  text-align: center;
  line-height: 1.4;
  margin: 0;
}

.empty-hint {
  font-size: 11px;
  opacity: 0.65;
  text-align: center;
  margin: 0;
}
</style>
