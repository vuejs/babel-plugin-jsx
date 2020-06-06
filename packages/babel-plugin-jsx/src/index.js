import syntaxJsx from '@babel/plugin-syntax-jsx';
import tranformVueJSX from './transform-vue-jsx';
import sugarVModel from './sugar-v-model';
import sugarFragment from './sugar-fragment';

export default ({ types: t }) => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    ...sugarVModel(t),
    ...tranformVueJSX(t),
    ...sugarFragment(t),
  },
});
