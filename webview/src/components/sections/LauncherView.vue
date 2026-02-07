<template>
  <div class="section-view">
    <SectionToolbar title="LAUNCHER" :actions="store.toolbar" @action="store.handleToolbarAction" />
    <TreeView
      :nodes="store.tree"
      :expanded-nodes="store.expandedNodes"
      empty-icon="rocket"
      empty-message="No instances configured"
      @toggle="store.toggleNodeExpand"
      @click="store.handleItemClick"
      @action="store.executeAction"
    />
  </div>
</template>

<script setup lang="ts">
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import TreeView from '@/components/common/TreeView.vue'
import { useLauncherStore } from '@/stores/sectionStore'

const store = useLauncherStore()
</script>

<style scoped>
.section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
