import { defineConfig } from 'tsdown'

export default defineConfig({
  workspace: [
    './packages/babel-plugin-jsx',
    './packages/babel-plugin-resolve-type',
  ],
  entry: ['src/index.ts'],
  dts: { oxc: true },
  target: 'node20.19',
  platform: 'neutral',
  inlineOnly: [],
  exports: {
    devExports: 'dev',
  },
  fixedExtension: true,
})
