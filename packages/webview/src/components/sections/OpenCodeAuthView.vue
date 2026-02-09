<template>
  <div class="section-view">
    <SectionToolbar title="OPENCODE AUTH" :actions="store.toolbar" @action="store.handleToolbarAction" />
    <TreeView
      :nodes="store.tree"
      :expanded-nodes="store.expandedNodes"
      empty-icon="key"
      empty-message="No credentials found. Add or import to get started."
      @toggle="store.toggleNodeExpand"
      @click="store.handleItemClick"
      @action="store.executeAction"
    />
  </div>
</template>

<script setup lang="ts">
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import TreeView from '@/components/common/TreeView.vue'
import { useOpenCodeAuthStore } from '@/stores/sectionStore'

const store = useOpenCodeAuthStore()
</script>

<style scoped>
.section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
