import VueJSX from '@vitejs/plugin-vue-jsx'
import { defaultClientConditions, defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    conditions: ['dev', ...defaultClientConditions],
  },
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'false',
  },
  plugins: [VueJSX()],
})
