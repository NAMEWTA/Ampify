<template>
  <nav class="nav-rail" :class="{ expanded: appStore.navExpanded }">
    <div class="nav-header">
      <span class="logo-letter">A</span>
      <span class="logo-text" v-show="appStore.navExpanded">mpify</span>
    </div>

    <div class="nav-items">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: appStore.activeSection === item.id }"
        :title="item.label"
        @click="appStore.switchSection(item.id)"
      >
        <span class="nav-icon">
          <i :class="['codicon', item.iconClass]"></i>
        </span>
        <span class="nav-label" v-show="appStore.navExpanded">{{ item.label }}</span>
      </button>
    </div>

    <div class="account-badge" :title="appStore.instanceKey">
      <span class="account-letter">{{ appStore.instanceKey.charAt(0).toUpperCase() }}</span>
      <span class="account-label" v-show="appStore.navExpanded">{{ appStore.instanceKey }}</span>
    </div>

    <button class="nav-toggle" title="Toggle sidebar" @click="appStore.toggleNav()">
      <i class="codicon codicon-layout-sidebar-left"></i>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import type { SectionId } from '@ampify/shared'

interface NavItem {
  id: SectionId
  label: string
  iconClass: string
}

const appStore = useAppStore()

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', iconClass: 'codicon-dashboard' },
  { id: 'launcher', label: 'Launcher', iconClass: 'codicon-rocket' },
  { id: 'skills', label: 'Skills', iconClass: 'codicon-library' },
  { id: 'commands', label: 'Commands', iconClass: 'codicon-terminal' },
  { id: 'gitshare', label: 'Git Sync', iconClass: 'codicon-git-merge' },
  { id: 'modelProxy', label: 'Model Proxy', iconClass: 'codicon-radio-tower' },
  { id: 'opencodeAuth', label: 'OpenCode', iconClass: 'codicon-key' },
  { id: 'settings', label: 'Settings', iconClass: 'codicon-settings-gear' },
]
</script>

<style scoped>
.nav-rail {
  display: flex;
  flex-direction: column;
  width: 40px;
  min-width: 40px;
  height: 100%;
  background: var(--vscode-sideBar-background, #1e1e1e);
  border-right: 1px solid var(--vscode-panel-border, #2b2b2b);
  transition: width 0.15s ease, min-width 0.15s ease;
  overflow: hidden;
  user-select: none;
}

.nav-rail.expanded {
  width: 130px;
  min-width: 130px;
}

.nav-header {
  display: flex;
  align-items: center;
  padding: 10px 8px 6px;
  gap: 2px;
}

.logo-letter {
  font-size: 18px;
  font-weight: 700;
  color: #d97757;
  min-width: 24px;
  text-align: center;
}

.logo-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground, #cccccc);
  white-space: nowrap;
}

.nav-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;
  transition: background-color 0.1s;
}

.nav-item:hover {
  background: var(--vscode-list-hoverBackground, #2a2d2e);
}

.nav-item.active {
  background: var(--vscode-list-activeSelectionBackground, #094771);
  color: var(--vscode-list-activeSelectionForeground, #ffffff);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  font-size: 16px;
}

.nav-label {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin: 4px;
  border-radius: 4px;
  background: var(--vscode-badge-background, #4d4d4d);
  overflow: hidden;
}

.account-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #d97757;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.account-label {
  font-size: 11px;
  color: var(--vscode-badge-foreground, #cccccc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  cursor: pointer;
  opacity: 0.6;
}

.nav-toggle:hover {
  opacity: 1;
}
</style>
