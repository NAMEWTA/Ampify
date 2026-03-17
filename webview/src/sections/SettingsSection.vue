<template>
  <section v-if="viewModel" class="section-page">
    <SectionHeader :title="viewModel.title" :subtitle="pageSubtitle" />

    <div class="settings-tabs-layout">
      <aside class="surface-card settings-tabs-card">
        <div class="panel-head">
          <div>
            <h3>{{ tabTitle }}</h3>
          </div>
        </div>

        <el-tabs v-model="activeSectionId" class="settings-tabs">
          <el-tab-pane
            v-for="section in viewModel.data.sections"
            :key="section.id"
            :name="section.id"
          >
            <template #label>
              <span class="settings-tab-label" :title="section.title">
                <strong>{{ section.title }}</strong>
                <small>{{ section.fields.length }} {{ fieldCountLabel }}</small>
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <p class="settings-support-copy">{{ autosaveHint }}</p>
      </aside>

      <article v-if="activeSection" class="surface-card settings-detail-card">
        <div class="panel-head">
          <div>
            <h3>{{ activeSection.title }}</h3>
            <p>{{ detailDescription }}</p>
          </div>
          <span class="panel-count">{{ activeSection.fields.length }}</span>
        </div>

        <div class="settings-form-grid">
          <div
            v-for="field in activeSection.fields"
            :key="`${activeSection.id}-${field.key}-${field.scope}`"
            class="settings-field-card"
            :class="{ 'is-wide': field.kind === 'textarea' }"
          >
            <div class="settings-field-card__copy">
              <label>{{ field.label }}</label>
              <p v-if="field.description">{{ field.description }}</p>
            </div>

            <el-select
              v-if="field.kind === 'select'"
              :model-value="localValues[fieldKey(field)]"
              class="field-full"
              @change="(value: string | number | boolean) => updateField(field.scope, field.key, String(value))"
            >
              <el-option
                v-for="option in field.options || []"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <el-input
              v-else-if="field.kind === 'textarea'"
              v-model="localValues[fieldKey(field)]"
              type="textarea"
              :rows="5"
              :readonly="field.readOnly"
              :placeholder="field.placeholder"
              @blur="updateField(field.scope, field.key, localValues[fieldKey(field)])"
            />

            <el-input
              v-else
              v-model="localValues[fieldKey(field)]"
              :readonly="field.readOnly"
              :placeholder="field.placeholder"
              @blur="updateField(field.scope, field.key, localValues[fieldKey(field)])"
            />

            <div v-if="field.action" class="settings-field-card__actions">
              <el-button plain @click="actions.settingsAction(field.action.command)">
                <i v-if="field.action.iconId" class="codicon" :class="`codicon-${field.action.iconId}`"></i>
                <span>{{ field.action.label }}</span>
              </el-button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SettingsField, SettingsScope, SettingsSection, SettingsViewModel } from '@shared/contracts';
import { computed, reactive, ref, watch } from 'vue';
import SectionHeader from '@/components/SectionHeader.vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useAppStore } from '@/stores/app';
import { useSectionsStore } from '@/stores/sections';

const appStore = useAppStore();
const sectionsStore = useSectionsStore();
const actions = useSectionActions('settings');
const viewModel = computed(() => sectionsStore.sections.settings as SettingsViewModel | undefined);
const localValues = reactive<Record<string, string>>({});
const activeSectionId = ref('');
const isEnglish = computed(() => appStore.bootstrap?.locale === 'en');
const activeSection = computed(() => viewModel.value?.data.sections.find((section) => section.id === activeSectionId.value));
const tabTitle = computed(() => isEnglish.value ? 'Settings tabs' : '设置标签页');
const autosaveHint = computed(() => isEnglish.value ? 'Values are saved when you change or blur each field.' : '字段在变更或失焦时会自动保存。');
const detailDescription = computed(() => isEnglish.value ? 'Current configuration is edited in place. Some fields may require a reload to take effect.' : '当前配置会直接更新，部分字段修改后可能需要重载窗口。');
const fieldCountLabel = computed(() => isEnglish.value ? 'fields' : '项');
const pageSubtitle = computed(() => isEnglish.value
  ? 'Adjust workspace paths and Git settings from a single compact dark form surface.'
  : '在统一紧凑的深色表单界面中调整工作区路径与 Git 配置。');

watch(viewModel, (value) => {
  const sections = value?.data.sections || [];
  if (sections.length > 0 && !sections.some((section) => section.id === activeSectionId.value)) {
    activeSectionId.value = sections[0].id;
  }

  const fields = sections.flatMap((section: SettingsSection) => section.fields);
  for (const field of fields) {
    localValues[fieldKey(field)] = field.value || '';
  }
}, { immediate: true });

function fieldKey(field: SettingsField) {
  return `${field.scope}:${field.key}`;
}

function updateField(scope: SettingsScope, key: string, value: string) {
  actions.settingChange(scope, key, value);
}
</script>
