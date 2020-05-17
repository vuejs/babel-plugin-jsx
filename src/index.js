const babelPluginTransformVueJsx = require('./babel-plugin-transform-vue-jsx');
const babelSugarFragment = require('./babel-sugar-fragment');

module.exports = () => ({
  plugins: [
    babelPluginTransformVueJsx,
    babelSugarFragment,
  ],
});
