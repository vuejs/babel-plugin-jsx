module.exports = {
  presets: [
    [
      '@babel/env',
      {
        // "modules": "cjs"
      },
    ],
  ],
  plugins: [
    ['./src/index.js', { transformOn: true }],
  ],
};
