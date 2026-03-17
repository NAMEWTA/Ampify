<template>
  <div class="shell" :class="{ 'is-collapsed': appStore.navCollapsed }">
    <aside class="shell-sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark" :title="appStore.bootstrap?.brandName || 'Ampify'">A</div>
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

function toggleNav() {
  appStore.setNavCollapsed(!appStore.navCollapsed);
}
</script>
