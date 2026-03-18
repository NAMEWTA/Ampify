<template>
  <section v-if="viewModel" class="section-page">
    <SectionHeader :title="viewModel.title" :subtitle="pageSubtitle" />

    <div class="settings-tabs-layout">
      <aside class="surface-card settings-tabs-card">
        <div class="settings-switcher-intro">
          <div>
            <h3>{{ tabTitle }}</h3>
            <p>{{ tabDescription }}</p>
          </div>
          <span class="panel-count">{{ sectionCountText }}</span>
        </div>

        <div class="settings-tab-grid" role="tablist" :aria-label="tabTitle">
          <button
            v-for="section in viewModel.data.sections"
            :key="section.id"
            type="button"
            class="settings-tab-button"
            :class="{ active: section.id === activeSectionId }"
            :title="section.title"
            :aria-selected="section.id === activeSectionId"
            @click="activeSectionId = section.id"
          >
            <span class="settings-tab-button__icon">
              <i class="codicon" :class="`codicon-${sectionMeta(section.id).icon}`"></i>
            </span>
            <span class="settings-tab-button__copy">
              <strong>{{ section.title }}</strong>
              <small>{{ sectionMeta(section.id).description }}</small>
            </span>
            <span class="settings-tab-button__count">
              {{ section.fields.length }} {{ fieldCountLabel }}
            </span>
          </button>
        </div>

        <p class="settings-support-copy">{{ autosaveHint }}</p>
      </aside>

      <article v-if="activeSection" class="surface-card settings-detail-card">
        <div class="panel-head">
          <div>
            <h3>{{ activeSection.title }}</h3>
            <p>{{ activeSectionMeta.description }}</p>
          </div>
          <span class="panel-count">{{ activeSection.fields.length }} {{ fieldCountLabel }}</span>
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
const tabDescription = computed(() => isEnglish.value
  ? 'Choose a configuration area first, then edit values directly on the right.'
  : '先选择一个配置分组，再在右侧直接编辑具体字段。');
const autosaveHint = computed(() => isEnglish.value ? 'Values are saved when you change or blur each field.' : '字段在变更或失焦时会自动保存。');
const fieldCountLabel = computed(() => isEnglish.value ? 'fields' : '项');
const sectionCountText = computed(() => isEnglish.value
  ? `${viewModel.value?.data.sections.length || 0} groups`
  : `${viewModel.value?.data.sections.length || 0} 组`);
const pageSubtitle = computed(() => isEnglish.value
  ? 'Switch between configuration groups with a clearer workspace-oriented layout.'
  : '通过更清晰的工作区布局在不同配置分组之间切换。');
const activeSectionMeta = computed(() => sectionMeta(activeSection.value?.id));

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

function sectionMeta(sectionId?: string) {
  if (isEnglish.value) {
    const englishMap: Record<string, { icon: string; description: string }> = {
      general: {
        icon: 'settings-gear',
        description: 'Language and storage preferences for the extension itself.'
      },
      paths: {
        icon: 'folder-library',
        description: 'Injection targets and workspace-relative paths for managed assets.'
      },
      git: {
        icon: 'git-branch',
        description: 'Git identity and remote repository details used by sync actions.'
      }
    };
    return englishMap[sectionId || ''] || {
      icon: 'settings',
      description: 'Edit configuration values for this group.'
    };
  }

  const zhMap: Record<string, { icon: string; description: string }> = {
    general: {
      icon: 'settings-gear',
      description: '设置扩展本身的语言与存储偏好。'
    },
    paths: {
      icon: 'folder-library',
      description: '设置各类资源注入目录与工作区相关路径。'
    },
    git: {
      icon: 'git-branch',
      description: '管理 Git 身份信息与远程仓库地址，供同步操作直接使用。'
    }
  };

  return zhMap[sectionId || ''] || {
    icon: 'settings',
    description: '编辑当前分组中的配置项。'
  };
}
</script>
