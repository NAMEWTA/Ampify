import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
    define: {
        'process.env.NODE_ENV': JSON.stringify('production')
    },
    plugins: [
        vue(),
        Components({
            dts: false,
            resolvers: [ElementPlusResolver({ importStyle: 'css' })]
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@shared': fileURLToPath(new URL('../src/modules/mainView/shared', import.meta.url))
        }
    },
    build: {
        emptyOutDir: true,
        outDir: fileURLToPath(new URL('../webview-dist/mainView', import.meta.url)),
        cssCodeSplit: false,
        lib: {
            entry: fileURLToPath(new URL('./src/main.ts', import.meta.url)),
            name: 'AmpifyMainView',
            formats: ['iife'],
            fileName: () => 'main.js',
            cssFileName: 'main'
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true
            }
        }
    }
});
