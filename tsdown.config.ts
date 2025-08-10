import { defineConfig } from 'tsdown';

export default defineConfig({
  workspace: [
    './packages/babel-plugin-jsx',
    './packages/babel-plugin-resolve-type',
  ],
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: { oxc: true },
  target: 'es2015',
  platform: 'neutral',
});
