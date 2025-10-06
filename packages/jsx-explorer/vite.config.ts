import { defineConfig } from 'vite';
import VueJSX from '@vitejs/plugin-vue-jsx';

export default defineConfig({
  resolve: {
    alias: {
      '@vue/babel-plugin-jsx': '@vue/babel-plugin-jsx/src/index.ts',
    },
  },
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'false',
  },
  plugins: [VueJSX()],
});
