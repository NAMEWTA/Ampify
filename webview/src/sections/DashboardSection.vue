<template>
  <section v-if="viewModel" class="section-page dashboard-page">
    <SectionHeader :title="viewModel.title" />

    <div class="dashboard-overview-grid">
      <article class="surface-card dashboard-hero-card">
        <div class="dashboard-summary-grid">
          <div class="summary-metric">
            <span class="metric-name">{{ viewModel.data.labels.moduleHealth }}</span>
            <strong class="metric-value">{{ activeModuleCount }}/{{ moduleCount }}</strong>
          </div>
          <div class="summary-metric">
            <span class="metric-name">{{ viewModel.data.labels.gitInfo }}</span>
            <strong class="metric-value">{{ gitStatusLabel }}</strong>
          </div>
          <div class="summary-metric">
            <span class="metric-name">{{ viewModel.data.labels.quickActions }}</span>
            <strong class="metric-value">{{ quickActions.length }}</strong>
          </div>
        </div>
      </article>

      <article v-if="quickActions.length" class="surface-card dashboard-action-card">
        <div class="panel-head">
          <div>
            <h3>{{ viewModel.data.labels.quickActions }}</h3>
          </div>
        </div>

        <div class="dashboard-action-grid">
          <button
            v-for="action in quickActions"
            :key="action.id"
            class="dashboard-action-button"
            @click="runQuickAction(action)"
          >
            <span class="dashboard-action-button__icon">
              <i class="codicon" :class="`codicon-${action.iconId}`"></i>
            </span>
            <span>{{ action.label }}</span>
          </button>
        </div>
      </article>
    </div>

    <div class="dashboard-stat-grid">
      <button
        v-for="stat in visibleStats"
        :key="stat.label"
        class="surface-card dashboard-stat-card"
        :class="{ clickable: stat.targetSection && canNavigate(stat.targetSection) }"
        @click="stat.targetSection && canNavigate(stat.targetSection) && navigateTo(stat.targetSection)"
      >
        <div class="dashboard-stat-card__head">
          <span class="dashboard-stat-card__icon" :style="{ color: stat.color || '#d97757' }">
            <i class="codicon" :class="`codicon-${stat.iconId}`"></i>
          </span>
          <span class="dashboard-stat-card__label">{{ stat.label }}</span>
        </div>
        <strong>{{ stat.value }}</strong>
      </button>
    </div>

    <div class="dashboard-detail-grid">
      <article v-if="visibleModuleHealth.length" class="surface-card dashboard-module-card">
        <div class="panel-head">
          <div>
            <h3>{{ viewModel.data.labels.moduleHealth }}</h3>
          </div>
        </div>

        <div class="module-health-list">
          <button
            v-for="item in visibleModuleHealth"
            :key="item.moduleId"
            class="module-health-row"
            :class="{ clickable: canNavigate(item.moduleId) }"
            @click="canNavigate(item.moduleId) && navigateTo(item.moduleId)"
          >
            <div class="module-health-main">
              <span class="module-health-icon" :style="{ color: item.color }">
                <i class="codicon" :class="`codicon-${item.iconId}`"></i>
              </span>
              <div class="module-health-copy">
                <strong>{{ item.label }}</strong>
              </div>
            </div>
            <el-tag size="small" :type="healthTagType(item.status)">{{ healthLabel(item.status) }}</el-tag>
          </button>
        </div>
      </article>

      <article class="surface-card dashboard-git-card">
        <div class="panel-head">
          <div>
            <h3>{{ viewModel.data.labels.gitInfo }}</h3>
          </div>
        </div>

        <div v-if="viewModel.data.gitInfo?.initialized" class="dashboard-kv-list">
          <div class="dashboard-kv-row">
            <span>{{ branchLabel }}</span>
            <strong>{{ viewModel.data.gitInfo.branch || '-' }}</strong>
          </div>
          <div class="dashboard-kv-row">
            <span>{{ remoteLabel }}</span>
            <strong>{{ viewModel.data.gitInfo.remoteUrl || '-' }}</strong>
          </div>
          <div class="dashboard-kv-row">
            <span>{{ changedLabel }}</span>
            <strong>{{ viewModel.data.gitInfo.changedFileCount }}</strong>
          </div>
          <div class="dashboard-kv-row">
            <span>{{ unpushedLabel }}</span>
            <strong>{{ viewModel.data.gitInfo.unpushedCount }}</strong>
          </div>
        </div>
        <div v-else class="empty-state">
          {{ gitEmptyText }}
        </div>

        <div class="dashboard-button-row">
          <el-button plain @click="actions.executeCommand('ampify.gitShare.sync')">{{ viewModel.data.labels.gitSync }}</el-button>
          <el-button plain @click="actions.executeCommand('ampify.gitShare.pull')">{{ viewModel.data.labels.gitPull }}</el-button>
          <el-button plain @click="actions.executeCommand('ampify.gitShare.push')">{{ viewModel.data.labels.gitPush }}</el-button>
        </div>
      </article>

      <article class="surface-card dashboard-meta-card">
        <div class="panel-head">
          <div>
            <h3>{{ workspaceName }}</h3>
          </div>
        </div>

        <div class="dashboard-kv-list is-compact">
          <div class="dashboard-kv-row">
            <span>{{ localePanelLabel }}</span>
            <strong>{{ localeLabel }}</strong>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DashboardViewModel, ModuleHealthStatus, QuickAction, SectionId, VisibleSectionId } from '@shared/contracts';
import { computed } from 'vue';
import SectionHeader from '@/components/SectionHeader.vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useAppStore } from '@/stores/app';
import { useSectionsStore } from '@/stores/sections';

const appStore = useAppStore();
const sectionsStore = useSectionsStore();
const actions = useSectionActions('dashboard');

const viewModel = computed(() => sectionsStore.sections.dashboard as DashboardViewModel | undefined);
const isEnglish = computed(() => appStore.bootstrap?.locale === 'en');
const workspaceName = computed(() => viewModel.value?.data.workspaceInfo?.workspaceName || (isEnglish.value ? 'Workspace' : '工作区'));
const visibleModuleHealth = computed(() => (viewModel.value?.data.moduleHealth || []).filter((item) => isVisibleTarget(item.moduleId)));
const visibleStats = computed(() => (viewModel.value?.data.stats || []).filter((item) => !item.targetSection || isVisibleTarget(item.targetSection)));
const quickActions = computed(() => (viewModel.value?.data.quickActions || []).filter((action) => !action.section || isVisibleTarget(action.section)));
const moduleCount = computed(() => visibleModuleHealth.value.length);
const activeModuleCount = computed(() => visibleModuleHealth.value.filter((item) => item.status === 'active' || item.status === 'warning').length);
const gitStatusLabel = computed(() => {
  if (!viewModel.value?.data.gitInfo?.initialized) {
    return isEnglish.value ? 'Not Ready' : '未初始化';
  }
  return viewModel.value.data.gitInfo.hasChanges
    ? (isEnglish.value ? 'Needs Sync' : '待同步')
    : (isEnglish.value ? 'Clean' : '干净');
});
const gitEmptyText = computed(() => isEnglish.value ? 'Git Share has not been initialized yet.' : 'Git Share 当前还没有初始化。');
const branchLabel = computed(() => isEnglish.value ? 'BR' : '分支');
const remoteLabel = computed(() => isEnglish.value ? 'REM' : '远端');
const changedLabel = computed(() => isEnglish.value ? 'CHG' : '变更文件');
const unpushedLabel = computed(() => isEnglish.value ? 'UP' : '未推送提交');
const localePanelLabel = computed(() => isEnglish.value ? 'LANG' : '语言');
const localeLabel = computed(() => appStore.bootstrap?.locale === 'en' ? 'English' : '中文');

function isVisibleTarget(section?: SectionId): section is VisibleSectionId {
  return section === 'dashboard' || section === 'skills' || section === 'commands' || section === 'gitshare' || section === 'settings';
}

function navigateTo(section: SectionId) {
  actions.navigate(section);
}

function runQuickAction(action: QuickAction) {
  if (action.action === 'toolbar' && action.section && action.actionId) {
    actions.quickAction(action.actionId, action.section);
    return;
  }
  if (action.command) {
    actions.executeCommand(action.command);
  }
}

function canNavigate(section: SectionId) {
  return isVisibleTarget(section);
}

function healthLabel(status: ModuleHealthStatus) {
  if (status === 'active') {
    return isEnglish.value ? 'Active' : '正常';
  }
  if (status === 'warning') {
    return isEnglish.value ? 'Attention' : '关注';
  }
  if (status === 'error') {
    return isEnglish.value ? 'Error' : '异常';
  }
  return isEnglish.value ? 'Idle' : '空闲';
}

function healthTagType(status: ModuleHealthStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'active') {
    return 'success';
  }
  if (status === 'warning') {
    return 'warning';
  }
  if (status === 'error') {
    return 'danger';
  }
  return 'info';
}
</script>
