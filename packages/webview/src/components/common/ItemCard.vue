<template>
  <div
    class="item-card"
    :title="card.description"
    @click="emit('click', card.id)"
    @contextmenu.prevent
  >
    <!-- Icon -->
    <div class="card-icon">
      <CodiconIcon :name="card.iconId || 'extensions'" />
    </div>

    <!-- Name -->
    <div class="card-name">{{ card.name }}</div>

    <!-- Description (2-line clamp) -->
    <div class="card-desc" v-if="card.description">{{ card.description }}</div>

    <!-- Badges -->
    <div class="card-badges" v-if="card.badges && card.badges.length">
      <span class="card-badge" v-for="(badge, i) in displayBadges" :key="i">{{ badge }}</span>
      <span class="card-badge card-badge--more" v-if="overflowCount > 0">+{{ overflowCount }}</span>
    </div>

    <!-- Action bar (bottom) -->
    <div class="card-actions" v-if="card.actions?.length" @click.stop>
      <el-tooltip
        v-for="action in card.actions"
        :key="action.id"
        :content="action.label"
        placement="top"
        :show-after="400"
      >
        <button
          class="card-action-btn"
          :class="{ danger: action.danger }"
          @click.stop="emit('action', card.id, action.id)"
        >
          <CodiconIcon :name="action.iconId || 'circle-outline'" />
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CodiconIcon from './CodiconIcon.vue'
import type { CardItem } from '@ampify/shared'

const MAX_BADGES = 2

const props = defineProps<{
  card: CardItem
}>()

const emit = defineEmits<{
  click: [cardId: string]
  action: [cardId: string, actionId: string]
}>()

const displayBadges = computed(() => (props.card.badges || []).slice(0, MAX_BADGES))
const overflowCount = computed(() => Math.max(0, (props.card.badges?.length || 0) - MAX_BADGES))
</script>

<style scoped>
.item-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 6px;
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-height: 0;
  overflow: hidden;
}

.item-card:hover {
  border-color: #d97757;
  background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.item-card:hover .card-actions {
  opacity: 1;
}

.card-icon {
  font-size: 18px;
  opacity: 0.75;
  color: #d97757;
  line-height: 1;
}

.card-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #717171);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex-shrink: 1;
  min-height: 0;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
}

.card-badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 7px;
  background: var(--vscode-badge-background, #4d4d4d);
  color: var(--vscode-badge-foreground, #ffffff);
  white-space: nowrap;
  line-height: 16px;
}

.card-badge--more {
  background: transparent;
  color: var(--vscode-descriptionForeground, #717171);
  padding: 0 2px;
}

.card-actions {
  display: flex;
  gap: 2px;
  margin-top: auto;
  padding-top: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.card-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
}

.card-action-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
}

.card-action-btn.danger {
  color: var(--vscode-errorForeground, #f48771);
}
</style>
