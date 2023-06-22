import { defineConfig } from 'vite';
import MonacoEditorPlugin from 'vite-plugin-monaco-editor';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  resolve: {
    alias: {
      '@vue/babel-plugin-jsx': '@vue/babel-plugin-jsx/src/index.ts',
    },
  },
  plugins: [
    MonacoEditorPlugin({}),
    nodePolyfills({
      globals: {
        process: true,
      },
    }),
  ],
});
