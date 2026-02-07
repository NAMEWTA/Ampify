<template>
  <div class="empty-state">
    <CodiconIcon :name="icon" />
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import CodiconIcon from './CodiconIcon.vue'

defineProps<{
  icon: string
  message: string
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 12px;
  color: var(--vscode-descriptionForeground, #717171);
}

.empty-state .codicon {
  font-size: 32px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 12px;
}
</style>
