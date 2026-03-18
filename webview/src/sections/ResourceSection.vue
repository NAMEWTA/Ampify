<template>
  <section v-if="viewModel" class="section-page resource-page">
    <SectionHeader
      :title="viewModel.title"
      :actions="headerActions"
      @action="actions.toolbar"
    />

    <div v-if="dragActive" class="drop-mask">
      <div class="drop-mask-copy">
        <i class="codicon codicon-folder-library"></i>
        <span>{{ dropLabel }}</span>
      </div>
    </div>

    <ResourceWorkbench
      :section="section"
      :cards="cards"
      :nodes="tree"
      :tags="tags"
      :active-tags="activeTags"
      :progress="progress"
      @card-click="actions.cardClick"
      @card-action="actions.cardAction"
      @card-file-click="actions.cardFileClick"
      @tree-click="actions.treeItemClick"
      @tree-action="actions.treeItemAction"
      @toggle-tag="actions.toggleTag"
      @clear-filter="actions.clearFilter"
      @filter-keyword="actions.filterKeyword"
    />
  </section>
</template>

<script setup lang="ts">
import type { AgentsViewModel, CommandsViewModel, GitShareViewModel, RulesViewModel, SkillsViewModel } from '@shared/contracts';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import ResourceWorkbench from '@/components/ResourceWorkbench.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useAppStore } from '@/stores/app';
import { useProgressStore } from '@/stores/progress';
import { useSectionsStore } from '@/stores/sections';

const props = defineProps<{
  section: 'skills' | 'commands' | 'agents' | 'rules' | 'gitshare';
}>();

const sectionsStore = useSectionsStore();
const appStore = useAppStore();
const progressStore = useProgressStore();
const actions = useSectionActions(props.section);
const dragActive = ref(false);
const dragDepth = ref(0);

const viewModel = computed(() => sectionsStore.sections[props.section] as SkillsViewModel | CommandsViewModel | AgentsViewModel | RulesViewModel | GitShareViewModel | undefined);
const isTaggable = computed(() => props.section === 'skills' || props.section === 'commands' || props.section === 'agents' || props.section === 'rules');
const cards = computed(() => ('cards' in (viewModel.value || {})) ? (viewModel.value as SkillsViewModel | CommandsViewModel | AgentsViewModel | RulesViewModel).cards : []);
const tree = computed(() => ('tree' in (viewModel.value || {})) ? viewModel.value!.tree : []);
const tags = computed(() => ('tags' in (viewModel.value || {})) ? (viewModel.value as SkillsViewModel | CommandsViewModel | AgentsViewModel | RulesViewModel).tags : []);
const activeTags = computed(() => ('activeTags' in (viewModel.value || {})) ? (viewModel.value as SkillsViewModel | CommandsViewModel | AgentsViewModel | RulesViewModel).activeTags : []);
const progress = computed(() => props.section === 'skills' || props.section === 'commands' ? progressStore.map[props.section] : null);
const headerActions = computed(() => (viewModel.value?.toolbar || []).filter((action) => action.id !== 'search'));
const dropLabel = computed(() => {
  if (appStore.bootstrap?.locale === 'en') {
    if (props.section === 'skills') {
      return 'Drop skill folders here to import';
    }
    if (props.section === 'commands') {
      return 'Drop command files here to import';
    }
    if (props.section === 'agents') {
      return 'Drop agent files here to import';
    }
    return 'Drop rule files here to import';
  }
  if (props.section === 'skills') {
    return '将技能文件夹拖到这里导入';
  }
  if (props.section === 'commands') {
    return '将命令文件拖到这里导入';
  }
  if (props.section === 'agents') {
    return '将 agent 文件拖到这里导入';
  }
  return '将 rule 文件拖到这里导入';
});

function handleDragEnter(event: DragEvent) {
  if (!isTaggable.value) {
    return;
  }
  event.preventDefault();
  dragDepth.value += 1;
  dragActive.value = true;
}

function handleDragOver(event: DragEvent) {
  if (!isTaggable.value) {
    return;
  }
  event.preventDefault();
}

function handleDragLeave(event: DragEvent) {
  if (!isTaggable.value) {
    return;
  }
  event.preventDefault();
  dragDepth.value = Math.max(0, dragDepth.value - 1);
  if (dragDepth.value === 0) {
    dragActive.value = false;
  }
}

function extractUris(event: DragEvent): string[] {
  const result: string[] = [];
  const files = event.dataTransfer?.files || [];
  for (const file of Array.from(files)) {
    const withPath = file as File & { path?: string };
    if (withPath.path) {
      result.push(withPath.path);
    }
  }
  const uriList = event.dataTransfer?.getData('text/uri-list') || '';
  uriList
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => result.push(line));
  return Array.from(new Set(result));
}

function handleDrop(event: DragEvent) {
  if (!isTaggable.value) {
    return;
  }
  event.preventDefault();
  dragDepth.value = 0;
  dragActive.value = false;
  const uris = extractUris(event);
  if (uris.length > 0) {
    actions.dropFiles(uris);
  } else {
    actions.dropEmpty();
  }
}

onMounted(() => {
  window.addEventListener('dragenter', handleDragEnter, true);
  window.addEventListener('dragover', handleDragOver, true);
  window.addEventListener('dragleave', handleDragLeave, true);
  window.addEventListener('drop', handleDrop, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', handleDragEnter, true);
  window.removeEventListener('dragover', handleDragOver, true);
  window.removeEventListener('dragleave', handleDragLeave, true);
  window.removeEventListener('drop', handleDrop, true);
});
</script>
