<template>
  <el-config-provider namespace="ampify" :locale="locale" size="small" :z-index="4000">
    <AppShell>
      <RouterView />
    </AppShell>
    <OverlayDialog />
    <ConfirmDialog />
  </el-config-provider>
</template>

<script setup lang="ts">
import en from 'element-plus/es/locale/lang/en';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { computed, onMounted } from 'vue';
import AppShell from './components/AppShell.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import OverlayDialog from './components/OverlayDialog.vue';
import { useMessageBus } from './composables/useMessageBus';
import { useAppStore } from './stores/app';

const appStore = useAppStore();
const { mount } = useMessageBus();

const locale = computed(() => appStore.bootstrap?.locale === 'en' ? en : zhCn);

onMounted(() => {
  mount();
});
</script>
