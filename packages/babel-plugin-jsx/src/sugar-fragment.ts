import * as t from '@babel/types';
import { addNamespace } from '@babel/helper-module-imports';
import { NodePath } from '@babel/traverse';
import { State } from '.';

const transformFragment = (path: NodePath<t.JSXElement>, Fragment: t.JSXMemberExpression) => {
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
    enter(path: NodePath<t.JSXElement>, state: State) {
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
