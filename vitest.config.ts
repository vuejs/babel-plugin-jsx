import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vitest/config'
import Jsx from './packages/babel-plugin-jsx/src/index.ts'

export default defineConfig({
  oxc: {
    jsx: 'preserve',
  },
  plugins: [
    babel({
      include: [/\.[jt]sx$/],
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
