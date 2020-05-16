const babelPluginTransformVueJsx = require('./babel-plugin-transform-vue-jsx');

module.exports = () => ({
  plugins: [
    babelPluginTransformVueJsx,
  ],
});
