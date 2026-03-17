<template>
  <div class="app-shell">
    <aside class="shell-sidebar" :class="{ collapsed: appStore.navCollapsed }">
      <div class="sidebar-brand">
        <div class="brand-mark">A</div>
        <div v-if="!appStore.navCollapsed" class="brand-copy">
          <strong>{{ appStore.bootstrap?.brandName || 'Ampify' }}</strong>
          <span>{{ appStore.bootstrap?.brandTagline || 'Workspace Command Center' }}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in appStore.bootstrap?.navItems || []"
          :key="item.id"
          class="sidebar-nav-item"
          :class="{ active: item.id === appStore.activeSection }"
          :title="item.label"
          @click="actions.navigate(item.id)"
        >
          <span class="nav-indicator"></span>
          <i class="codicon" :class="`codicon-${item.iconId}`"></i>
          <div v-if="!appStore.navCollapsed" class="nav-copy">
            <strong>{{ item.label }}</strong>
            <small>{{ navDescriptions[item.id] }}</small>
          </div>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="instance-pill" :title="appStore.bootstrap?.instanceKey || 'default'">
          <span>{{ (appStore.bootstrap?.instanceKey || 'default').slice(0, 1).toUpperCase() }}</span>
          <div v-if="!appStore.navCollapsed" class="instance-copy">
            <strong>{{ appStore.bootstrap?.instanceKey || 'default' }}</strong>
            <small>{{ localeLabel }}</small>
          </div>
        </div>
        <button class="nav-toggle" @click="appStore.setNavCollapsed(!appStore.navCollapsed)">
          <i class="codicon" :class="appStore.navCollapsed ? 'codicon-layout-sidebar-right' : 'codicon-layout-sidebar-left'"></i>
        </button>
      </div>
    </aside>

    <section class="app-stage">
      <header class="top-statusbar">
        <div class="topbar-leading">
          <button class="topbar-toggle" @click="appStore.setNavCollapsed(!appStore.navCollapsed)">
            <i class="codicon" :class="appStore.navCollapsed ? 'codicon-layout-sidebar-right' : 'codicon-layout-sidebar-left'"></i>
          </button>
          <div class="topbar-copy">
            <span>{{ activeNav?.label || 'Ampify' }}</span>
            <strong>{{ currentTitle }}</strong>
            <small>{{ currentSubtitle }}</small>
          </div>
        </div>

        <div class="topbar-actions">
          <div class="status-chip">
            <i class="codicon codicon-globe"></i>
            <span>{{ localeLabel }}</span>
          </div>
          <div class="status-chip">
            <i class="codicon codicon-key"></i>
            <span>{{ appStore.bootstrap?.instanceKey || 'default' }}</span>
          </div>
          <el-button type="primary" plain class="topbar-refresh" @click="actions.executeCommand('ampify.mainView.refresh')">
            <i class="codicon codicon-refresh"></i>
            <span>{{ refreshLabel }}</span>
          </el-button>
        </div>
      </header>

      <main class="app-main">
        <div class="app-main-scroll">
          <slot />
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { VisibleSectionId } from '@shared/contracts';
import { computed } from 'vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useAppStore } from '@/stores/app';
import { useSectionsStore } from '@/stores/sections';

const appStore = useAppStore();
const sectionsStore = useSectionsStore();
const actions = useSectionActions('dashboard');

const isEnglish = computed(() => appStore.bootstrap?.locale === 'en');
const navDescriptions = computed<Record<VisibleSectionId, string>>(() => isEnglish.value ? {
  dashboard: 'Overview and quick control',
  accountCenter: '',
  skills: 'Skill library and import workflow',
  commands: 'Command catalog and apply flow',
  gitshare: 'Repository sync and status',
  settings: 'Workspace and module settings'
} : {
  dashboard: '总览与快速操作',
  accountCenter: '',
  skills: '技能库与导入应用流程',
  commands: '命令库与应用流程',
  gitshare: '仓库同步与状态管理',
  settings: '工作区与模块设置'
});

const activeNav = computed(() => appStore.bootstrap?.navItems.find((item) => item.id === appStore.activeSection));
const currentView = computed(() => sectionsStore.sections[appStore.activeSection]);
const currentTitle = computed(() => currentView.value?.title || activeNav.value?.label || 'Ampify');
const currentSubtitle = computed(() => {
  if (currentView.value?.subtitle) {
    return currentView.value.subtitle;
  }
  if (activeNav.value) {
    return navDescriptions.value[activeNav.value.id];
  }
  return isEnglish.value ? 'Workspace command center' : '工作区命令中心';
});
const localeLabel = computed(() => appStore.bootstrap?.locale === 'en' ? 'English' : '中文');
const refreshLabel = computed(() => isEnglish.value ? 'Refresh' : '刷新');
</script>
