<template>
  <div class="file-tree-node">
    <div
      class="file-tree-row"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      :class="{ 'file-tree-row--clickable': !node.isDirectory }"
      @click="handleClick"
    >
      <!-- Chevron for directories -->
      <span class="ftree-chevron" v-if="node.isDirectory" @click.stop="expanded = !expanded">
        <i :class="['codicon', expanded ? 'codicon-chevron-down' : 'codicon-chevron-right']"></i>
      </span>
      <span class="ftree-chevron-placeholder" v-else></span>

      <!-- Icon -->
      <span class="ftree-icon">
        <CodiconIcon :name="node.isDirectory ? (expanded ? 'folder-opened' : 'folder') : fileIcon" />
      </span>

      <!-- Name -->
      <span class="ftree-name">{{ node.name }}</span>
    </div>

    <!-- Children -->
    <div v-if="node.isDirectory && expanded && node.children?.length">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @file-click="emit('fileClick', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CodiconIcon from './CodiconIcon.vue'
import type { CardFileNode } from '@ampify/shared'

const props = defineProps<{
  node: CardFileNode
  depth: number
}>()

const emit = defineEmits<{
  fileClick: [filePath: string]
}>()

const expanded = ref(props.depth < 1) // Auto-expand first level

const fileIcon = computed(() => {
  const name = props.node.name.toLowerCase()
  if (name.endsWith('.md')) return 'markdown'
  if (name.endsWith('.ts') || name.endsWith('.js')) return 'symbol-method'
  if (name.endsWith('.json')) return 'json'
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'symbol-namespace'
  return 'file'
})

function handleClick() {
  if (props.node.isDirectory) {
    expanded.value = !expanded.value
  } else {
    emit('fileClick', props.node.id)
  }
}
</script>

<style scoped>
.file-tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 3px;
  min-height: 24px;
  cursor: default;
  font-size: 12px;
}

.file-tree-row--clickable {
  cursor: pointer;
}

.file-tree-row:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.ftree-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  min-width: 16px;
  font-size: 14px;
  cursor: pointer;
}

.ftree-chevron-placeholder {
  width: 16px;
  min-width: 16px;
}

.ftree-icon {
  display: flex;
  align-items: center;
  font-size: 14px;
  min-width: 16px;
  opacity: 0.8;
}

.ftree-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
