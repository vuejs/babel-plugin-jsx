import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import { State } from '.';
import { createIdentifier, FRAGMENT } from './utils';

const transformFragment = (
  path: NodePath<t.JSXElement>,
  Fragment: t.JSXIdentifier | t.JSXMemberExpression,
) => {
  const children = path.get('children') || [];
  return t.jsxElement(
    t.jsxOpeningElement(Fragment, []),
    t.jsxClosingElement(Fragment),
    children.map(({ node }) => node),
    false,
  );
};

export default ({
  JSXFragment: {
    enter(path: NodePath<t.JSXElement>, state: State) {
      const fragmentCallee = createIdentifier(state, FRAGMENT);
      path.replaceWith(
        t.inherits(transformFragment(
          path,
          t.isIdentifier(fragmentCallee)
            ? t.jsxIdentifier(fragmentCallee.name)
            : t.jsxMemberExpression(
              t.jsxIdentifier((fragmentCallee.object as t.Identifier).name),
              t.jsxIdentifier((fragmentCallee.property as t.Identifier).name),
            ),
        ), path.node)
        ,
      );
    },
  },
});
