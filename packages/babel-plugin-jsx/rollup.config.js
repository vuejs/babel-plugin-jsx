import babel from '@rollup/plugin-babel';

export default {
  input: 'src/index.js',
  plugins: [
    babel({
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 8,
            },
            modules: false,
          },
        ],
      ],
    }),
  ],
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
    },
  ],
};
