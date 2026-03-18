<template>
  <div class="shell" :class="{ 'is-collapsed': appStore.navCollapsed }">
    <aside class="shell-sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark" :title="appStore.bootstrap?.brandName || 'Ampify'">A</div>
        <div class="sidebar-copy brand-copy">
          <strong>{{ appStore.bootstrap?.brandName || 'Ampify' }}</strong>
          <span>{{ appStore.bootstrap?.brandTagline || workspaceLabel }}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in appStore.bootstrap?.navItems || []"
          :key="item.id"
          class="sidebar-nav__item"
          :class="{ active: item.id === appStore.activeSection }"
          :title="item.label"
          @click="actions.navigate(item.id)"
        >
          <span class="sidebar-nav__indicator"></span>
          <span class="sidebar-nav__icon">
            <i class="codicon" :class="`codicon-${item.iconId}`"></i>
          </span>
          <span class="sidebar-copy sidebar-nav__copy">
            <strong>{{ item.label }}</strong>
            <small>{{ navDescription(item.id) }}</small>
          </span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button class="shell-icon-button sidebar-toggle" :title="toggleLabel" @click="toggleNav">
          <i class="codicon" :class="appStore.navCollapsed ? 'codicon-layout-sidebar-right' : 'codicon-layout-sidebar-left'"></i>
        </button>
      </div>
    </aside>

    <section class="shell-stage">
      <header class="shell-topbar">
        <div class="shell-topbar__main">
          <button class="shell-icon-button" :title="toggleLabel" @click="toggleNav">
            <i class="codicon" :class="appStore.navCollapsed ? 'codicon-layout-sidebar-right' : 'codicon-layout-sidebar-left'"></i>
          </button>
          <div class="shell-topbar__copy">
            <strong>{{ currentTitle }}</strong>
          </div>
        </div>

        <div class="shell-topbar__actions">
          <span class="shell-chip" :title="localeLabel">{{ localeLabel }}</span>
          <el-button class="shell-refresh-button" plain :title="refreshLabel" @click="actions.executeCommand('ampify.mainView.refresh')">
            <i class="codicon codicon-refresh"></i>
          </el-button>
        </div>
      </header>

      <main class="shell-content">
        <div class="shell-scroll">
          <slot />
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useAppStore } from '@/stores/app';
import { useSectionsStore } from '@/stores/sections';

const appStore = useAppStore();
const sectionsStore = useSectionsStore();
const actions = useSectionActions('dashboard');

const isEnglish = computed(() => appStore.bootstrap?.locale === 'en');
const currentView = computed(() => sectionsStore.sections[appStore.activeSection]);
const currentTitle = computed(() => currentView.value?.title || appStore.bootstrap?.brandName || 'Ampify');
const localeLabel = computed(() => appStore.bootstrap?.locale === 'en' ? 'EN' : 'zh-CN');
const refreshLabel = computed(() => isEnglish.value ? 'Refresh' : '刷新');
const toggleLabel = computed(() => isEnglish.value ? 'Toggle navigation' : '切换导航');
const workspaceLabel = computed(() => isEnglish.value ? 'Workspace command center' : '工作区指挥台');

function toggleNav() {
  appStore.setNavCollapsed(!appStore.navCollapsed);
}

function navDescription(section: string) {
  if (isEnglish.value) {
    const englishMap: Record<string, string> = {
      dashboard: 'Search everything',
      skills: 'Manage skills',
      commands: 'Manage commands',
      agents: 'Manage agents',
      rules: 'Manage rules',
      gitshare: 'Git sync workspace',
      settings: 'Tune paths and Git'
    };
    return englishMap[section] || 'Open section';
  }

  const zhMap: Record<string, string> = {
    dashboard: '全局搜索入口',
    skills: '管理技能资源',
    commands: '管理命令资源',
    agents: '管理 agent 资源',
    rules: '管理 rule 资源',
    gitshare: 'Git 同步工作台',
    settings: '调整路径与 Git'
  };
  return zhMap[section] || '打开分区';
}
</script>
