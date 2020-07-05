import { addNamespace } from '@babel/helper-module-imports';
import { State, JSXPath } from './types';
import { JSXMemberExpression } from '@babel/types';
import * as t from '@babel/types'

const transformFragment = (path: JSXPath, Fragment: JSXMemberExpression) => {
  const children = path.get('children') || [];
  return t.jsxElement(
    t.jsxOpeningElement(Fragment, []),
    t.jsxClosingElement(Fragment),
    children.map(({ node }) => node),
    false,
  );
};

export default () => ({
  JSXFragment: {
    enter(path: JSXPath, state: State) {
      if (!state.get('vue')) {
        state.set('vue', addNamespace(path, 'vue'));
      }
      path.replaceWith(
        transformFragment(
          path,
          t.jsxMemberExpression(
            t.jsxIdentifier(state.get('vue').name),
            t.jsxIdentifier('Fragment'),
          ),
        ),
      );
    },
  },
});
