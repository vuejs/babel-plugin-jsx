// import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  plugins: [
    commonjs(),
    typescript(),
  ],
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
    },
  ],
};
