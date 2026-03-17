<template>
  <div class="page-header">
    <div class="page-header-copy">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="actions.length > 0" class="page-header-actions">
      <el-button
        v-for="action in actions"
        :key="action.id"
        class="toolbar-btn"
        text
        @click="$emit('action', action.id)"
      >
        <i class="codicon" :class="`codicon-${action.iconId}`"></i>
        <span>{{ action.label }}</span>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolbarAction } from '@shared/contracts';

defineProps<{
  title: string;
  subtitle?: string;
  actions: ToolbarAction[];
}>();

defineEmits<{
  action: [actionId: string];
}>();
</script>
