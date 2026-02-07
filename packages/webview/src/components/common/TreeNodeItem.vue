<template>
  <div class="tree-node">
    <div
      class="tree-row"
      :style="{ paddingLeft: `${depth * 16 + 4}px` }"
      @click="handleClick"
      @contextmenu.prevent="showContextMenu"
    >
      <!-- Expand/Collapse chevron -->
      <span class="tree-chevron" v-if="node.collapsible" @click.stop="emit('toggle', node.id)">
        <i :class="['codicon', isExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right']"></i>
      </span>
      <span class="tree-chevron-placeholder" v-else></span>

      <!-- Icon -->
      <span class="tree-icon" v-if="node.iconId">
        <CodiconIcon :name="node.iconId" :color="node.iconColor" />
      </span>

      <!-- Label + Description -->
      <span class="tree-label" :title="node.tooltip || node.label">{{ node.label }}</span>
      <span class="tree-description" v-if="node.description">{{ node.description }}</span>

      <!-- Inline actions -->
      <div class="tree-inline-actions" v-if="node.inlineActions?.length">
        <el-tooltip
          v-for="action in node.inlineActions"
          :key="action.id"
          :content="action.label"
          placement="top"
          :show-after="500"
        >
          <button
            class="tree-action-btn"
            :class="{ danger: action.danger }"
            @click.stop="emit('action', node.id, action.id)"
          >
            <CodiconIcon :name="action.iconId || 'circle-outline'" />
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- Context menu -->
    <el-dropdown
      ref="contextMenuRef"
      trigger="contextmenu"
      @command="handleContextAction"
      v-if="node.contextActions?.length"
    >
      <span></span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="action in node.contextActions"
            :key="action.id"
            :command="action.id"
          >
            <CodiconIcon :name="action.iconId || 'circle-outline'" />
            <span style="margin-left: 6px">{{ action.label }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- Children (recursive) -->
    <div v-if="node.collapsible && isExpanded && node.children?.length" class="tree-children">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :expanded-nodes="expandedNodes"
        @toggle="emit('toggle', $event)"
        @click="emit('click', $event)"
        @action="(nodeId, actionId) => emit('action', nodeId, actionId)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CodiconIcon from './CodiconIcon.vue'
import type { TreeNode } from '@ampify/shared'

const props = defineProps<{
  node: TreeNode
  depth: number
  expandedNodes: Set<string>
}>()

const emit = defineEmits<{
  toggle: [nodeId: string]
  click: [nodeId: string]
  action: [nodeId: string, actionId: string]
}>()

const isExpanded = computed(() => {
  // Use node's default expanded state if not in the tracked set
  if (props.expandedNodes.has(props.node.id)) return true
  if (props.node.expanded && !props.expandedNodes.has(`_collapsed_${props.node.id}`)) return true
  return false
})

function handleClick() {
  if (props.node.collapsible) {
    emit('toggle', props.node.id)
  } else {
    emit('click', props.node.id)
  }
}

function showContextMenu(_e: MouseEvent) {
  // Context menu handled by el-dropdown
}

function handleContextAction(actionId: string) {
  emit('action', props.node.id, actionId)
}
</script>

<style scoped>
.tree-row {
  display: flex;
  align-items: center;
  padding: 3px 8px 3px 4px;
  cursor: pointer;
  border-radius: 3px;
  min-height: 24px;
  gap: 4px;
}

.tree-row:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.tree-row:hover .tree-inline-actions {
  visibility: visible;
}

.tree-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  min-width: 16px;
  font-size: 14px;
  cursor: pointer;
}

.tree-chevron-placeholder {
  width: 16px;
  min-width: 16px;
}

.tree-icon {
  display: flex;
  align-items: center;
  font-size: 14px;
  min-width: 16px;
}

.tree-label {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-description {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
  margin-left: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-inline-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
  visibility: hidden;
}

.tree-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
}

.tree-action-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
}

.tree-action-btn.danger {
  color: var(--vscode-errorForeground, #f48771);
}

.tree-children {
  /* children are rendered recursively */
}
</style>
