<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="380px"
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
          @file-click="handleFileClick"
        />
      </div>
      <div class="file-tree-empty" v-else>
        <CodiconIcon name="folder" />
        <span>No files</span>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import CodiconIcon from './CodiconIcon.vue'
import FileTreeNode from './FileTreeNode.vue'
import type { CardFileNode } from '@ampify/shared'

const props = defineProps<{
  modelValue: boolean
  title: string
  files: CardFileNode[]
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  close: []
  fileClick: [filePath: string]
}>()

const visible = ref(props.modelValue)

watch(() => props.modelValue, v => { visible.value = v })
watch(visible, v => { emit('update:modelValue', v) })

function handleFileClick(filePath: string) {
  emit('fileClick', filePath)
}
</script>

<style scoped>
.file-tree-dialog {
  max-height: 360px;
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
</style>
