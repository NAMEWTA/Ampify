<template>
  <div class="section-view">
    <SectionToolbar title="GIT SYNC" :actions="store.toolbar" @action="store.handleToolbarAction" />
    <TreeView
      :nodes="store.tree"
      :expanded-nodes="store.expandedNodes"
      empty-icon="git-merge"
      empty-message="Git Share not configured"
      @toggle="store.toggleNodeExpand"
      @click="store.handleItemClick"
      @action="store.executeAction"
    />
  </div>
</template>

<script setup lang="ts">
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import TreeView from '@/components/common/TreeView.vue'
import { useGitShareStore } from '@/stores/sectionStore'

const store = useGitShareStore()
</script>

<style scoped>
.section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
