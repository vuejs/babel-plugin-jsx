import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import { addDefault } from '@babel/helper-module-imports';
import {
  createIdentifier,
  transformJSXSpreadChild,
  transformJSXText,
  transformJSXExpressionContainer,
  walksScope,
  buildIIFE,
  isDirective,
  checkIsComponent,
  getTag,
  getJSXAttributeName,
  isOn,
  isConstant,
  dedupeProperties,
  transformJSXSpreadAttribute,
} from './utils';
import SlotFlags from './slotFlags';
import { PatchFlags } from './patchFlags';
import parseDirectives from './parseDirectives';
import type { State, Slots } from './interface';

const xlinkRE = /^xlink([A-Z])/;

type ExcludesBoolean = <T>(x: T | false | true) => x is T;

const getJSXAttributeValue = (
  path: NodePath<t.JSXAttribute>,
  state: State,
): (
  t.StringLiteral | t.Expression | null
  ) => {
  const valuePath = path.get('value');
  if (valuePath.isJSXElement()) {
    return transformJSXElement(valuePath, state);
  }
  if (valuePath.isStringLiteral()) {
    return valuePath.node;
  }
  if (valuePath.isJSXExpressionContainer()) {
    return transformJSXExpressionContainer(valuePath);
  }

  return null;
};

const buildProps = (path: NodePath<t.JSXElement>, state: State) => {
  const tag = getTag(path, state);
  const isComponent = checkIsComponent(path.get('openingElement'), state);
  const props = path.get('openingElement').get('attributes');
  const directives: t.ArrayExpression[] = [];
  const dynamicPropNames = new Set<string>();

  let slots: Slots = null;
  let patchFlag = 0;

  if (props.length === 0) {
    return {
      tag,
      isComponent,
      slots,
      props: t.nullLiteral(),
      directives,
      patchFlag,
      dynamicPropNames,
    };
  }

  let properties: t.ObjectProperty[] = [];

  // patchFlag analysis
  let hasRef = false;
  let hasClassBinding = false;
  let hasStyleBinding = false;
  let hasHydrationEventBinding = false;
  let hasDynamicKeys = false;

  const mergeArgs: (t.CallExpression | t.ObjectExpression | t.Identifier)[] = [];
  const { mergeProps = true } = state.opts;
  props
    .forEach((prop) => {
      if (prop.isJSXAttribute()) {
        let name = getJSXAttributeName(prop);

        const attributeValue = getJSXAttributeValue(prop, state);

        if (!isConstant(attributeValue) || name === 'ref') {
          if (
            !isComponent
            && isOn(name)
            // omit the flag for click handlers becaues hydration gives click
            // dedicated fast path.
            && name.toLowerCase() !== 'onclick'
            // omit v-model handlers
            && name !== 'onUpdate:modelValue'
          ) {
            hasHydrationEventBinding = true;
          }

          if (name === 'ref') {
            hasRef = true;
          } else if (name === 'class' && !isComponent) {
            hasClassBinding = true;
          } else if (name === 'style' && !isComponent) {
            hasStyleBinding = true;
          } else if (
            name !== 'key'
            && !isDirective(name)
            && name !== 'on'
          ) {
            dynamicPropNames.add(name);
          }
        }
        if (state.opts.transformOn && (name === 'on' || name === 'nativeOn')) {
          if (!state.get('transformOn')) {
            state.set('transformOn', addDefault(
              path,
              '@vue/babel-helper-vue-transform-on',
              { nameHint: '_transformOn' },
            ));
          }
          mergeArgs.push(t.callExpression(
            state.get('transformOn'),
            [attributeValue || t.booleanLiteral(true)],
          ));
          return;
        }
        if (isDirective(name)) {
          const {
            directive, modifiers, values, args, directiveName,
          } = parseDirectives({
            tag,
            isComponent,
            name,
            path: prop,
            state,
            value: attributeValue,
          });

          if (directiveName === 'slots') {
            slots = attributeValue as Slots;
            return;
          }
          if (directive) {
            directives.push(t.arrayExpression(directive));
          } else if (directiveName === 'html') {
            properties.push(t.objectProperty(
              t.stringLiteral('innerHTML'),
              values[0] as any,
            ));
            dynamicPropNames.add('innerHTML');
          } else if (directiveName === 'text') {
            properties.push(t.objectProperty(
              t.stringLiteral('textContent'),
              values[0] as any,
            ));
            dynamicPropNames.add('textContent');
          }

          if (['models', 'model'].includes(directiveName)) {
            values.forEach((value, index) => {
              const propName = args[index];
              // v-model target with variable
              const isDynamic = propName && !t.isStringLiteral(propName) && !t.isNullLiteral(propName);

              // must be v-model or v-models and is a component
              if (!directive) {
                properties.push(
                  t.objectProperty(t.isNullLiteral(propName)
                    ? t.stringLiteral('modelValue') : propName, value as any, isDynamic),
                );
                if (!isDynamic) {
                  dynamicPropNames.add((propName as t.StringLiteral)?.value || 'modelValue');
                }

                if (modifiers[index]?.size) {
                  properties.push(
                    t.objectProperty(
                      isDynamic
                        ? t.binaryExpression('+', propName, t.stringLiteral('Modifiers'))
                        : t.stringLiteral(`${(propName as t.StringLiteral)?.value || 'model'}Modifiers`),
                      t.objectExpression(
                        [...modifiers[index]].map((modifier) => t.objectProperty(
                          t.stringLiteral(modifier),
                          t.booleanLiteral(true),
                        )),
                      ),
                      isDynamic,
                    ),
                  );
                }
              }

              const updateName = isDynamic
                ? t.binaryExpression('+', t.stringLiteral('onUpdate'), propName)
                : t.stringLiteral(`onUpdate:${(propName as t.StringLiteral)?.value || 'modelValue'}`);

              properties.push(
                t.objectProperty(
                  updateName,
                  t.arrowFunctionExpression(
                    [t.identifier('$event')],
                    t.assignmentExpression('=', value as any, t.identifier('$event')),
                  ),
                  isDynamic,
                ),
              );

              if (!isDynamic) {
                dynamicPropNames.add((updateName as t.StringLiteral).value);
              } else {
                hasDynamicKeys = true;
              }
            });
          }
        } else {
          if (name.match(xlinkRE)) {
            name = name.replace(xlinkRE, (_, firstCharacter) => `xlink:${firstCharacter.toLowerCase()}`);
          }
          properties.push(t.objectProperty(
            t.stringLiteral(name),
            attributeValue || t.booleanLiteral(true),
          ));
        }
      } else {
        if (properties.length && mergeProps) {
          mergeArgs.push(t.objectExpression(dedupeProperties(properties, mergeProps)));
          properties = [];
        }

        // JSXSpreadAttribute
        hasDynamicKeys = true;
        transformJSXSpreadAttribute(
          path as NodePath,
          prop as NodePath<t.JSXSpreadAttribute>,
          mergeProps,
          mergeProps ? mergeArgs : properties,
        );
      }
    });

  // patchFlag analysis
  if (hasDynamicKeys) {
    patchFlag |= PatchFlags.FULL_PROPS;
  } else {
    if (hasClassBinding) {
      patchFlag |= PatchFlags.CLASS;
    }
    if (hasStyleBinding) {
      patchFlag |= PatchFlags.STYLE;
    }
    if (dynamicPropNames.size) {
      patchFlag |= PatchFlags.PROPS;
    }
    if (hasHydrationEventBinding) {
      patchFlag |= PatchFlags.HYDRATE_EVENTS;
    }
  }

  if (
    (patchFlag === 0 || patchFlag === PatchFlags.HYDRATE_EVENTS)
    && (hasRef || directives.length > 0)
  ) {
    patchFlag |= PatchFlags.NEED_PATCH;
  }

  let propsExpression: t.Expression | t.ObjectProperty | t.Literal = t.nullLiteral();
  if (mergeArgs.length) {
    if (properties.length) {
      mergeArgs.push(t.objectExpression(dedupeProperties(properties, mergeProps)));
    }
    if (mergeArgs.length > 1) {
      propsExpression = t.callExpression(
        createIdentifier(state, 'mergeProps'),
        mergeArgs,
      );
    } else {
      // single no need for a mergeProps call
      propsExpression = mergeArgs[0];
    }
  } else if (properties.length) {
    // single no need for spread
    if (properties.length === 1 && t.isSpreadElement(properties[0])) {
      propsExpression = (properties[0] as unknown as t.SpreadElement).argument;
    } else {
      propsExpression = t.objectExpression(dedupeProperties(properties, mergeProps));
    }
  }

  return {
    tag,
    props: propsExpression,
    isComponent,
    slots,
    directives,
    patchFlag,
    dynamicPropNames,
  };
};

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

  // #541 - directives can't be resolved in optimized slots
  // all parents should be deoptimized
  if (directives.length) {
    let currentPath = path;
    while (currentPath.parentPath?.isJSXElement()) {
      currentPath = currentPath.parentPath;
      currentPath.setData('slotFlag', 0);
    }
  }

  const slotFlag = path.getData('slotFlag') ?? SlotFlags.STABLE;
  const optimizeSlots = optimize && slotFlag !== 0;
  let VNodeChild;

  if (children.length > 1 || slots) {
    /*
      <A v-slots={slots}>{a}{b}</A>
        ---> {{ default: () => [a, b], ...slots }}
        ---> {[a, b]}
    */
    VNodeChild = isComponent
      ? children.length
        ? t.objectExpression([
          !!children.length && t.objectProperty(
            t.identifier('default'),
            t.arrowFunctionExpression([], t.arrayExpression(buildIIFE(path, children))),
          ),
          ...(slots ? (
            t.isObjectExpression(slots)
              ? (slots! as t.ObjectExpression).properties
              : [t.spreadElement(slots!)]
          ) : []),
          optimizeSlots && t.objectProperty(
            t.identifier('_'),
            t.numericLiteral(slotFlag),
          ),
        ].filter(Boolean as any))
        : slots
      : t.arrayExpression(children);
  } else if (children.length === 1) {
    /*
      <A>{a}</A> or <A>{() => a}</A>
     */
    const { enableObjectSlots = true } = state.opts;
    const child = children[0];
    const objectExpression = t.objectExpression([
      t.objectProperty(
        t.identifier('default'),
        t.arrowFunctionExpression([], t.arrayExpression(buildIIFE(path, [child]))),
      ),
      optimizeSlots && t.objectProperty(
        t.identifier('_'),
        t.numericLiteral(slotFlag),
      ) as any,
    ].filter(Boolean));
    if (t.isIdentifier(child) && isComponent) {
      VNodeChild = enableObjectSlots ? t.conditionalExpression(
        t.callExpression(state.get('@vue/babel-plugin-jsx/runtimeIsSlot')(), [child]),
        child,
        objectExpression,
      ) : objectExpression;
    } else if (
      t.isCallExpression(child) && child.loc && isComponent
    ) { // the element was generated and doesn't have location information
      if (enableObjectSlots) {
        const { scope } = path;
        const slotId = scope.generateUidIdentifier('slot');
        if (scope) {
          scope.push({
            id: slotId,
            kind: 'let',
          });
        }
        const alternate = t.objectExpression([
          t.objectProperty(
            t.identifier('default'),
            t.arrowFunctionExpression([], t.arrayExpression(buildIIFE(path, [slotId]))),
          ), optimizeSlots && t.objectProperty(
            t.identifier('_'),
            t.numericLiteral(slotFlag),
          ) as any,
        ].filter(Boolean));
        const assignment = t.assignmentExpression('=', slotId, child);
        const condition = t.callExpression(
          state.get('@vue/babel-plugin-jsx/runtimeIsSlot')(),
          [assignment],
        );
        VNodeChild = t.conditionalExpression(
          condition,
          slotId,
          alternate,
        );
      } else {
        VNodeChild = objectExpression;
      }
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
        optimizeSlots && t.objectProperty(
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

export default ({
  JSXElement: {
    exit(path: NodePath<t.JSXElement>, state: State) {
      path.replaceWith(transformJSXElement(path, state));
    },
  },
});
