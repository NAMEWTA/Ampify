<template>
  <div class="section-view">
    <SectionToolbar title="COMMANDS" :actions="store.toolbar" @action="store.handleToolbarAction" />
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
          <CodiconIcon name="file-code" />
          <span>Drop .md command files here to import</span>
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
        icon="terminal"
        message="No commands found. Create or import a command to get started."
        hint="You can also drag & drop .md command files here."
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import TagChips from '@/components/common/TagChips.vue'
import CodiconIcon from '@/components/common/CodiconIcon.vue'
import ItemCard from '@/components/common/ItemCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useCommandsStore } from '@/stores/sectionStore'
import { extractDropUris } from '@/utils/dropHelper'
import { rpcClient } from '@/utils/rpcClient'

const store = useCommandsStore()
const isDragOver = ref(false)
const dragDepth = ref(0)

function handleCardClick(cardId: string) {
  // Open command file in editor
  rpcClient.send({ type: 'cardClick', section: 'commands', cardId })
}

function handleCardAction(cardId: string, actionId: string) {
  rpcClient.send({ type: 'cardAction', section: 'commands', cardId, actionId })
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
  if (uris.length) {
    store.handleDrop(uris)
  } else {
    // Webview iframe sandbox blocks DataTransfer from Explorer;
    // fall back to opening the import dialog on the extension side.
    store.handleDropEmpty()
  }
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
