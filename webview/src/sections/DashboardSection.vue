<template>
  <section v-if="viewModel" class="section-page dashboard-page">
    <ActionToolbar :title="viewModel.title" :subtitle="viewModel.subtitle" :actions="[]" />

    <div class="dashboard-hero">
      <article class="dashboard-panel dashboard-hero-card">
        <div class="dashboard-hero-copy">
          <span class="page-eyebrow">{{ workspaceName }}</span>
          <h2>{{ heroTitle }}</h2>
          <p>{{ heroDescription }}</p>
        </div>

        <div class="dashboard-hero-metrics">
          <div class="hero-metric">
            <span>{{ viewModel.data.labels.moduleHealth }}</span>
            <strong>{{ activeModuleCount }}/{{ moduleCount }}</strong>
          </div>
          <div class="hero-metric">
            <span>{{ viewModel.data.labels.gitInfo }}</span>
            <strong>{{ gitStatusLabel }}</strong>
          </div>
          <div class="hero-metric">
            <span>{{ viewModel.data.labels.quickActions }}</span>
            <strong>{{ viewModel.data.quickActions.length }}</strong>
          </div>
        </div>
      </article>

      <article class="dashboard-panel dashboard-quick-panel">
        <div class="panel-head">
          <div>
            <h3>{{ viewModel.data.labels.quickActions }}</h3>
            <p>{{ quickPanelDescription }}</p>
          </div>
        </div>
        <div class="quick-grid">
          <button
            v-for="action in viewModel.data.quickActions"
            :key="action.id"
            class="quick-card"
            @click="runQuickAction(action)"
          >
            <i class="codicon" :class="`codicon-${action.iconId}`"></i>
            <span>{{ action.label }}</span>
          </button>
        </div>
      </article>
    </div>

    <div class="stats-grid">
      <button
        v-for="stat in viewModel.data.stats"
        :key="stat.label"
        class="stat-card"
        :class="{ clickable: stat.targetSection && canNavigate(stat.targetSection) }"
        @click="stat.targetSection && canNavigate(stat.targetSection) && navigateTo(stat.targetSection)"
      >
        <div class="stat-icon" :style="{ background: `${stat.color || '#d97757'}22`, color: stat.color || '#d97757' }">
          <i class="codicon" :class="`codicon-${stat.iconId}`"></i>
        </div>
        <strong>{{ stat.value }}</strong>
        <span>{{ stat.label }}</span>
      </button>
    </div>

    <div class="dashboard-main">
      <article v-if="viewModel.data.moduleHealth?.length" class="dashboard-panel">
        <div class="panel-head">
          <div>
            <h3>{{ viewModel.data.labels.moduleHealth }}</h3>
            <p>{{ modulePanelDescription }}</p>
          </div>
        </div>

        <div class="module-health-list">
          <button
            v-for="item in viewModel.data.moduleHealth"
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
                <p>{{ item.detail }}</p>
              </div>
            </div>
            <el-tag size="small" :type="healthTagType(item.status)">{{ healthLabel(item.status) }}</el-tag>
          </button>
        </div>
      </article>

      <article class="dashboard-panel">
        <div class="panel-head">
          <div>
            <h3>{{ viewModel.data.labels.nextUp }}</h3>
            <p>{{ nextPanelDescription }}</p>
          </div>
        </div>

        <div class="next-up-grid">
          <div v-if="viewModel.data.launcher" class="next-card next-card-compact">
            <strong>{{ viewModel.data.labels.launcher }}</strong>
            <span>{{ viewModel.data.launcher.lastLabel || '-' }}</span>
            <small>{{ viewModel.data.launcher.nextLabel || '-' }}</small>
            <el-button type="primary" plain @click="actions.executeCommand('ampify.launcher.switchNext')">
              {{ switchLabel }}
            </el-button>
          </div>
          <div v-if="viewModel.data.opencode" class="next-card next-card-compact">
            <strong>{{ viewModel.data.labels.opencode }}</strong>
            <span>{{ viewModel.data.opencode.lastLabel || '-' }}</span>
            <small>{{ viewModel.data.opencode.nextLabel || '-' }}</small>
            <el-button type="primary" plain @click="actions.executeCommand('ampify.opencodeAuth.switchNext')">
              {{ switchLabel }}
            </el-button>
          </div>
        </div>
      </article>

      <article class="dashboard-panel">
        <div class="panel-head">
          <div>
            <h3>{{ viewModel.data.labels.gitInfo }}</h3>
            <p>{{ gitPanelDescription }}</p>
          </div>
        </div>

        <div v-if="viewModel.data.gitInfo?.initialized" class="git-summary">
          <strong>{{ viewModel.data.gitInfo.branch }}</strong>
          <span>{{ viewModel.data.gitInfo.remoteUrl }}</span>
          <small>
            {{ viewModel.data.gitInfo.changedFileCount }} changed ·
            {{ viewModel.data.gitInfo.unpushedCount }} unpushed
          </small>
        </div>
        <div v-else class="panel-empty">
          {{ gitEmptyText }}
        </div>
        <div class="git-actions">
          <el-button text @click="actions.executeCommand('ampify.gitShare.sync')">Sync</el-button>
          <el-button text @click="actions.executeCommand('ampify.gitShare.pull')">Pull</el-button>
          <el-button text @click="actions.executeCommand('ampify.gitShare.push')">Push</el-button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DashboardViewModel, ModuleHealthStatus, QuickAction, SectionId } from '@shared/contracts';
import { computed } from 'vue';
import ActionToolbar from '@/components/ActionToolbar.vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useAppStore } from '@/stores/app';
import { useSectionsStore } from '@/stores/sections';

const appStore = useAppStore();
const sectionsStore = useSectionsStore();
const actions = useSectionActions('dashboard');

const viewModel = computed(() => sectionsStore.sections.dashboard as DashboardViewModel | undefined);
const isEnglish = computed(() => appStore.bootstrap?.locale === 'en');
const workspaceName = computed(() => viewModel.value?.data.workspaceInfo?.workspaceName || (isEnglish.value ? 'Workspace' : '工作区'));
const moduleCount = computed(() => viewModel.value?.data.moduleHealth?.length || 0);
const activeModuleCount = computed(() => (viewModel.value?.data.moduleHealth || []).filter((item) => item.status === 'active' || item.status === 'warning').length);
const gitStatusLabel = computed(() => {
  if (!viewModel.value?.data.gitInfo?.initialized) {
    return isEnglish.value ? 'Not Ready' : '未初始化';
  }
  return viewModel.value.data.gitInfo.hasChanges
    ? (isEnglish.value ? 'Needs Sync' : '待同步')
    : (isEnglish.value ? 'Clean' : '干净');
});
const heroTitle = computed(() => isEnglish.value ? 'Operational overview for this workspace' : '当前工作区的统一运营总览');
const heroDescription = computed(() => isEnglish.value
  ? 'Track module readiness, jump into common actions, and keep accounts, assets, and Git share aligned from one console.'
  : '在一个控制台内查看模块就绪度、快速执行常用操作，并统一管理账户、资产与 Git Share 状态。');
const quickPanelDescription = computed(() => isEnglish.value ? 'Common actions for new tasks and fast navigation.' : '面向日常操作的快捷入口。');
const modulePanelDescription = computed(() => isEnglish.value ? 'Module availability and current readiness at a glance.' : '快速查看每个模块当前是否可用、是否需要处理。');
const nextPanelDescription = computed(() => isEnglish.value ? 'Accounts and credentials that are ready to rotate next.' : '下一步可切换的账户与凭证。');
const gitPanelDescription = computed(() => isEnglish.value ? 'Current repository branch, remote, and sync state.' : '当前仓库分支、远端与同步状态。');
const gitEmptyText = computed(() => isEnglish.value ? 'Git Share has not been initialized yet.' : 'Git Share 当前还没有初始化。');
const switchLabel = computed(() => isEnglish.value ? 'Switch' : '切换');

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
  return section === 'dashboard' || section === 'skills' || section === 'commands' || section === 'gitshare' || section === 'settings';
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
