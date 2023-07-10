import { defineConfig } from 'vitest/config';
import { babel } from '@rollup/plugin-babel';
import Jsx from './packages/babel-plugin-jsx/src';

export default defineConfig({
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
