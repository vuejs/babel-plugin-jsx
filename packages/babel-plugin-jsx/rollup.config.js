import esbuild from 'rollup-plugin-esbuild'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: `dist/vue-jsx.min.js`,
      format: 'umd',
      name: `vue-jsx`,
    },
  ],
  plugins: [
    esbuild({
      minify: true,
    }),
  ],
}
