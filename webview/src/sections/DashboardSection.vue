<template>
  <section v-if="viewModel" class="section-page dashboard-page">
    <SectionHeader :title="viewModel.title" />

    <article class="surface-card dashboard-search-shell">
      <div class="dashboard-search-input-row">
        <span class="dashboard-search-input-icon">
          <i class="codicon codicon-search"></i>
        </span>
        <el-input
          v-model="queryDraft"
          class="dashboard-search-input"
          size="large"
          :placeholder="viewModel.data.placeholder"
          clearable
        />
      </div>
      <p class="dashboard-search-hint">{{ viewModel.data.hint }}</p>
      <div class="dashboard-search-meta">
        <span>{{ totalText }}</span>
      </div>
    </article>

    <article v-if="isSearching && results.length" class="surface-card dashboard-search-list-shell">
      <ul class="dashboard-search-name-list">
        <li v-for="result in results" :key="result.id" class="dashboard-search-name-item">
          <div class="dashboard-search-name-row">
            <button class="dashboard-search-name-button" @click="runAction(result.id, result.actions[0]?.id)">
              {{ result.title }}
            </button>
            <el-button
              v-if="getApplyAction(result)"
              plain
              size="small"
              class="dashboard-search-apply-button"
              @click="runAction(result.id, getApplyAction(result)?.id)"
            >
              {{ getApplyAction(result)?.label }}
            </el-button>
          </div>
        </li>
      </ul>
    </article>

    <article v-else class="surface-card empty-state dashboard-search-empty">
      <div>
        <strong>{{ viewModel.data.emptyTitle }}</strong>
        <p>{{ viewModel.data.emptyDescription }}</p>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { DashboardResultAction, DashboardSearchResult, DashboardViewModel } from '@shared/contracts';
import { computed, ref, watch } from 'vue';
import SectionHeader from '@/components/SectionHeader.vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useAppStore } from '@/stores/app';
import { useSectionsStore } from '@/stores/sections';

const appStore = useAppStore();
const sectionsStore = useSectionsStore();
const actions = useSectionActions('dashboard');

const viewModel = computed(() => sectionsStore.sections.dashboard as DashboardViewModel | undefined);
const results = computed(() => viewModel.value?.data.results || []);
const isSearching = computed(() => queryDraft.value.trim().length > 0);
const queryDraft = ref('');

let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => viewModel.value?.data.query,
  (next) => {
    if ((next || '') !== queryDraft.value) {
      queryDraft.value = next || '';
    }
  },
  { immediate: true }
);

watch(queryDraft, (nextValue) => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = setTimeout(() => {
    actions.dashboardSearch(nextValue);
  }, 160);
});

const totalText = computed(() => {
  const total = viewModel.value?.data.total || 0;
  return appStore.bootstrap?.locale === 'en'
    ? `${total} result(s)`
    : `${total} 条结果`;
});

function runAction(resultId: string, actionId?: string) {
  if (!actionId) {
    return;
  }
  actions.dashboardResultAction(resultId, actionId);
}

function getApplyAction(result: DashboardSearchResult): DashboardResultAction | undefined {
  return result.actions.find((action) => action.id === 'apply-skill' || action.id === 'apply-command');
}
</script>
