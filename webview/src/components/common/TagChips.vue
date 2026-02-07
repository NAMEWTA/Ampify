<template>
  <div class="tag-chips" v-if="tags.length > 0">
    <button
      v-for="tag in tags"
      :key="tag"
      class="tag-chip"
      :class="{ active: activeTags.includes(tag) }"
      @click="emit('toggle', tag)"
    >
      {{ tag }}
    </button>
    <button v-if="activeTags.length > 0" class="tag-chip clear-chip" @click="emit('clear')">
      <CodiconIcon name="close" /> Clear
    </button>
  </div>
</template>

<script setup lang="ts">
import CodiconIcon from './CodiconIcon.vue'

defineProps<{
  tags: string[]
  activeTags: string[]
}>()

const emit = defineEmits<{
  toggle: [tag: string]
  clear: []
}>()
</script>

<style scoped>
.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--vscode-panel-border, #2b2b2b);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border: 1px solid var(--vscode-panel-border, #454545);
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  font-size: 11px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.1s;
}

.tag-chip:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.tag-chip.active {
  background: #d97757;
  color: #fff;
  border-color: #d97757;
}

.clear-chip {
  color: var(--vscode-errorForeground, #f48771);
  border-color: var(--vscode-errorForeground, #f48771);
}
</style>
