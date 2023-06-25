import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  resolve: {
    alias: {
      '@vue/babel-plugin-jsx': '@vue/babel-plugin-jsx/src/index.ts',
    },
  },
  plugins: [
    nodePolyfills({
      globals: {
        process: true,
      },
    }),
  ],
});
