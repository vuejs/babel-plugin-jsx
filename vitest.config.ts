import { defineConfig } from 'vitest/config';
import { babel } from '@rollup/plugin-babel';
import Jsx from '@vue/babel-plugin-jsx';

export default defineConfig({
  resolve: {
    conditions: ['dev'],
  },
  esbuild: {
    jsx: 'preserve',
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.tsx', '.jsx'],
      plugins: [
        [
          Jsx,
          { optimize: true, isCustomElement: (tag: string) => /^x-/.test(tag) },
        ],
      ],
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
