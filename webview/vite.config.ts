import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../out/webview',
    emptyOutDir: true,
    // Single file output for VS Code webview (no code splitting)
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Force all code into a single chunk
        inlineDynamicImports: true,
      },
    },
    // Inline all CSS into JS to avoid separate CSS file loading issues
    cssCodeSplit: false,
    // CSP compatible — no eval
    target: 'es2020',
    minify: 'esbuild',
  },
  // Dev server config for HMR during development
  server: {
    port: 5173,
    strictPort: true,
  },
})
