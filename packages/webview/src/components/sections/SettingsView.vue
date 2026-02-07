<template>
  <div class="section-view">
    <SectionToolbar title="SETTINGS" :actions="[]" />

    <div class="settings-content" v-if="settingsStore.data">
      <div
        v-for="section in settingsStore.data.sections"
        :key="section.id"
        class="settings-section"
      >
        <h3 class="section-title">{{ section.title }}</h3>

        <div v-for="field in section.fields" :key="field.key" class="settings-field">
          <label class="field-label">{{ field.label }}</label>
          <p v-if="field.description" class="field-desc">{{ field.description }}</p>

          <div class="field-input-row">
            <!-- Text input -->
            <el-input
              v-if="field.kind === 'text'"
              :model-value="field.value"
              :placeholder="field.placeholder"
              size="small"
              @input="onFieldChange(field.key, $event, field.scope)"
            />

            <!-- Select -->
            <el-select
              v-else-if="field.kind === 'select'"
              :model-value="field.value"
              size="small"
              style="width: 100%"
              @change="(val: string) => onFieldChange(field.key, val, field.scope)"
            >
              <el-option
                v-for="opt in field.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <!-- Textarea -->
            <el-input
              v-else-if="field.kind === 'textarea'"
              :model-value="field.value"
              type="textarea"
              :rows="2"
              :placeholder="field.placeholder"
              size="small"
              @input="onFieldChange(field.key, $event, field.scope)"
            />

            <!-- Action button -->
            <el-button
              v-if="field.action"
              size="small"
              @click="settingsStore.settingsAction(field.action!.command)"
              style="margin-left: 6px"
            >
              <CodiconIcon v-if="field.action!.iconId" :name="field.action!.iconId" />
              {{ field.action!.label }}
            </el-button>
          </div>
        </div>

        <el-divider />
      </div>
    </div>

    <EmptyState v-else icon="settings-gear" message="Loading..." />
  </div>
</template>

<script setup lang="ts">
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import CodiconIcon from '@/components/common/CodiconIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import type { SettingsScope } from '@ampify/shared'

const settingsStore = useSettingsStore()

let debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

function onFieldChange(key: string, value: string, scope: SettingsScope) {
  // Debounce 400ms
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key)!)
  }
  debounceTimers.set(key, setTimeout(() => {
    settingsStore.updateSetting(key, value, scope)
    debounceTimers.delete(key)
  }, 400))
}
</script>

<style scoped>
.section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.settings-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
  margin-bottom: 12px;
}

.settings-field {
  margin-bottom: 12px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-foreground, #cccccc);
  display: block;
  margin-bottom: 2px;
}

.field-desc {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
  margin-bottom: 4px;
}

.field-input-row {
  display: flex;
  align-items: flex-start;
}
</style>
