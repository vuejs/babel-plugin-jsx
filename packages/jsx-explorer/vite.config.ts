import VueJSX from '@vitejs/plugin-vue-jsx'
import { defaultClientConditions, defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      'node:assert': 'assert',
    },
    conditions: ['vue-jsx-source', ...defaultClientConditions],
  },
  define: {
    'process.env.NODE_DEBUG': 'false',
  },
  plugins: [VueJSX()],
})
