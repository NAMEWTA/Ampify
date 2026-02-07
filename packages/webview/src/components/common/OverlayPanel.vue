<template>
  <el-dialog
    v-model="overlayStore.overlayVisible"
    :title="overlayStore.overlayData?.title || ''"
    width="400px"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    @close="handleCancel"
    append-to-body
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="formValues"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item
        v-for="field in overlayStore.overlayData?.fields || []"
        :key="field.key"
        :label="field.label"
        :required="field.required"
      >
        <template v-if="field.description">
          <div class="field-description">{{ field.description }}</div>
        </template>

        <!-- Text input -->
        <el-input
          v-if="field.kind === 'text'"
          v-model="formValues[field.key]"
          :placeholder="field.placeholder"
          size="small"
        />

        <!-- Textarea -->
        <el-input
          v-else-if="field.kind === 'textarea'"
          v-model="formValues[field.key]"
          type="textarea"
          :rows="3"
          :placeholder="field.placeholder"
          size="small"
        />

        <!-- Select -->
        <el-select
          v-else-if="field.kind === 'select'"
          v-model="formValues[field.key]"
          :placeholder="field.placeholder"
          size="small"
          style="width: 100%"
        >
          <el-option
            v-for="opt in field.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <!-- Multi-select -->
        <el-checkbox-group
          v-else-if="field.kind === 'multi-select'"
          v-model="multiSelectValues[field.key]"
        >
          <el-checkbox
            v-for="opt in field.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
            size="small"
          />
        </el-checkbox-group>

        <!-- Tags input -->
        <div v-else-if="field.kind === 'tags'" class="tags-input">
          <div class="tags-list">
            <el-tag
              v-for="tag in tagValues[field.key]"
              :key="tag"
              closable
              size="small"
              @close="removeTag(field.key, tag)"
            >
              {{ tag }}
            </el-tag>
          </div>
          <el-input
            v-model="tagInput[field.key]"
            :placeholder="field.placeholder"
            size="small"
            @keydown.enter.prevent="addTag(field.key)"
            @keydown.,="addTag(field.key)"
          />
          <div class="tag-suggestions" v-if="field.options?.length">
            <button
              v-for="opt in getUnselectedOptions(field)"
              :key="opt.value"
              class="tag-suggestion"
              type="button"
              @click="addTagValue(field.key, opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button size="small" @click="handleCancel">
        {{ overlayStore.overlayData?.cancelLabel || 'Cancel' }}
      </el-button>
      <el-button size="small" type="primary" @click="handleSubmit">
        {{ overlayStore.overlayData?.submitLabel || 'Submit' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { useOverlayStore } from '@/stores/overlayStore'
import type { OverlayField } from '@ampify/shared'

const overlayStore = useOverlayStore()
const formRef = ref()
const formValues = reactive<Record<string, string>>({})
const multiSelectValues = reactive<Record<string, string[]>>({})
const tagValues = reactive<Record<string, string[]>>({})
const tagInput = reactive<Record<string, string>>({})

// Initialize form values when overlay opens
watch(() => overlayStore.overlayData, (data) => {
  if (!data) return
  // Clear previous values
  Object.keys(formValues).forEach(k => delete formValues[k])
  Object.keys(multiSelectValues).forEach(k => delete multiSelectValues[k])
  Object.keys(tagValues).forEach(k => delete tagValues[k])
  Object.keys(tagInput).forEach(k => delete tagInput[k])

  for (const field of data.fields) {
    if (field.kind === 'multi-select') {
      multiSelectValues[field.key] = field.value ? field.value.split(',').filter(Boolean) : []
    } else if (field.kind === 'tags') {
      tagValues[field.key] = field.value ? field.value.split(',').filter(Boolean) : []
      tagInput[field.key] = ''
    } else {
      formValues[field.key] = field.value || ''
    }
  }
}, { immediate: true })

function addTag(fieldKey: string) {
  const val = tagInput[fieldKey]?.trim()
  if (val && !tagValues[fieldKey]?.includes(val)) {
    if (!tagValues[fieldKey]) tagValues[fieldKey] = []
    tagValues[fieldKey].push(val)
  }
  tagInput[fieldKey] = ''
}

function addTagValue(fieldKey: string, value: string) {
  if (!tagValues[fieldKey]?.includes(value)) {
    if (!tagValues[fieldKey]) tagValues[fieldKey] = []
    tagValues[fieldKey].push(value)
  }
}

function removeTag(fieldKey: string, tag: string) {
  const idx = tagValues[fieldKey]?.indexOf(tag)
  if (idx !== undefined && idx >= 0) {
    tagValues[fieldKey].splice(idx, 1)
  }
}

function getUnselectedOptions(field: OverlayField) {
  return (field.options || []).filter(opt => !tagValues[field.key]?.includes(opt.value))
}

function handleSubmit() {
  const overlayId = overlayStore.overlayData?.overlayId
  if (!overlayId) return

  // Validate required fields
  const fields = overlayStore.overlayData?.fields || []
  for (const field of fields) {
    if (field.required) {
      const val = getFieldValue(field)
      if (!val?.trim()) {
        // Could show validation error, but for now just skip
        return
      }
    }
  }

  // Collect all values
  const values: Record<string, string> = {}
  for (const field of fields) {
    values[field.key] = getFieldValue(field)
  }

  overlayStore.submitOverlay(overlayId, values)
}

function getFieldValue(field: OverlayField): string {
  if (field.kind === 'multi-select') {
    return (multiSelectValues[field.key] || []).join(',')
  } else if (field.kind === 'tags') {
    return (tagValues[field.key] || []).join(',')
  } else {
    return formValues[field.key] || ''
  }
}

function handleCancel() {
  const overlayId = overlayStore.overlayData?.overlayId
  if (overlayId) {
    overlayStore.cancelOverlay(overlayId)
  }
}
</script>

<style scoped>
.field-description {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
  margin-bottom: 4px;
}

.tags-input {
  width: 100%;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.tag-suggestion {
  padding: 1px 6px;
  border: 1px dashed var(--vscode-panel-border, #454545);
  background: transparent;
  color: var(--vscode-descriptionForeground, #717171);
  font-size: 11px;
  border-radius: 10px;
  cursor: pointer;
}

.tag-suggestion:hover {
  border-color: #d97757;
  color: #d97757;
}
</style>
