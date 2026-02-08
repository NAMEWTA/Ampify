<template>
  <div class="file-tree-node">
    <div
      class="file-tree-row"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      :class="{
        'file-tree-row--clickable': !multiSelect && !node.isDirectory,
        'file-tree-row--selected': multiSelect && selectedSet?.has(node.id)
      }"
      @click="handleClick"
    >
      <!-- Checkbox for multi-select -->
      <span class="ftree-checkbox" v-if="multiSelect && isSelectable" @click.stop="emit('toggleSelect', node.id)">
        <i :class="['codicon', selectedSet?.has(node.id) ? 'codicon-check' : 'codicon-circle-large-outline']"></i>
      </span>
      <span class="ftree-checkbox-placeholder" v-else-if="multiSelect"></span>

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

      <!-- Type badge in multi-select mode -->
      <span class="ftree-badge ftree-badge--skill" v-if="multiSelect && itemType === 'skill'">SKILL</span>
    </div>

    <!-- Children -->
    <div v-if="node.isDirectory && expanded && node.children?.length">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :multi-select="multiSelect"
        :selected-set="selectedSet"
        @file-click="emit('fileClick', $event)"
        @toggle-select="emit('toggleSelect', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CodiconIcon from './CodiconIcon.vue'
import type { CardFileNode } from '@ampify/shared'

const props = withDefaults(defineProps<{
  node: CardFileNode
  depth: number
  multiSelect?: boolean
  selectedSet?: Set<string>
}>(), {
  multiSelect: false
})

const emit = defineEmits<{
  fileClick: [filePath: string]
  toggleSelect: [nodeId: string]
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

/**
 * Determine item type for multi-select badges:
 * - Directory with SKILL.md child → 'skill'
 * - .md file (non-SKILL.md) → 'command'
 */
const itemType = computed<'skill' | 'none'>(() => {
  if (!props.multiSelect) { return 'none' }
  if (props.node.isDirectory) {
    const hasSkillMd = props.node.children?.some(c => !c.isDirectory && c.name === 'SKILL.md')
    return hasSkillMd ? 'skill' : 'none'
  }
  return 'none'
})

/** Allow selecting any directory for import */
const isSelectable = computed(() => props.node.isDirectory)

function handleClick() {
  if (props.multiSelect) {
    if (props.node.isDirectory) {
      emit('toggleSelect', props.node.id)
    }
  } else {
    if (props.node.isDirectory) {
      expanded.value = !expanded.value
    } else {
      emit('fileClick', props.node.id)
    }
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

.file-tree-row--selected {
  background: var(--vscode-list-activeSelectionBackground, #094771) !important;
  color: var(--vscode-list-activeSelectionForeground, #ffffff);
}

.file-tree-row:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.ftree-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  min-width: 16px;
  font-size: 14px;
  cursor: pointer;
  color: var(--vscode-textLink-foreground, #3794ff);
}

.ftree-checkbox-placeholder {
  width: 16px;
  min-width: 16px;
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

.ftree-badge {
  margin-left: auto;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.5px;
  line-height: 16px;
  flex-shrink: 0;
}

.ftree-badge--skill {
  background: #788c5d33;
  color: #788c5d;
}

</style>
