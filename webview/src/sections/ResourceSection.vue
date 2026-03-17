<template>
  <section v-if="viewModel" class="section-page">
    <ActionToolbar
      :title="viewModel.title"
      :actions="viewModel.toolbar || []"
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
import type { CommandsViewModel, GitShareViewModel, SkillsViewModel } from '@shared/contracts';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import ActionToolbar from '@/components/ActionToolbar.vue';
import ResourceWorkbench from '@/components/ResourceWorkbench.vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useAppStore } from '@/stores/app';
import { useProgressStore } from '@/stores/progress';
import { useSectionsStore } from '@/stores/sections';

const props = defineProps<{
  section: 'skills' | 'commands' | 'gitshare';
}>();

const sectionsStore = useSectionsStore();
const appStore = useAppStore();
const progressStore = useProgressStore();
const actions = useSectionActions(props.section);
const dragActive = ref(false);
const dragDepth = ref(0);

const viewModel = computed(() => sectionsStore.sections[props.section] as SkillsViewModel | CommandsViewModel | GitShareViewModel | undefined);
const isTaggable = computed(() => props.section === 'skills' || props.section === 'commands');
const cards = computed(() => ('cards' in (viewModel.value || {})) ? (viewModel.value as SkillsViewModel | CommandsViewModel).cards : []);
const tree = computed(() => ('tree' in (viewModel.value || {})) ? viewModel.value!.tree : []);
const tags = computed(() => ('tags' in (viewModel.value || {})) ? (viewModel.value as SkillsViewModel | CommandsViewModel).tags : []);
const activeTags = computed(() => ('activeTags' in (viewModel.value || {})) ? (viewModel.value as SkillsViewModel | CommandsViewModel).activeTags : []);
const progress = computed(() => props.section === 'skills' || props.section === 'commands' ? progressStore.map[props.section] : null);
const dropLabel = computed(() => {
  if (appStore.bootstrap?.locale === 'en') {
    return props.section === 'skills'
      ? 'Drop skill folders here to import'
      : 'Drop command files here to import';
  }
  return props.section === 'skills'
    ? '将技能文件夹拖到这里导入'
    : '将命令文件拖到这里导入';
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
