<template>
  <section v-if="progress" class="progress-panel">
    <div class="progress-head">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ progress.completed }}/{{ progress.total }}</span>
      </div>
      <el-tag size="small" :type="progress.running ? 'warning' : 'success'">
        {{ progress.running ? runningLabel : completedLabel }}
      </el-tag>
    </div>
    <el-progress :percentage="progress.percent" :stroke-width="10" :show-text="false" />
    <div class="progress-list">
      <div v-for="item in progress.items" :key="item.id" class="progress-item">
        <span>{{ item.name }}</span>
        <small>{{ item.status }}</small>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AiTaggingProgressData } from '@shared/contracts';
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';

const props = defineProps<{
  progress: AiTaggingProgressData | null;
}>();

const appStore = useAppStore();
const isEnglish = computed(() => appStore.bootstrap?.locale === 'en');
const title = computed(() => {
  if (isEnglish.value) {
    return props.progress?.target === 'skills' ? 'AI Skill Tagging' : 'AI Command Tagging';
  }
  return props.progress?.target === 'skills' ? 'AI 技能标注' : 'AI 命令标注';
});
const runningLabel = computed(() => isEnglish.value ? 'Running' : '运行中');
const completedLabel = computed(() => isEnglish.value ? 'Completed' : '已完成');
</script>
