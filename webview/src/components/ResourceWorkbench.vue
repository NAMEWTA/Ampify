<template>
  <div class="resource-board">
    <div class="resource-board__top" :class="{ 'has-progress': Boolean(progress) }">
      <section class="surface-card resource-summary-card">
        <div class="panel-head">
          <div>
            <h3>{{ summaryTitle }}</h3>
          </div>
          <el-button v-if="hasActiveFilters" text class="inline-text-action" @click="resetFilters">{{ text.reset }}</el-button>
        </div>

        <div class="resource-summary-grid">
          <div class="summary-metric">
            <span class="metric-name">{{ text.items }}</span>
            <strong class="metric-value">{{ totalItems }}</strong>
          </div>
          <div class="summary-metric">
            <span class="metric-name">{{ text.tags }}</span>
            <strong class="metric-value">{{ tags.length }}</strong>
          </div>
          <div class="summary-metric">
            <span class="metric-name">{{ text.status }}</span>
            <strong class="metric-value">{{ progress?.running ? text.running : text.ready }}</strong>
          </div>
        </div>

        <div v-if="isFilterable" class="resource-filter-row">
          <label class="resource-search">
            <i class="codicon codicon-search"></i>
            <el-input
              v-model="keyword"
              clearable
              class="field-full"
              :placeholder="text.searchPlaceholder"
              @clear="emit('filter-keyword', '')"
            />
          </label>
        </div>

        <div v-if="tags.length" class="tag-chip-row">
          <button
            v-for="tag in tags"
            :key="tag"
            class="tag-chip"
            :class="{ active: activeTags.includes(tag) }"
            @click="emit('toggle-tag', tag)"
          >
            {{ tag }}
          </button>
        </div>
      </section>

      <ProgressPanel v-if="progress" :progress="progress" />
    </div>

    <section v-if="cards.length > 0" class="surface-card resource-catalog-panel">
      <div class="panel-head">
        <div>
          <h3>{{ primaryGroup?.title || catalogTitle }}</h3>
        </div>
        <span class="panel-count">{{ totalItems }}</span>
      </div>

      <div v-if="totalItems === 0" class="empty-state">
        {{ emptyText }}
      </div>

      <div v-else class="resource-card-grid">
        <article
          v-for="row in primaryGroup?.rows || []"
          :key="row.key"
          class="resource-card"
          :class="{ clickable: row.clickable }"
          @click="handleRowClick(row)"
        >
          <div class="resource-card__layout">
            <div class="resource-card__main">
              <div class="resource-card__head">
                <span class="resource-card__icon" :style="{ color: row.iconColor || 'var(--amp-accent)' }">
                  <i class="codicon" :class="`codicon-${row.iconId || 'circle-large-outline'}`"></i>
                </span>
                <div class="resource-card__copy">
                  <div class="resource-card__title-row">
                    <strong>{{ row.title }}</strong>
                    <span v-if="row.meta" class="meta-pill">{{ row.meta }}</span>
                  </div>
                  <p v-if="row.description">{{ row.description }}</p>
                </div>
              </div>

              <div v-if="row.badges.length" class="meta-chip-row">
                <span v-for="badge in row.badges" :key="`${row.key}-${badge}`" class="meta-chip">{{ badge }}</span>
              </div>
            </div>

            <div class="resource-card__actions resource-card__actions--rail">
              <el-button
                v-for="action in row.actions"
                :key="`${row.key}-${action.kind}-${action.id}`"
                plain
                size="small"
                class="resource-action-button"
                :type="action.danger ? 'danger' : undefined"
                :title="action.label"
                :aria-label="action.label"
                @click.stop="handleRowAction(row, action)"
              >
                <i v-if="action.iconId" class="codicon" :class="`codicon-${action.iconId}`"></i>
              </el-button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div v-else class="resource-group-grid">
      <article
        v-for="group in groups"
        :key="group.id"
        class="surface-card resource-group-card"
      >
        <div class="panel-head">
          <div>
            <h3>{{ group.title }}</h3>
          </div>
          <span class="panel-count">{{ group.rows.length }}</span>
        </div>

        <div v-if="group.rows.length === 0" class="empty-state">
          {{ emptyText }}
        </div>

        <div v-else class="resource-status-list">
          <article
            v-for="row in group.rows"
            :key="row.key"
            class="resource-status-row"
            :class="{ clickable: row.clickable }"
            @click="handleRowClick(row)"
          >
            <div class="resource-status-row__main">
              <span class="resource-status-row__icon" :style="{ color: row.iconColor || 'var(--amp-accent)' }">
                <i class="codicon" :class="`codicon-${row.iconId || 'circle-large-outline'}`"></i>
              </span>
              <div class="resource-status-row__copy">
                <div class="resource-card__title-row">
                  <strong>{{ row.title }}</strong>
                  <span v-if="row.meta" class="meta-pill">{{ row.meta }}</span>
                </div>
                <p v-if="row.description">{{ row.description }}</p>
                <div v-if="row.badges.length" class="meta-chip-row">
                  <span v-for="badge in row.badges" :key="`${row.key}-${badge}`" class="meta-chip">{{ badge }}</span>
                </div>
              </div>
            </div>

            <div v-if="row.actions.length" class="resource-status-row__actions">
              <el-button
                v-for="action in row.actions"
                :key="`${row.key}-${action.kind}-${action.id}`"
                plain
                size="small"
                class="resource-action-button"
                :type="action.danger ? 'danger' : undefined"
                :title="action.label"
                :aria-label="action.label"
                @click.stop="handleRowAction(row, action)"
              >
                <i v-if="action.iconId" class="codicon" :class="`codicon-${action.iconId}`"></i>
              </el-button>
            </div>
          </article>
        </div>
      </article>
    </div>

    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      size="440px"
      class="resource-drawer"
    >
      <div class="drawer-file-list">
        <button
          v-for="file in drawerFiles"
          :key="file.path"
          class="drawer-file-item"
          @click="openDrawerFile(file.path)"
        >
          <i class="codicon codicon-file"></i>
          <span>{{ file.label }}</span>
        </button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import type { AiTaggingProgressData, CardFileNode, CardItem, TreeAction, TreeNode } from '@shared/contracts';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import ProgressPanel from './ProgressPanel.vue';

type ResourceSectionKind = 'skills' | 'commands' | 'agents' | 'rules' | 'gitshare';

interface DrawerFile {
  label: string;
  path: string;
}

interface RowAction {
  id: string;
  label: string;
  iconId?: string;
  danger?: boolean;
  kind: 'card' | 'tree' | 'files';
}

interface ResourceRow {
  key: string;
  title: string;
  description?: string;
  meta?: string;
  badges: string[];
  iconId?: string;
  iconColor?: string;
  clickable: boolean;
  clickKind?: 'card' | 'tree';
  clickId?: string;
  actions: RowAction[];
  files?: DrawerFile[];
}

interface ResourceGroup {
  id: string;
  title: string;
  description?: string;
  rows: ResourceRow[];
}

const props = defineProps<{
  section: ResourceSectionKind;
  cards: CardItem[];
  nodes: TreeNode[];
  tags: string[];
  activeTags: string[];
  progress: AiTaggingProgressData | null;
}>();

const emit = defineEmits<{
  'toggle-tag': [tag: string];
  'clear-filter': [];
  'filter-keyword': [keyword: string];
  'card-click': [cardId: string];
  'card-action': [cardId: string, actionId: string];
  'card-file-click': [cardId: string, filePath: string];
  'tree-click': [nodeId: string];
  'tree-action': [nodeId: string, actionId: string];
}>();

const appStore = useAppStore();
const keyword = ref('');
const drawerVisible = ref(false);
const drawerTitle = ref('Files');
const drawerFiles = ref<DrawerFile[]>([]);
const drawerCardId = ref('');
let filterTimer: number | undefined;

const isEnglish = computed(() => appStore.bootstrap?.locale === 'en');
const isFilterable = computed(() => props.section === 'skills' || props.section === 'commands' || props.section === 'agents' || props.section === 'rules');
const hasActiveFilters = computed(() => Boolean(keyword.value.trim()) || props.activeTags.length > 0);
const text = computed(() => {
  if (isEnglish.value) {
    return {
      items: 'Items',
      tags: 'Tags',
      status: 'Status',
      running: 'Running',
      ready: 'Ready',
      reset: 'Reset',
      searchPlaceholder: 'Search by name, description, or tag',
      empty: 'No records in this section yet.',
      emptyFiltered: 'No records match the current search or tags.',
      skillsTitle: 'Skills workspace',
      skillsDescription: 'Compact operations for import, apply, preview, and AI tagging.',
      commandsTitle: 'Commands workspace',
      commandsDescription: 'Maintain command assets with tighter list density and direct actions.',
      agentsTitle: 'Agents workspace',
      agentsDescription: 'Manage reusable agent definitions as single-file managed resources.',
      rulesTitle: 'Rules workspace',
      rulesDescription: 'Manage reusable rule files with the same compact resource workflow.',
      gitTitle: 'Git Share workspace',
      gitDescription: 'Repository status, configuration, and synced module visibility.',
      skillsCatalog: 'Skill catalog',
      commandsCatalog: 'Command catalog',
      agentsCatalog: 'Agent catalog',
      rulesCatalog: 'Rule catalog',
      gitCatalog: 'Repository overview',
      skillsCatalogDescription: 'All skills are shown as compact operational cards.',
      commandsCatalogDescription: 'All commands are shown as compact operational cards.',
      agentsCatalogDescription: 'All agents are shown as compact operational cards.',
      rulesCatalogDescription: 'All rules are shown as compact operational cards.',
      gitCatalogDescription: 'Configuration groups and synced modules are shown as compact status lists.',
      overview: 'Overview',
      files: 'Files'
    };
  }

  return {
    items: '项目',
    tags: '标签',
    status: '状态',
    running: '运行中',
    ready: '就绪',
    reset: '重置',
    searchPlaceholder: '按名称、描述或标签搜索',
    empty: '当前分组下暂无记录。',
    emptyFiltered: '当前筛选条件下没有匹配记录。',
    skillsTitle: '技能工作台',
    skillsDescription: '将导入、应用、预览与 AI 标注集中在一个紧凑界面中。',
    commandsTitle: '命令工作台',
    commandsDescription: '用更紧凑的列表密度管理命令资产与直接操作。',
    agentsTitle: 'Agents 工作台',
    agentsDescription: '以单文件受管资源方式管理可复用 agent 定义。',
    rulesTitle: 'Rules 工作台',
    rulesDescription: '以相同的紧凑资源流程管理可复用 rule 文件。',
    gitTitle: 'Git Share 工作台',
    gitDescription: '查看仓库状态、配置与同步模块目录。',
    skillsCatalog: '技能目录',
    commandsCatalog: '命令目录',
    agentsCatalog: 'Agent 目录',
    rulesCatalog: 'Rule 目录',
    gitCatalog: '仓库总览',
    skillsCatalogDescription: '所有技能以紧凑操作卡片方式展示。',
    commandsCatalogDescription: '所有命令以紧凑操作卡片方式展示。',
    agentsCatalogDescription: '所有 agent 以紧凑操作卡片方式展示。',
    rulesCatalogDescription: '所有 rule 以紧凑操作卡片方式展示。',
    gitCatalogDescription: '配置分组与同步模块以紧凑状态列表展示。',
    overview: '总览',
    files: '文件'
  };
});

const summaryTitle = computed(() => {
  if (props.section === 'skills') {
    return text.value.skillsTitle;
  }
  if (props.section === 'commands') {
    return text.value.commandsTitle;
  }
  if (props.section === 'agents') {
    return text.value.agentsTitle;
  }
  if (props.section === 'rules') {
    return text.value.rulesTitle;
  }
  return text.value.gitTitle;
});

const catalogTitle = computed(() => {
  if (props.section === 'skills') {
    return text.value.skillsCatalog;
  }
  if (props.section === 'commands') {
    return text.value.commandsCatalog;
  }
  if (props.section === 'agents') {
    return text.value.agentsCatalog;
  }
  if (props.section === 'rules') {
    return text.value.rulesCatalog;
  }
  return text.value.gitCatalog;
});

const groups = computed<ResourceGroup[]>(() => {
  if (props.cards.length > 0) {
    const sortedCards = [...props.cards].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return [{
      id: `${props.section}-catalog`,
      title: catalogTitle.value,
      rows: sortedCards.map((card) => createCardRow(card))
    }];
  }

  const grouped: ResourceGroup[] = [];
  const overviewRows: ResourceRow[] = [];

  for (const node of props.nodes) {
    if (isGroupNode(node) && node.children?.length) {
      grouped.push({
        id: node.id,
        title: node.label,
        description: node.description,
        rows: flattenTreeRows(node.children, node.label)
      });
      continue;
    }
    overviewRows.push(createTreeRow(node));
  }

  if (overviewRows.length > 0) {
    grouped.unshift({
      id: `${props.section}-overview`,
      title: text.value.overview,
      rows: overviewRows
    });
  }

  return grouped;
});

const primaryGroup = computed(() => groups.value[0]);
const totalItems = computed(() => groups.value.reduce((count, group) => count + group.rows.length, 0));
const emptyText = computed(() => hasActiveFilters.value ? text.value.emptyFiltered : text.value.empty);

watch(keyword, (value) => {
  if (!isFilterable.value) {
    return;
  }
  if (filterTimer) {
    window.clearTimeout(filterTimer);
  }
  filterTimer = window.setTimeout(() => {
    emit('filter-keyword', value.trim());
  }, 220);
});

onBeforeUnmount(() => {
  if (filterTimer) {
    window.clearTimeout(filterTimer);
  }
});

function resetFilters() {
  keyword.value = '';
  emit('clear-filter');
}

function handleRowClick(row: ResourceRow) {
  if (!row.clickable || !row.clickKind || !row.clickId) {
    return;
  }
  if (row.clickKind === 'card') {
    emit('card-click', row.clickId);
    return;
  }
  emit('tree-click', row.clickId);
}

function handleRowAction(row: ResourceRow, action: RowAction) {
  if (action.kind === 'files') {
    drawerTitle.value = `${row.title} ${text.value.files}`;
    drawerFiles.value = row.files || [];
    drawerCardId.value = row.clickId || '';
    drawerVisible.value = true;
    return;
  }

  if (!row.clickId) {
    return;
  }

  if (action.kind === 'card') {
    emit('card-action', row.clickId, action.id);
    return;
  }

  emit('tree-action', row.clickId, action.id);
}

function openDrawerFile(filePath: string) {
  if (drawerCardId.value) {
    emit('card-file-click', drawerCardId.value, filePath);
  }
}

function createCardRow(card: CardItem): ResourceRow {
  const files = flattenFiles(card.fileTree || []);
  const actions: RowAction[] = (card.actions || []).map((action) => ({
    ...action,
    kind: 'card'
  }));

  if (files.length > 0) {
    actions.push({
      id: 'files',
      label: text.value.files,
      iconId: 'files',
      kind: 'files'
    });
  }

  return {
    key: card.id,
    title: card.name,
    description: card.description,
    meta: files.length > 0
      ? isEnglish.value
        ? `${files.length} file${files.length > 1 ? 's' : ''}`
        : `${files.length} 个文件`
      : undefined,
    badges: card.badges || [],
    iconId: card.iconId,
    clickable: Boolean(card.primaryFilePath),
    clickKind: card.primaryFilePath ? 'card' : undefined,
    clickId: card.id,
    actions,
    files
  };
}

function createTreeRow(node: TreeNode, context?: string): ResourceRow {
  const actions = [
    ...(node.inlineActions || []),
    ...(node.contextActions || [])
  ].map((action) => mapTreeAction(action));

  return {
    key: node.id,
    title: node.label,
    description: node.subtitle || node.description,
    meta: node.tertiary || context,
    badges: node.badges || [],
    iconId: node.iconId,
    iconColor: node.iconColor,
    clickable: Boolean(node.command || !node.children?.length),
    clickKind: 'tree',
    clickId: node.id,
    actions
  };
}

function flattenTreeRows(nodes: TreeNode[], context?: string): ResourceRow[] {
  const rows: ResourceRow[] = [];
  for (const node of nodes) {
    if (isGroupNode(node) && node.children?.length) {
      rows.push(...flattenTreeRows(node.children, node.label));
      continue;
    }
    rows.push(createTreeRow(node, context));
    if (node.children?.length) {
      rows.push(...flattenTreeRows(node.children, node.label));
    }
  }
  return rows;
}

function isGroupNode(node: TreeNode): boolean {
  return node.nodeType === 'group' || node.nodeType === 'filesGroup';
}

function mapTreeAction(action: TreeAction): RowAction {
  return {
    id: action.id,
    label: action.label,
    iconId: action.iconId,
    danger: action.danger,
    kind: 'tree'
  };
}

function flattenFiles(nodes: CardFileNode[], prefix = ''): DrawerFile[] {
  const files: DrawerFile[] = [];
  for (const node of nodes) {
    const label = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.isDirectory) {
      files.push(...flattenFiles(node.children || [], label));
      continue;
    }
    files.push({ label, path: node.id });
  }
  return files;
}
</script>
