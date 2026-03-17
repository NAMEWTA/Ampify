<template>
  <header class="section-header">
    <div class="section-header__copy">
      <h1>{{ title }}</h1>
    </div>

    <div v-if="actions.length" class="section-header__actions">
      <el-button
        v-for="action in actions"
        :key="action.id"
        class="section-header__action"
        plain
        :title="action.label"
        @click="$emit('action', action.id)"
      >
        <i class="codicon" :class="`codicon-${action.iconId}`"></i>
      </el-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { ToolbarAction } from '@shared/contracts';

withDefaults(defineProps<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ToolbarAction[];
}>(), {
  eyebrow: '',
  subtitle: '',
  actions: () => []
});

defineEmits<{
  action: [actionId: string];
}>();
</script>
