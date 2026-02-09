<template>
  <div class="section-view">
    <SectionToolbar title="OPENCODE AUTH" :actions="store.toolbar" @action="store.handleToolbarAction" />

    <div class="cards-container">
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
        icon="key"
        message="No credentials found. Add or import a credential to get started."
        hint="Use the toolbar to add a new credential or import from your current OpenCode auth."
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SectionToolbar from '@/components/common/SectionToolbar.vue'
import ItemCard from '@/components/common/ItemCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useOpenCodeAuthStore } from '@/stores/sectionStore'
import { rpcClient } from '@/utils/rpcClient'

const store = useOpenCodeAuthStore()

function handleCardClick(cardId: string) {
  // Switch credential on click
  rpcClient.send({ type: 'cardAction', section: 'opencodeAuth', cardId, actionId: 'switch' })
}

function handleCardAction(cardId: string, actionId: string) {
  rpcClient.send({ type: 'cardAction', section: 'opencodeAuth', cardId, actionId })
}
</script>

<style scoped>
.section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 12px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
</style>
