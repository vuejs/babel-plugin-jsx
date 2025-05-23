import { defineConfig } from 'vite';
import VueJSX from '@vitejs/plugin-vue-jsx';
import Replace from 'unplugin-replace/vite';

export default defineConfig({
  build: {
    minify: 'terser',
  },
  resolve: {
    alias: {
      '@vue/babel-plugin-jsx': '@vue/babel-plugin-jsx/src/index.ts',
    },
  },
  plugins: [
    VueJSX(),
    Replace({
      values: {
        'process.env': '{}',
        'process.env.NODE_DEBUG': 'false',
        'process.env.BABEL_TYPES_8_BREAKING': 'false',
      },
    }),
  ],
});
