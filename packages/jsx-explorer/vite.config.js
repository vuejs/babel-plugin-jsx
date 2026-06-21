import VueJSX from '@vitejs/plugin-vue-jsx'
import { defaultClientConditions, defineConfig } from 'vite'
export default defineConfig({
  resolve: {
    conditions: ['vue-jsx-source', ...defaultClientConditions],
  },
  plugins: [VueJSX()],
})
