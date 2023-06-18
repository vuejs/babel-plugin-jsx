import { defineConfig } from 'vite'
import MonacoEditorPlugin from 'vite-plugin-monaco-editor'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    MonacoEditorPlugin({}),
    nodePolyfills({
      globals: {
        process: true,
      },
    }),
  ],
})
