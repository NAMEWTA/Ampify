<template>
  <section v-if="progress" class="surface-card progress-card">
    <div class="panel-head">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ progress.completed }}/{{ progress.total }}</p>
      </div>
      <span class="progress-state-pill" :class="{ running: progress.running }">
        {{ progress.running ? runningLabel : completedLabel }}
      </span>
    </div>

    <el-progress :percentage="progress.percent" :stroke-width="10" :show-text="false" />

    <div class="progress-list">
      <div v-for="item in visibleItems" :key="item.id" class="progress-row">
        <span class="progress-row__name">{{ item.name }}</span>
        <small>{{ statusLabel(item.status) }}</small>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AiTaggingProgressData, AiTaggingProgressItem } from '@shared/contracts';
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';

const props = defineProps<{
  progress: AiTaggingProgressData | null;
}>();

const appStore = useAppStore();
const isEnglish = computed(() => appStore.bootstrap?.locale === 'en');
const visibleItems = computed<AiTaggingProgressItem[]>(() => props.progress?.items.slice(0, 6) || []);
const title = computed(() => {
  if (isEnglish.value) {
    return props.progress?.target === 'skills' ? 'AI Skill Tagging' : 'AI Command Tagging';
  }
  return props.progress?.target === 'skills' ? 'AI 技能标注' : 'AI 命令标注';
});
const runningLabel = computed(() => isEnglish.value ? 'Running' : '运行中');
const completedLabel = computed(() => isEnglish.value ? 'Completed' : '已完成');

function statusLabel(status: AiTaggingProgressItem['status']) {
  if (status === 'running') {
    return isEnglish.value ? 'Running' : '运行中';
  }
  if (status === 'success') {
    return isEnglish.value ? 'Success' : '成功';
  }
  if (status === 'failed') {
    return isEnglish.value ? 'Failed' : '失败';
  }
  return isEnglish.value ? 'Pending' : '等待中';
}
</script>
