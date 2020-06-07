import { addDefault, addNamespace } from '@babel/helper-module-imports';
import {
  createIdentifier,
  PatchFlags,
  PatchFlagNames,
  isDirective,
  checkIsComponent,
  getTag,
  getJSXAttributeName,
  transformJSXText,
  transformJSXExpressionContainer,
  transformJSXSpreadChild,
} from './utils';

const xlinkRE = /^xlink([A-Z])/;
const onRE = /^on[A-Z][a-z]+$/;
const rootAttributes = ['class', 'style'];

const isOn = (key) => onRE.test(key);

const transformJSXSpreadAttribute = (t, path, mergeArgs) => {
  const argument = path.get('argument').node;
  const { properties } = argument;
  if (!properties) {
    return t.spreadElement(argument);
  }
  return t.spreadElement(t.objectExpression(properties.filter((property) => {
    const { key, value } = property;
    const name = key.value;
    if (rootAttributes.includes(name)) {
      mergeArgs.push(
        t.objectExpression([
          t.objectProperty(
            t.stringLiteral(name),
            value,
          ),
        ]),
      );
      return false;
    }
    return true;
  })));
};

const needToMerge = (name) => rootAttributes.includes(name) || isOn(name);

const getJSXAttributeValue = (t, path) => {
  const valuePath = path.get('value');
  if (valuePath.isJSXElement()) {
    return transformJSXElement(t, valuePath);
  }
  if (valuePath.isStringLiteral()) {
    return valuePath.node;
  }
  if (valuePath.isJSXExpressionContainer()) {
    return transformJSXExpressionContainer(valuePath);
  }

  return null;
};

/**
 *  Check if an attribute value is constant
 * @param t
 * @param path
 * @returns boolean
 */
const isConstant = (t, path) => {
  if (t.isIdentifier(path)) {
    return path.name === 'undefined';
  }
  if (t.isArrayExpression(path)) {
    return path.elements.every((element) => isConstant(t, element));
  }
  if (t.isObjectExpression(path)) {
    return path.properties.every((property) => isConstant(t, property.value));
  }
  if (t.isLiteral(path)) {
    return true;
  }
  return false;
};

const buildProps = (t, path, state) => {
  const isComponent = checkIsComponent(t, path.get('openingElement'));
  const props = path.get('openingElement').get('attributes');
  const directives = [];
  if (props.length === 0) {
    return {
      props: t.nullLiteral(),
      directives,
    };
  }

  const propsExpression = [];

  // patchFlag analysis
  let patchFlag = 0;
  let hasRef = false;
  let hasClassBinding = false;
  let hasStyleBinding = false;
  let hasHydrationEventBinding = false;
  let hasDynamicKeys = false;

  const dynamicPropNames = [];
  const mergeArgs = [];

  props
    .forEach((prop) => {
      if (prop.isJSXAttribute()) {
        let name = getJSXAttributeName(t, prop);

        if (name === '_model') {
          name = 'onUpdate:modelValue';
        }

        const attributeValue = getJSXAttributeValue(t, prop);

        if (!isConstant(t, attributeValue) || name === 'ref') {
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
            && !dynamicPropNames.includes(name)
          ) {
            dynamicPropNames.push(name);
          }
        }
        if (state.opts.transformOn && (name === 'on' || name === 'nativeOn')) {
          const transformOn = addDefault(
            path,
            '@ant-design-vue/babel-helper-vue-transform-on',
            { nameHint: '_transformOn' },
          );
          mergeArgs.push(t.callExpression(
            transformOn,
            [attributeValue || t.booleanLiteral(true)],
          ));
          return;
        }
        if (isDirective(name) || name === 'onUpdate:modelValue') {
          if (name === 'onUpdate:modelValue') {
            directives.push(attributeValue);
          } else {
            const directiveName = name.startsWith('v-')
              ? name.replace('v-', '')
              : name.replace(`v${name[1]}`, name[1].toLowerCase());
            if (directiveName === 'show') {
              directives.push(t.arrayExpression([
                createIdentifier(t, state, 'vShow'),
                attributeValue,
              ]));
            } else {
              directives.push(t.arrayExpression([
                t.callExpression(createIdentifier(t, state, 'resolveDirective'), [
                  t.stringLiteral(directiveName),
                ]),
                attributeValue,
              ]));
            }
          }
          return;
        }
        if (needToMerge(name)) {
          mergeArgs.push(
            t.objectExpression([
              t.objectProperty(
                t.stringLiteral(
                  name,
                ),
                attributeValue,
              ),
            ]),
          );
          return;
        }
        if (name.match(xlinkRE)) {
          name = name.replace(xlinkRE, (_, firstCharacter) => `xlink:${firstCharacter.toLowerCase()}`);
        }
        propsExpression.push(t.objectProperty(
          t.stringLiteral(name),
          attributeValue || t.booleanLiteral(true),
        ));
      } else {
        hasDynamicKeys = true;
        propsExpression.push(transformJSXSpreadAttribute(t, prop, mergeArgs));
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
    if (dynamicPropNames.length) {
      patchFlag |= PatchFlags.PROPS;
    }
    if (hasHydrationEventBinding) {
      patchFlag |= PatchFlags.HYDRATE_EVENTS;
    }
  }

  if (
    (patchFlag === 0 || patchFlag === PatchFlags.HYDRATE_EVENTS)
    && hasRef
  ) {
    patchFlag |= PatchFlags.NEED_PATCH;
  }

  return {
    props: mergeArgs.length ? t.callExpression(
      createIdentifier(t, state, 'mergeProps'),
      [
        ...mergeArgs,
        propsExpression.length && t.objectExpression(propsExpression),
      ].filter(Boolean),
    ) : t.objectExpression(propsExpression),
    directives,
    patchFlag,
    dynamicPropNames,
  };
};

/**
 * Get children from Array of JSX children
 * @param t
 * @param paths Array<JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement>
 * @returns Array<Expression | SpreadElement>
 */
const getChildren = (t, paths) => paths
  .map((path) => {
    if (path.isJSXText()) {
      return transformJSXText(t, path);
    }
    if (path.isJSXExpressionContainer()) {
      return transformJSXExpressionContainer(path);
    }
    if (path.isJSXSpreadChild()) {
      return transformJSXSpreadChild(t, path);
    }
    if (path.isCallExpression()) {
      return path.node;
    }
    if (path.isJSXElement()) {
      return transformJSXElement(t, path);
    }
    throw new Error(`getChildren: ${path.type} is not supported`);
  }).filter((value) => (
    value !== undefined
      && value !== null
      && !t.isJSXEmptyExpression(value)
  ));


const transformJSXElement = (t, path, state) => {
  const tag = getTag(t, path);
  const children = t.arrayExpression(getChildren(t, path.get('children')));
  const {
    props,
    directives,
    patchFlag,
    dynamicPropNames = [],
  } = buildProps(t, path, state);

  const flagNames = Object.keys(PatchFlagNames)
    .map(Number)
    .filter((n) => n > 0 && patchFlag & n)
    .map((n) => PatchFlagNames[n])
    .join(', ');

  const isComponent = checkIsComponent(t, path.get('openingElement'));
  const createVNode = t.callExpression(createIdentifier(t, state, 'createVNode'), [
    tag,
    state.opts.compatibleProps ? t.callExpression(addDefault(
      path, '@ant-design-vue/babel-helper-vue-compatible-props', { nameHint: '_compatibleProps' },
    ), [props]) : props,
    children.elements.length
      ? (
        isComponent
          ? t.objectExpression([
            t.objectProperty(
              t.identifier('default'),
              t.callExpression(createIdentifier(t, state, 'withCtx'), [
                t.arrowFunctionExpression(
                  [],
                  children,
                ),
              ]),
            ),
          ])
          : children
      ) : t.nullLiteral(),
    patchFlag && t.addComment(t.numericLiteral(patchFlag), 'leading', ` ${flagNames} `),
    dynamicPropNames.length
      && t.arrayExpression(dynamicPropNames.map((name) => t.stringLiteral(name))),
  ].filter(Boolean));

  if (!directives.length) {
    return createVNode;
  }

  return t.callExpression(createIdentifier(t, state, 'withDirectives'), [
    createVNode,
    t.arrayExpression(directives),
  ]);
};

export default (t) => ({
  JSXElement: {
    exit(path, state) {
      if (!state.get('vue')) {
        state.set('vue', addNamespace(path, 'vue'));
      }
      path.replaceWith(
        transformJSXElement(t, path, state),
      );
    },
  },
});
