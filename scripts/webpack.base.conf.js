const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: false,
  context: path.join(__dirname, '../packages/jsx-explorer'),
  entry: './src/index.ts',
  output: {
    publicPath: './',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
          compilerOptions: { downlevelIteration: true },
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader', 'css-loader',
        ],
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
      filename: 'index.html',
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js', '.mjs'],
  },
  node: {
    fs: 'empty',
  },
};
