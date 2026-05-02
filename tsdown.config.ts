import { defineConfig } from 'tsdown'

export default defineConfig({
  workspace: [
    './packages/babel-plugin-jsx',
    './packages/babel-plugin-resolve-type',
  ],
  entry: ['src/index.ts'],
  target: 'node22.18',
  platform: 'neutral',
  deps: {
    onlyBundle: [],
  },
  exports: {
    devExports: 'dev',
  },
  publint: 'ci-only',
  attw: 'ci-only',
})
