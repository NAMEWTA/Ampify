<template>
  <div class="content-area">
    <component :is="currentView" />
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useAppStore } from '@/stores/appStore'
import DashboardView from '@/components/sections/DashboardView.vue'
import LauncherView from '@/components/sections/LauncherView.vue'
import SkillsView from '@/components/sections/SkillsView.vue'
import CommandsView from '@/components/sections/CommandsView.vue'
import GitShareView from '@/components/sections/GitShareView.vue'
import ModelProxyView from '@/components/sections/ModelProxyView.vue'
import SettingsView from '@/components/sections/SettingsView.vue'

const appStore = useAppStore()

const viewMap: Record<string, Component> = {
  dashboard: DashboardView,
  launcher: LauncherView,
  skills: SkillsView,
  commands: CommandsView,
  gitshare: GitShareView,
  modelProxy: ModelProxyView,
  settings: SettingsView,
}

const currentView = computed(() => viewMap[appStore.activeSection] || DashboardView)
</script>

<style scoped>
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
</style>
