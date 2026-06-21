import { defineConfig } from 'tsdown'

export default defineConfig({
  workspace: [
    './packages/babel-plugin-jsx',
    './packages/babel-plugin-resolve-type',
  ],
  entry: ['src/index.ts'],
  platform: 'neutral',
  deps: {
    onlyBundle: [],
  },
  exports: {
    devExports: 'vue-jsx-source',
  },
  publint: 'ci-only',
  attw: 'ci-only',
})
