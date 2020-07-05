import syntaxJsx from '@babel/plugin-syntax-jsx';
import tranformVueJSX from './transform-vue-jsx';
import sugarFragment from './sugar-fragment';
import * as t from '@babel/types';

export default () => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    ...tranformVueJSX(t),
    ...sugarFragment(t),
  },
});
