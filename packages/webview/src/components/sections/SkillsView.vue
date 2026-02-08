<template>
  <div class="section-view">
    <SectionToolbar title="SKILLS" :actions="store.toolbar" @action="store.handleToolbarAction" />
    <TagChips
      :tags="store.tags"
      :active-tags="store.activeTags"
      @toggle="store.toggleTag"
      @clear="store.clearFilter"
    />

    <!-- Drop overlay -->
    <Transition name="drop-fade">
      <div v-if="isDragOver" class="drop-overlay">
        <div class="drop-overlay-content">
          <CodiconIcon name="folder-library" />
          <span>Drop skill folders here to import</span>
        </div>
      </div>
    </Transition>
    <div
      class="cards-container"
    >
      <!-- Card grid -->
      <div class="card-grid" v-if="store.cards.length > 0">
        <ItemCard
          v-for="card in store.cards"
          :key="card.id"
          :card="card"
          @click="handleCardClick"
          @action="handleCardAction"
        />
      </div>
      <EmptyState
        v-else
        icon="library"
        message="No skills found. Create or import a skill to get started."
        hint="You can also drag & drop skill folders here."
      />
    </div>

    <!-- File tree dialog -->
    <FileTreeDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :files="dialogFiles"
      @file-click="handleDialogFileClick"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import TagChips from '@/components/common/TagChips.vue'
import CodiconIcon from '@/components/common/CodiconIcon.vue'
import ItemCard from '@/components/common/ItemCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FileTreeDialog from '@/components/common/FileTreeDialog.vue'
import { useSkillsStore } from '@/stores/sectionStore'
import { extractDropUris } from '@/utils/dropHelper'
import { rpcClient } from '@/utils/rpcClient'
import type { CardFileNode } from '@ampify/shared'

const store = useSkillsStore()
const isDragOver = ref(false)
const dragDepth = ref(0)

// File tree dialog state
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogFiles = ref<CardFileNode[]>([])
let activeCardId = ''

function handleCardClick(cardId: string) {
  const card = store.cards.find(c => c.id === cardId)
  if (!card) return

  // 1. Open SKILL.md in editor
  rpcClient.send({ type: 'cardClick', section: 'skills', cardId })

  // 2. Show file tree dialog if files available
  if (card.fileTree && card.fileTree.length > 0) {
    activeCardId = cardId
    dialogTitle.value = card.name
    dialogFiles.value = card.fileTree
    dialogVisible.value = true
  }
}

function handleCardAction(cardId: string, actionId: string) {
  rpcClient.send({ type: 'cardAction', section: 'skills', cardId, actionId })
}

function handleDialogFileClick(filePath: string) {
  rpcClient.send({ type: 'cardFileClick', section: 'skills', cardId: activeCardId, filePath })
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  isDragOver.value = true
}

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragDepth.value += 1
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  isDragOver.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) isDragOver.value = false
}

function onDragEnd() {
  dragDepth.value = 0
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragDepth.value = 0
  isDragOver.value = false
  const uris = extractDropUris(e)
  if (uris.length) store.handleDrop(uris)
}

onMounted(() => {
  window.addEventListener('dragover', onDragOver, true)
  window.addEventListener('dragenter', onDragEnter, true)
  window.addEventListener('dragleave', onDragLeave, true)
  window.addEventListener('dragend', onDragEnd, true)
  window.addEventListener('drop', onDrop, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragover', onDragOver, true)
  window.removeEventListener('dragenter', onDragEnter, true)
  window.removeEventListener('dragleave', onDragLeave, true)
  window.removeEventListener('dragend', onDragEnd, true)
  window.removeEventListener('drop', onDrop, true)
})
</script>

<style scoped>
.section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
  padding: 6px;
}

/* Card grid — 3 columns */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

/* Drop overlay */
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  border: 2px dashed #d97757;
  border-radius: 4px;
  pointer-events: none;
}

.drop-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #d97757;
}

.drop-overlay-content .codicon { font-size: 32px; }
.drop-overlay-content span { font-size: 12px; font-weight: 500; }

.drop-fade-enter-active,
.drop-fade-leave-active { transition: opacity 0.15s ease; }
.drop-fade-enter-from,
.drop-fade-leave-to { opacity: 0; }
</style>
