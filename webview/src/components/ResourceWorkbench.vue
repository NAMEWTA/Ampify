<template>
  <div class="resource-workbench">
    <section class="resource-tools-grid">
      <article class="admin-panel workbench-panel">
        <div class="panel-head">
          <div>
            <h3>{{ summaryTitle }}</h3>
            <p>{{ summaryDescription }}</p>
          </div>
        </div>
        <div class="workbench-kpis">
          <div class="workbench-kpi">
            <span>{{ text.items }}</span>
            <strong>{{ totalItems }}</strong>
          </div>
          <div v-if="tags.length" class="workbench-kpi">
            <span>{{ text.tags }}</span>
            <strong>{{ tags.length }}</strong>
          </div>
          <div class="workbench-kpi">
            <span>{{ text.status }}</span>
            <strong>{{ progress?.running ? text.running : text.ready }}</strong>
          </div>
        </div>
      </article>

      <article v-if="isFilterable" class="admin-panel workbench-panel">
        <div class="panel-head">
          <div>
            <h3>{{ text.filters }}</h3>
            <p>{{ text.filterDescription }}</p>
          </div>
          <el-button v-if="hasActiveFilters" link @click="resetFilters">{{ text.reset }}</el-button>
        </div>

        <el-input
          v-model="keyword"
          clearable
          class="field-full workbench-search"
          :placeholder="text.searchPlaceholder"
          @clear="emit('filter-keyword', '')"
        >
          <template #prefix>
            <i class="codicon codicon-search"></i>
          </template>
        </el-input>

        <div v-if="tags.length" class="tag-cloud">
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
      </article>

      <ProgressPanel v-if="progress" :progress="progress" />
    </section>

    <section class="resource-content">
      <article
        v-for="group in groups"
        :key="group.id"
        class="admin-panel resource-panel"
      >
        <div class="panel-head">
          <div>
            <h3>{{ group.title }}</h3>
            <p v-if="group.description">{{ group.description }}</p>
          </div>
          <span class="panel-count">{{ group.rows.length }}</span>
        </div>

        <div v-if="group.rows.length === 0" class="panel-empty">
          {{ text.empty }}
        </div>

        <div v-else class="resource-list resource-card-list">
          <article
            v-for="row in group.rows"
            :key="row.key"
            class="resource-row"
            :class="{ clickable: row.clickable }"
            @click="handleRowClick(row)"
          >
            <div class="resource-row-main">
              <span class="resource-row-icon" :style="{ color: row.iconColor }">
                <i class="codicon" :class="`codicon-${row.iconId || 'circle-large-outline'}`"></i>
              </span>

              <div class="resource-row-copy">
                <div class="resource-row-title">
                  <strong>{{ row.title }}</strong>
                  <span v-if="row.meta" class="resource-row-meta">{{ row.meta }}</span>
                </div>
                <p v-if="row.description">{{ row.description }}</p>
                <div v-if="row.badges.length" class="resource-row-badges">
                  <span v-for="badge in row.badges" :key="`${row.key}-${badge}`">{{ badge }}</span>
                </div>
              </div>
            </div>

            <div class="resource-row-actions">
              <el-button
                v-for="action in row.actions"
                :key="`${row.key}-${action.kind}-${action.id}`"
                text
                class="resource-action-btn"
                :type="action.danger ? 'danger' : undefined"
                @click.stop="handleRowAction(row, action)"
              >
                <i v-if="action.iconId" class="codicon" :class="`codicon-${action.iconId}`"></i>
                <span>{{ action.label }}</span>
              </el-button>
            </div>
          </article>
        </div>
      </article>
    </section>

    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      size="420px"
      class="brand-dialog"
    >
      <div class="file-list">
        <button
          v-for="file in drawerFiles"
          :key="file.path"
          class="file-list-item"
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

type ResourceSectionKind = 'skills' | 'commands' | 'gitshare';

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
const isFilterable = computed(() => props.section === 'skills' || props.section === 'commands');
const hasActiveFilters = computed(() => Boolean(keyword.value.trim()) || props.activeTags.length > 0);
const text = computed(() => {
  if (isEnglish.value) {
    return {
      items: 'Items',
      tags: 'Tags',
      status: 'Status',
      running: 'Running',
      ready: 'Ready',
      filters: 'Filters',
      filterDescription: 'Search and refine visible items.',
      reset: 'Reset',
      searchPlaceholder: 'Search by name, description, or tag',
      empty: 'No records in this section yet.',
      skillsTitle: 'Skills Workspace',
      skillsDescription: 'Compact operations for import, apply, preview, and tagging.',
      commandsTitle: 'Commands Workspace',
      commandsDescription: 'Browse, apply, and maintain command assets in one list.',
      gitTitle: 'Git Share Workspace',
      gitDescription: 'Repository status, configuration, and synced modules without tree navigation.',
      skillsGroup: 'Skill Catalog',
      skillsGroupDescription: 'All available skills are shown as compact operational rows.',
      commandsGroup: 'Command Catalog',
      commandsGroupDescription: 'All available commands are shown as compact operational rows.',
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
    filters: '筛选',
    filterDescription: '按关键字和标签快速收敛列表。',
    reset: '重置',
    searchPlaceholder: '按名称、描述或标签搜索',
    empty: '当前分组下暂无记录。',
    skillsTitle: '技能工作台',
    skillsDescription: '将导入、应用、预览与 AI 标注收拢到一处。',
    commandsTitle: '命令工作台',
    commandsDescription: '用更紧凑的列表管理命令库与应用流程。',
    gitTitle: 'Git Share 工作台',
    gitDescription: '不再使用树结构，直接查看仓库状态、配置与同步模块。',
    skillsGroup: '技能目录',
    skillsGroupDescription: '所有技能以紧凑操作行方式展示。',
    commandsGroup: '命令目录',
    commandsGroupDescription: '所有命令以紧凑操作行方式展示。',
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
  return text.value.gitTitle;
});

const summaryDescription = computed(() => {
  if (props.section === 'skills') {
    return text.value.skillsDescription;
  }
  if (props.section === 'commands') {
    return text.value.commandsDescription;
  }
  return text.value.gitDescription;
});

const groups = computed<ResourceGroup[]>(() => {
  if (props.cards.length > 0) {
    return [{
      id: `${props.section}-catalog`,
      title: props.section === 'skills' ? text.value.skillsGroup : text.value.commandsGroup,
      description: props.section === 'skills'
        ? text.value.skillsGroupDescription
        : text.value.commandsGroupDescription,
      rows: props.cards.map((card) => createCardRow(card))
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

const totalItems = computed(() => groups.value.reduce((count, group) => count + group.rows.length, 0));

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
      iconId: 'folder-opened',
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
