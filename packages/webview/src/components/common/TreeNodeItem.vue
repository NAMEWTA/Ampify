<template>
  <div class="tree-node">
    <!-- Two-line layout (Skills / Commands) -->
    <div
      v-if="node.layout === 'twoLine'"
      class="tree-row tree-row--two-line"
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
      <span class="tree-icon tree-icon--two-line" v-if="node.iconId">
        <CodiconIcon :name="node.iconId" :color="node.iconColor" />
      </span>

      <!-- Main content area (two lines) -->
      <div class="tree-content">
        <div class="tree-content-row1">
          <span class="tree-label tree-label--primary" :title="node.tooltip || node.label">{{ node.label }}</span>
        </div>
        <div class="tree-content-row2" v-if="node.subtitle || (node.badges && node.badges.length)">
          <span class="tree-subtitle" v-if="node.subtitle" :title="node.subtitle">{{ node.subtitle }}</span>
          <span class="tree-badges" v-if="node.badges && node.badges.length">
            <span
              class="tree-badge"
              v-for="(badge, idx) in displayBadges"
              :key="idx"
            >{{ badge }}</span>
            <span class="tree-badge tree-badge--more" v-if="overflowBadgeCount > 0">+{{ overflowBadgeCount }}</span>
          </span>
        </div>
      </div>

      <!-- Inline actions -->
      <div class="tree-inline-actions tree-inline-actions--two-line" v-if="node.inlineActions?.length">
        <el-tooltip
          v-for="action in node.inlineActions"
          :key="action.id"
          :content="action.label"
          placement="top"
          :show-after="500"
        >
          <button
            class="tree-action-btn"
            :class="{
              danger: action.danger,
              'tree-action-btn--pinned': action.id === node.pinnedActionId
            }"
            @click.stop="emit('action', node.id, action.id)"
          >
            <CodiconIcon :name="action.iconId || 'circle-outline'" />
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- Default single-line layout -->
    <div
      v-else
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

    <!-- Context menu (shared) -->
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

const MAX_BADGES = 3;

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

const displayBadges = computed(() => {
  if (!props.node.badges) return []
  return props.node.badges.slice(0, MAX_BADGES)
})

const overflowBadgeCount = computed(() => {
  if (!props.node.badges) return 0
  return Math.max(0, props.node.badges.length - MAX_BADGES)
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
/* ==================== Shared ==================== */
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

/* ==================== Two-line layout ==================== */
.tree-row--two-line {
  align-items: flex-start;
  padding: 6px 8px 6px 4px;
  min-height: 40px;
  gap: 6px;
}

.tree-row--two-line .tree-chevron,
.tree-row--two-line .tree-chevron-placeholder {
  margin-top: 3px;
}

.tree-icon--two-line {
  font-size: 16px;
  min-width: 18px;
  margin-top: 2px;
  opacity: 0.85;
}

.tree-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tree-content-row1 {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tree-label--primary {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-content-row2 {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tree-subtitle {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}

.tree-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
}

.tree-badge {
  font-size: 10px;
  padding: 0px 6px;
  border-radius: 8px;
  background: var(--vscode-badge-background, #4d4d4d);
  color: var(--vscode-badge-foreground, #ffffff);
  white-space: nowrap;
  line-height: 16px;
}

.tree-badge--more {
  background: transparent;
  color: var(--vscode-descriptionForeground, #717171);
  padding: 0 2px;
  font-size: 10px;
}

/* Pinned action always visible, others on hover */
.tree-inline-actions--two-line {
  margin-top: 2px;
  flex-shrink: 0;
}

.tree-action-btn--pinned {
  visibility: visible !important;
}

.tree-row--two-line .tree-inline-actions {
  visibility: hidden;
}

/* Show pinned action always */
.tree-row--two-line .tree-action-btn--pinned {
  visibility: visible;
}

.tree-row--two-line:hover .tree-inline-actions {
  visibility: visible;
}
</style>
