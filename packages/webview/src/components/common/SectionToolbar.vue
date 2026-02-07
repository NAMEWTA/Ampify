<template>
  <div class="section-toolbar">
    <span class="toolbar-title">{{ title }}</span>
    <div class="toolbar-actions">
      <el-tooltip
        v-for="action in actions"
        :key="action.id"
        :content="action.label"
        placement="bottom"
        :show-after="500"
      >
        <button class="toolbar-btn" @click="emit('action', action.id)">
          <CodiconIcon :name="action.iconId" />
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import CodiconIcon from './CodiconIcon.vue'
import type { ToolbarAction } from '@ampify/shared'

defineProps<{
  title: string
  actions: ToolbarAction[]
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()
</script>

<style scoped>
.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
  min-height: 32px;
}

.toolbar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vscode-foreground, #cccccc);
  letter-spacing: 0.5px;
}

.toolbar-actions {
  display: flex;
  gap: 2px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0.8;
}

.toolbar-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
  opacity: 1;
}
</style>
