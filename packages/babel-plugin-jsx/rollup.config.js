import esbuild from 'rollup-plugin-esbuild'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: `dist/babel-plugin-transform-vue-jsx-next.min.js`,
      format: 'umd',
      name: `babel-plugin-transform-vue-jsx-next`,
    },
  ],
  plugins: [
    esbuild(),
  ],
}
