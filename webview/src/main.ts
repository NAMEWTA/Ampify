/**
 * Vue 3 application entry point for Ampify Webview.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

import './styles/variables.css'
import './styles/reset.css'
import './styles/overrides.css'

// Element Plus — imported on-demand via unplugin-vue-components
// but we need the base CSS for variables/transitions
import 'element-plus/theme-chalk/dark/css-vars.css'

import { rpcClient } from './utils/rpcClient'
import { useAppStore } from './stores/appStore'

// Read initial state injected by the extension host
declare global {
  interface Window {
    __AMPIFY_INIT__?: {
      activeSection: string
      instanceKey: string
    }
  }
}

// Initialize RPC client message listener
rpcClient.init()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

// Restore initial state from extension host injection
const initData = window.__AMPIFY_INIT__
if (initData) {
  const appStore = useAppStore()
  if (initData.activeSection) {
    appStore.switchSection(initData.activeSection as any)
  }
  if (initData.instanceKey) {
    appStore.instanceKey = initData.instanceKey
  }
}

// Notify extension host that webview is ready
rpcClient.send({ type: 'ready' })
