<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="420px"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    append-to-body
    destroy-on-close
    @close="emit('close')"
  >
    <div class="file-tree-dialog">
      <div class="file-tree-list" v-if="files.length > 0">
        <FileTreeNode
          v-for="node in files"
          :key="node.id"
          :node="node"
          :depth="0"
          :multi-select="multiSelect"
          :selected-set="selectedSet"
          @file-click="handleFileClick"
          @toggle-select="handleToggleSelect"
        />
      </div>
      <div class="file-tree-empty" v-else>
        <CodiconIcon name="folder" />
        <span>No files</span>
      </div>
    </div>
    <template #footer v-if="multiSelect">
      <div class="file-tree-footer">
        <span class="selected-count" v-if="selectedSet.size > 0">
          {{ selectedSet.size }} selected
        </span>
        <el-button @click="visible = false">Cancel</el-button>
        <el-button type="primary" :disabled="selectedSet.size === 0" @click="handleConfirm">
          Confirm
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import CodiconIcon from './CodiconIcon.vue'
import FileTreeNode from './FileTreeNode.vue'
import type { CardFileNode } from '@ampify/shared'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  files: CardFileNode[]
  multiSelect?: boolean
}>(), {
  multiSelect: false
})

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  close: []
  fileClick: [filePath: string]
  confirm: [selectedPaths: string[]]
}>()

const visible = ref(props.modelValue)
const selectedSet = reactive(new Set<string>())

watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => {
  emit('update:modelValue', v)
  if (!v) { selectedSet.clear() }
})

function handleFileClick(filePath: string) {
  if (!props.multiSelect) {
    emit('fileClick', filePath)
  }
}

function handleToggleSelect(nodeId: string) {
  if (selectedSet.has(nodeId)) {
    selectedSet.delete(nodeId)
  } else {
    selectedSet.add(nodeId)
  }
}

function handleConfirm() {
  emit('confirm', Array.from(selectedSet))
  visible.value = false
}
</script>

<style scoped>
.file-tree-dialog {
  max-height: 400px;
  overflow-y: auto;
}

.file-tree-list {
  padding: 4px 0;
}

.file-tree-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: var(--vscode-descriptionForeground, #717171);
  font-size: 12px;
}

.file-tree-empty .codicon {
  font-size: 24px;
  opacity: 0.5;
}

.file-tree-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.selected-count {
  margin-right: auto;
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #717171);
}
</style>
