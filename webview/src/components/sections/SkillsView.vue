<template>
  <div class="section-view">
    <SectionToolbar title="SKILLS" :actions="store.toolbar" @action="store.handleToolbarAction" />
    <TagChips
      :tags="store.tags"
      :active-tags="store.activeTags"
      @toggle="store.toggleTag"
      @clear="store.clearFilter"
    />
    <div
      class="tree-container"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      :class="{ 'drop-active': isDragOver }"
    >
      <TreeView
        :nodes="store.tree"
        :expanded-nodes="store.expandedNodes"
        empty-icon="library"
        empty-message="No skills found"
        @toggle="store.toggleNodeExpand"
        @click="store.handleItemClick"
        @action="store.executeAction"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import TreeView from '@/components/common/TreeView.vue'
import TagChips from '@/components/common/TagChips.vue'
import { useSkillsStore } from '@/stores/sectionStore'

const store = useSkillsStore()
const isDragOver = ref(false)

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  if (e.dataTransfer) {
    const uris: string[] = []
    // Handle VS Code URI drops
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (text) {
      text.split('\n').filter(Boolean).forEach(u => uris.push(u.trim()))
    }
    if (uris.length) {
      store.handleDrop(uris)
    }
  }
}
</script>

<style scoped>
.section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  transition: outline 0.15s;
}

.tree-container.drop-active {
  outline: 2px dashed #d97757;
  outline-offset: -2px;
}
</style>
