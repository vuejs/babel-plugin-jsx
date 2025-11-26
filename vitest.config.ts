import { babel } from '@rollup/plugin-babel'
import { defineConfig } from 'vitest/config'
import Jsx from './packages/babel-plugin-jsx/src'

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
          {
            optimize: true,
            isCustomElement: (tag: string) => tag.startsWith('x-'),
          },
        ],
      ],
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
