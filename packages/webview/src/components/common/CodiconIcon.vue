<template>
  <i :class="['codicon', `codicon-${name}`]" :style="colorStyle"></i>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  color?: string
}>()

const colorStyle = computed(() => props.color ? { color: props.color } : {})
</script>
