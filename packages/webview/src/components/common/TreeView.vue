<template>
  <div class="tree-view" v-if="nodes.length > 0">
    <TreeNodeItem
      v-for="node in nodes"
      :key="node.id"
      :node="node"
      :depth="0"
      :expanded-nodes="expandedNodes"
      @toggle="emit('toggle', $event)"
      @click="emit('click', $event)"
      @action="(nodeId, actionId) => emit('action', nodeId, actionId)"
    />
  </div>
  <EmptyState v-else :icon="emptyIcon ?? 'info'" :message="emptyMessage ?? 'No items'" :hint="emptyHint" />
</template>

<script setup lang="ts">
import TreeNodeItem from './TreeNodeItem.vue'
import EmptyState from './EmptyState.vue'
import type { TreeNode } from '@ampify/shared'

defineProps<{
  nodes: TreeNode[]
  expandedNodes: Set<string>
  emptyIcon?: string
  emptyMessage?: string
  emptyHint?: string
}>()

const emit = defineEmits<{
  toggle: [nodeId: string]
  click: [nodeId: string]
  action: [nodeId: string, actionId: string]
}>()
</script>

<style scoped>
.tree-view {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
</style>
