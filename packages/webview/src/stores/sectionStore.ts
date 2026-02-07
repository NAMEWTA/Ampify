/**
 * Section Store — generic store for tree-based sections (launcher, skills, commands, gitshare).
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rpcClient } from '@/utils/rpcClient'
import type { TreeNode, ToolbarAction, SectionId } from '@ampify/shared'

function createSectionStore(storeId: string, sectionId: SectionId) {
  return defineStore(storeId, () => {
    const tree = ref<TreeNode[]>([])
    const toolbar = ref<ToolbarAction[]>([])
    const tags = ref<string[]>([])
    const activeTags = ref<string[]>([])
    const keyword = ref('')
    const loading = ref(false)
    const expandedNodes = ref<Set<string>>(new Set())

    function setData(newTree: TreeNode[], newToolbar: ToolbarAction[], newTags?: string[], newActiveTags?: string[]) {
      tree.value = newTree
      toolbar.value = newToolbar
      if (newTags !== undefined) tags.value = newTags
      if (newActiveTags !== undefined) activeTags.value = newActiveTags
      loading.value = false
    }

    function toggleNodeExpand(nodeId: string) {
      if (expandedNodes.value.has(nodeId)) {
        expandedNodes.value.delete(nodeId)
      } else {
        expandedNodes.value.add(nodeId)
      }
    }

    function isNodeExpanded(nodeId: string): boolean {
      return expandedNodes.value.has(nodeId)
    }

    function executeAction(actionId: string, nodeId?: string) {
      rpcClient.send({ type: 'treeItemAction', section: sectionId, actionId, nodeId: nodeId || '' })
    }

    function handleToolbarAction(actionId: string) {
      rpcClient.send({ type: 'toolbarAction', section: sectionId, actionId })
    }

    function handleItemClick(nodeId: string) {
      rpcClient.send({ type: 'treeItemClick', section: sectionId, nodeId })
    }

    function setFilter(newKeyword?: string, newTags?: string[]) {
      if (newKeyword !== undefined) {
        keyword.value = newKeyword
        rpcClient.send({ type: 'filterByKeyword', section: sectionId, keyword: newKeyword })
      }
      if (newTags !== undefined) {
        activeTags.value = newTags
        rpcClient.send({ type: 'filterByTags', section: sectionId, tags: newTags })
      }
    }

    function toggleTag(tag: string) {
      rpcClient.send({ type: 'toggleTag', section: sectionId, tag })
    }

    function clearFilter() {
      keyword.value = ''
      activeTags.value = []
      rpcClient.send({ type: 'clearFilter', section: sectionId })
    }

    function handleDrop(uris: string[]) {
      rpcClient.send({ type: 'dropFiles', section: sectionId, uris })
    }

    return {
      tree,
      toolbar,
      tags,
      activeTags,
      keyword,
      loading,
      expandedNodes,
      setData,
      toggleNodeExpand,
      isNodeExpanded,
      executeAction,
      handleToolbarAction,
      handleItemClick,
      setFilter,
      toggleTag,
      clearFilter,
      handleDrop,
    }
  })
}

export const useLauncherStore = createSectionStore('launcher', 'launcher')
export const useSkillsStore = createSectionStore('skills', 'skills')
export const useCommandsStore = createSectionStore('commands', 'commands')
export const useGitShareStore = createSectionStore('gitshare', 'gitshare')
