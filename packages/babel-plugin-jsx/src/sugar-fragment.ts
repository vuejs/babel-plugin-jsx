import t from '@babel/types'
import { createIdentifier, FRAGMENT } from './utils'
import type { State } from './interface'
import type { NodePath, Visitor } from '@babel/traverse'

const transformFragment = (
  path: NodePath<t.JSXFragment>,
  Fragment: t.JSXIdentifier | t.JSXMemberExpression,
) => {
  const children = path.get('children') || []
  return t.jsxElement(
    t.jsxOpeningElement(Fragment, []),
    t.jsxClosingElement(Fragment),
    children.map(({ node }) => node),
    false,
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
