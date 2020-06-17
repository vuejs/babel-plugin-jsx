const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-eval-source-map',
  context: path.join(__dirname, '../packages/jsx-explorer'),
  entry: './src/index.js',
  output: {
    publicPath: './',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'dist/fonts/[name].[hash:7].[ext]',
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader', 'css-loader',
        ],
      },
    ],
  },
  plugins: [
    new MonacoWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html',
      filename: 'index.html',
    }),
  ],
  node: {
    fs: 'empty',
  },
};
