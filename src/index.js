const babelSugarVModel = require('./babel-sugar-v-model');
const babelPluginTransformVueJsx = require('./babel-plugin-transform-vue-jsx');
const babelSugarFragment = require('./babel-sugar-fragment');

module.exports = () => ({
  plugins: [
    babelSugarVModel,
    babelPluginTransformVueJsx,
    babelSugarFragment,
  ],
});
