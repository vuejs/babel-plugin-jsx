import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import VueJSX from '@vitejs/plugin-vue-jsx';
import MonacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  resolve: {
    alias: {
      '@vue/babel-plugin-jsx': '@vue/babel-plugin-jsx/src/index.ts',
    },
  },
  plugins: [
    VueJSX(),
    // @ts-expect-error
    (MonacoEditorPlugin.default as typeof MonacoEditorPlugin)({
      languageWorkers: ['editorWorkerService', 'typescript'],
    }),
    nodePolyfills({
      globals: {
        process: true,
      },
    }),
  ],
});
