<template>
  <el-dialog
    :model-value="Boolean(store.overlay)"
    :title="store.overlay?.title"
    width="680px"
    class="brand-dialog"
    @close="cancel"
  >
    <el-form v-if="store.overlay" label-position="top">
      <template v-for="field in store.overlay.fields" :key="field.key">
        <el-form-item :label="field.label">
          <el-input
            v-if="field.kind === 'text'"
            v-model="form[field.key]"
            :placeholder="field.placeholder"
          />
          <el-input
            v-else-if="field.kind === 'textarea'"
            v-model="form[field.key]"
            type="textarea"
            :rows="field.key === 'tagLibrary' ? 6 : 4"
            :placeholder="field.placeholder"
          />
          <el-select
            v-else-if="field.kind === 'select'"
            v-model="form[field.key]"
            class="field-full"
          >
            <el-option
              v-for="option in field.options || []"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-checkbox-group
            v-else-if="field.kind === 'multi-select'"
            v-model="multiSelect[field.key]"
          >
            <el-checkbox
              v-for="option in field.options || []"
              :key="option.value"
              :label="option.value"
            >
              {{ option.label }}
            </el-checkbox>
          </el-checkbox-group>
          <el-select
            v-else
            v-model="multiSelect[field.key]"
            multiple
            filterable
            allow-create
            default-first-option
            collapse-tags
            class="field-full"
            :placeholder="field.placeholder"
          >
            <el-option
              v-for="option in field.options || []"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <div v-if="field.description" class="field-hint">{{ field.description }}</div>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <div class="dialog-actions">
        <el-button @click="cancel">{{ store.overlay?.cancelLabel || 'Cancel' }}</el-button>
        <el-button type="primary" @click="submit">{{ store.overlay?.submitLabel || 'Save' }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useSectionActions } from '@/composables/useSectionActions';
import { useOverlayStore } from '@/stores/overlay';

const store = useOverlayStore();
const actions = useSectionActions('dashboard');
const form = reactive<Record<string, string>>({});
const multiSelect = reactive<Record<string, string[]>>({});

watch(() => store.overlay, (overlay) => {
  Object.keys(form).forEach((key) => delete form[key]);
  Object.keys(multiSelect).forEach((key) => delete multiSelect[key]);
  if (!overlay) {
    return;
  }
  for (const field of overlay.fields) {
    if (field.kind === 'multi-select' || field.kind === 'multi-select-dropdown' || field.kind === 'tags') {
      multiSelect[field.key] = (field.value || '').split(',').filter(Boolean);
      form[field.key] = field.value || '';
    } else {
      form[field.key] = field.value || '';
    }
  }
}, { immediate: true });

function submit() {
  if (!store.overlay) {
    return;
  }
  const payload: Record<string, string> = {};
  for (const field of store.overlay.fields) {
    if (field.kind === 'multi-select' || field.kind === 'multi-select-dropdown' || field.kind === 'tags') {
      payload[field.key] = (multiSelect[field.key] || []).join(',');
    } else {
      payload[field.key] = form[field.key] || '';
    }
  }
  actions.overlaySubmit(store.overlay.overlayId, payload);
}

function cancel() {
  if (store.overlay) {
    actions.overlayCancel(store.overlay.overlayId);
  }
}
</script>
