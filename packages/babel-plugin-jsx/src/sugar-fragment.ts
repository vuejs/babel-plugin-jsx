import * as t from '@babel/types';
import type { NodePath, VisitorBase } from '@babel/traverse';
import type { State } from './interface';
import { FRAGMENT, createIdentifier } from './utils';

const transformFragment = (
  path: NodePath<t.JSXFragment>,
  Fragment: t.JSXIdentifier | t.JSXMemberExpression
) => {
  return t.jsxElement(
    t.jsxOpeningElement(Fragment, []),
    t.jsxClosingElement(Fragment),
    path.node.children.slice()
  );
};

const visitor: VisitorBase<State> = {
  JSXFragment: {
    enter(path, state) {
      const fragmentCallee = createIdentifier(state, FRAGMENT);
      path.replaceWith(
        transformFragment(
          path,
          t.isIdentifier(fragmentCallee)
            ? t.jsxIdentifier(fragmentCallee.name)
            : t.jsxMemberExpression(
                t.jsxIdentifier((fragmentCallee.object as t.Identifier).name),
                t.jsxIdentifier((fragmentCallee.property as t.Identifier).name)
              )
        )
      );
    },
  },
};

export default visitor;
