<template>
  <div class="shell is-collapsed">
    <aside class="shell-sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark" :title="appStore.bootstrap?.brandName || 'Ampify'">A</div>
      </div>

      <nav class="sidebar-nav">
        <el-tooltip
          v-for="item in appStore.bootstrap?.navItems || []"
          :key="item.id"
          :content="item.label"
          placement="right"
          :show-after="120"
        >
          <button
          class="sidebar-nav__item"
          :class="{ active: item.id === appStore.activeSection }"
          :title="item.label"
          :aria-label="item.label"
          @click="actions.navigate(item.id)"
          >
            <span class="sidebar-nav__indicator"></span>
            <span class="sidebar-nav__icon">
              <i class="codicon" :class="`codicon-${item.iconId}`"></i>
            </span>
          </button>
        </el-tooltip>
      </nav>
    </aside>

    <section class="shell-stage">
      <header class="shell-topbar">
        <div class="shell-topbar__main">
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
</script>
