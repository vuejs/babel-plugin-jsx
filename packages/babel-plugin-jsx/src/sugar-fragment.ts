import * as t from '@babel/types'
import { createIdentifier, FRAGMENT } from './utils'
import type { State } from './interface'
import type { NodePath, Visitor } from '@babel/core'

const transformFragment = (
  path: NodePath<t.JSXFragment>,
  Fragment: t.JSXIdentifier | t.JSXMemberExpression,
) => {
  return t.jsxElement(
    t.jsxOpeningElement(Fragment, []),
    t.jsxClosingElement(Fragment),
    path.node.children.slice(),
  )
}

const visitor: Visitor<State> = {
  JSXFragment: {
    enter(path, state) {
      const fragmentCallee = createIdentifier(state, FRAGMENT)
      path.replaceWith(
        transformFragment(
          path,
          t.isIdentifier(fragmentCallee)
            ? t.jsxIdentifier(fragmentCallee.name)
            : t.jsxMemberExpression(
                t.jsxIdentifier((fragmentCallee.object as t.Identifier).name),
                t.jsxIdentifier((fragmentCallee.property as t.Identifier).name),
              ),
        ),
      )
    },
  },
}

export default visitor
