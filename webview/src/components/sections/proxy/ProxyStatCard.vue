<template>
  <div class="stat-card">
    <div class="stat-icon" :style="{ color, backgroundColor: color + '22' }">
      <CodiconIcon :name="icon" />
    </div>
    <div class="stat-info">
      <span class="stat-value">{{ value }}</span>
      <span class="stat-label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import CodiconIcon from '@/components/common/CodiconIcon.vue'

defineProps<{
  icon: string
  value: string
  label: string
  color: string
}>()
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #2b2b2b);
  border-radius: 6px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 16px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
}
</style>
