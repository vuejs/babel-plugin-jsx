const path = require('path');

const jsxInjectionPATH = 'PACKAGE/lib/jsxInjection';

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-eval-source-map',
  entry: './example/index.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/dist/',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: {
      [jsxInjectionPATH]: path.resolve(
        __dirname,
        './lib/jsxInjection',
      ),
    },
  },
  devServer: {
    inline: true,
    open: true,
    hot: true,
    overlay: true,
  },
};
