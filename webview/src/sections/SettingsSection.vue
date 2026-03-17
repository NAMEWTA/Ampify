<template>
  <section v-if="viewModel" class="section-page">
    <ActionToolbar :title="viewModel.title" :actions="[]" />

    <div class="settings-workbench">
      <aside class="admin-panel settings-nav-panel">
        <div class="panel-head">
          <div>
            <h3>{{ navTitle }}</h3>
            <p>{{ navDescription }}</p>
          </div>
        </div>

        <div class="settings-nav-list">
          <button
            v-for="section in viewModel.data.sections"
            :key="section.id"
            class="settings-nav-item"
            :class="{ active: section.id === activeSectionId }"
            @click="activeSectionId = section.id"
          >
            <div class="settings-nav-copy">
              <strong>{{ section.title }}</strong>
              <small>{{ section.fields.length }} {{ fieldCountLabel }}</small>
            </div>
            <i class="codicon codicon-chevron-right"></i>
          </button>
        </div>

        <div class="settings-tip">
          {{ autosaveHint }}
        </div>
      </aside>

      <article v-if="activeSection" class="settings-panel settings-detail-panel">
        <div class="panel-head">
          <div>
            <h3>{{ activeSection.title }}</h3>
            <p>{{ detailDescription }}</p>
          </div>
          <span class="panel-count">{{ activeSection.fields.length }}</span>
        </div>

        <div class="settings-fields">
          <div v-for="field in activeSection.fields" :key="`${activeSection.id}-${field.key}-${field.scope}`" class="settings-field">
            <label>{{ field.label }}</label>
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
              :rows="field.key === 'aiTagging.tagLibrary' ? 8 : 5"
              :readonly="field.readOnly"
              @blur="updateField(field.scope, field.key, localValues[fieldKey(field)])"
            />
            <el-input
              v-else
              v-model="localValues[fieldKey(field)]"
              :readonly="field.readOnly"
              @blur="updateField(field.scope, field.key, localValues[fieldKey(field)])"
            >
              <template v-if="field.action" #append>
                <el-button @click="actions.settingsAction(field.action!.command)">
                  {{ field.action.label }}
                </el-button>
              </template>
            </el-input>
            <small v-if="field.description">{{ field.description }}</small>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SettingsField, SettingsScope, SettingsSection, SettingsViewModel } from '@shared/contracts';
import { computed, reactive, ref, watch } from 'vue';
import ActionToolbar from '@/components/ActionToolbar.vue';
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
const navTitle = computed(() => isEnglish.value ? 'Setting Groups' : '设置分组');
const navDescription = computed(() => isEnglish.value ? 'Choose a category and edit settings in place.' : '选择一个分类并在右侧直接编辑。');
const autosaveHint = computed(() => isEnglish.value ? 'Values are saved when you change or blur each field.' : '字段在变更或失焦时会自动保存。');
const detailDescription = computed(() => isEnglish.value ? 'Current configuration is edited in place. Some fields may require a reload to take effect.' : '当前配置会直接更新，部分字段修改后可能需要重载窗口。');
const fieldCountLabel = computed(() => isEnglish.value ? 'fields' : '项');

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
