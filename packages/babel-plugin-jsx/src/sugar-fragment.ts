import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import { State } from '.';
import { createIdentifier, FRAGMENT } from './utils';

const transformFragment = (path: NodePath<t.JSXElement>, Fragment: t.JSXIdentifier) => {
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
      path.replaceWith(
        transformFragment(
          path,
          t.jsxIdentifier(createIdentifier(state, FRAGMENT).name),
        ),
      );
    },
  },
});
