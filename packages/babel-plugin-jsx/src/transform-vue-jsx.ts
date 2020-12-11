import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import {
  createIdentifier,
  transformJSXSpreadChild,
  transformJSXText,
  transformJSXExpressionContainer,
  walksScope,
  buildIIFE,
} from './utils';
import buildProps from './buildProps';
import SlotFlags from './slotFlags';
import { State, ExcludesBoolean } from '.';

/**
 * Get children from Array of JSX children
 * @param paths Array<JSXText | JSXExpressionContainer  | JSXElement | JSXFragment>
 * @returns Array<Expression | SpreadElement>
 */
const getChildren = (
  paths: NodePath<
    t.JSXText
    | t.JSXExpressionContainer
    | t.JSXSpreadChild
    | t.JSXElement
    | t.JSXFragment
  >[],
  state: State,
): t.Expression[] => paths
  .map((path) => {
    if (path.isJSXText()) {
      const transformedText = transformJSXText(path);
      if (transformedText) {
        return t.callExpression(createIdentifier(state, 'createTextVNode'), [transformedText]);
      }
      return transformedText;
    }
    if (path.isJSXExpressionContainer()) {
      const expression = transformJSXExpressionContainer(path);

      if (t.isIdentifier(expression)) {
        const { name } = expression;
        const { referencePaths = [] } = path.scope.getBinding(name) || {};
        referencePaths.forEach((referencePath) => {
          walksScope(referencePath, name, SlotFlags.DYNAMIC);
        });
      }

      return expression;
    }
    if (t.isJSXSpreadChild(path)) {
      return transformJSXSpreadChild(path as NodePath<t.JSXSpreadChild>);
    }
    if (path.isCallExpression()) {
      return (path as NodePath<t.CallExpression>).node;
    }
    if (path.isJSXElement()) {
      return transformJSXElement(path, state);
    }
    throw new Error(`getChildren: ${path.type} is not supported`);
  }).filter(((value: any) => (
    value !== undefined
    && value !== null
    && !t.isJSXEmptyExpression(value)
  )) as any);

const transformJSXElement = (
  path: NodePath<t.JSXElement>,
  state: State,
): t.CallExpression => {
  const children = getChildren(path.get('children'), state);
  const {
    tag,
    props,
    isComponent,
    directives,
    patchFlag,
    dynamicPropNames,
    slots,
  } = buildProps(path, state);

  const { optimize = false } = state.opts;

  const slotFlag = path.getData('slotFlag') || SlotFlags.STABLE;

  let VNodeChild;

  if (children.length > 1 || slots) {
    VNodeChild = isComponent ? t.objectExpression([
      !!children.length && t.objectProperty(
        t.identifier('default'),
        t.arrowFunctionExpression([], t.arrayExpression(buildIIFE(path, children))),
      ),
      ...(slots ? (
        t.isObjectExpression(slots)
          ? (slots! as t.ObjectExpression).properties
          : [t.spreadElement(slots!)]
      ) : []),
      optimize && t.objectProperty(
        t.identifier('_'),
        t.numericLiteral(slotFlag),
      ),
    ].filter(Boolean as any)) : t.arrayExpression(children);
  } else if (children.length === 1) {
    const child = children[0];
    if (t.isIdentifier(child)) {
      VNodeChild = t.conditionalExpression(
        t.callExpression(state.get('@vue/babel-plugin-jsx/runtimeIsSlot')(), [child]),
        child,
        t.objectExpression([
          t.objectProperty(
            t.identifier('default'),
            t.arrowFunctionExpression([], t.arrayExpression(buildIIFE(path, [child]))),
          ),
          optimize && t.objectProperty(
            t.identifier('_'),
            t.numericLiteral(slotFlag),
          ) as any,
        ].filter(Boolean)),
      );
    } else if (
      t.isCallExpression(child) && child.loc && isComponent
    ) { // the element was generated and doesn't have location information
      const { scope } = path;
      const slotId = scope.generateUidIdentifier('slot');
      if (scope) {
        scope.push({
          id: slotId,
          kind: 'let',
        });
      }

      VNodeChild = t.conditionalExpression(
        t.callExpression(
          state.get('@vue/babel-plugin-jsx/runtimeIsSlot')(),
          [t.assignmentExpression('=', slotId, child)],
        ),
        slotId,
        t.objectExpression([
          t.objectProperty(
            t.identifier('default'),
            t.arrowFunctionExpression([], t.arrayExpression(buildIIFE(path, [slotId]))),
          ),
          optimize && t.objectProperty(
            t.identifier('_'),
            t.numericLiteral(slotFlag),
          ) as any,
        ].filter(Boolean)),
      );
    } else if (t.isFunctionExpression(child) || t.isArrowFunctionExpression(child)) {
      VNodeChild = t.objectExpression([
        t.objectProperty(
          t.identifier('default'),
          child,
        ),
      ]);
    } else if (t.isObjectExpression(child)) {
      VNodeChild = t.objectExpression([
        ...child.properties,
        optimize && t.objectProperty(
          t.identifier('_'),
          t.numericLiteral(slotFlag),
        ),
      ].filter(Boolean as any));
    } else {
      VNodeChild = isComponent ? t.objectExpression([
        t.objectProperty(
          t.identifier('default'),
          t.arrowFunctionExpression([], t.arrayExpression([child])),
        ),
      ]) : t.arrayExpression([child]);
    }
  }

  const createVNode = t.callExpression(createIdentifier(state, 'createVNode'), [
    tag,
    props,
    VNodeChild || t.nullLiteral(),
    !!patchFlag && optimize && t.numericLiteral(patchFlag),
    !!dynamicPropNames.size && optimize
    && t.arrayExpression(
      [...dynamicPropNames.keys()].map((name) => t.stringLiteral(name)),
    ),
  ].filter(Boolean as unknown as ExcludesBoolean));

  if (!directives.length) {
    return createVNode;
  }

  return t.callExpression(createIdentifier(state, 'withDirectives'), [
    createVNode,
    t.arrayExpression(directives),
  ]);
};

export { transformJSXElement };

export default ({
  JSXElement: {
    exit(path: NodePath<t.JSXElement>, state: State) {
      path.replaceWith(
        t.inherits(transformJSXElement(path, state), path.node),
      );
    },
  },
});
