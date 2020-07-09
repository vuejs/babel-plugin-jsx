import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import { addDefault, addNamespace } from '@babel/helper-module-imports';
import {
  createIdentifier,
  isDirective,
  checkIsComponent,
  transformJSXSpreadChild,
  getTag,
  getJSXAttributeName,
  transformJSXText,
  transformJSXExpressionContainer,
  parseDirectives,
  isFragment,
} from './utils';
import { PatchFlags, PatchFlagNames } from './patchFlags';
import { State, ExcludesFalse } from './';

const xlinkRE = /^xlink([A-Z])/;
const onRE = /^on[^a-z]/;

const isOn = (key: string) => onRE.test(key);

const transformJSXSpreadAttribute = (
  path: NodePath<t.JSXSpreadAttribute>,
  mergeArgs: (t.ObjectProperty | t.Expression)[]
) => {
  const argument = path.get('argument') as NodePath<t.ObjectExpression>;
  const { properties } = argument.node;
  if (!properties) {
    // argument is an Identifier
    mergeArgs.push(argument.node);
  } else {
    mergeArgs.push(t.objectExpression(properties));
  }
};

const getJSXAttributeValue = (
  path: NodePath<t.JSXAttribute>,
  state: State
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

/**
 *  Check if an attribute value is constant
 * @param path
 * @returns boolean
 */
const isConstant = (
  node: t.Expression | t.Identifier | t.Literal | t.SpreadElement | null
): boolean => {
  if (t.isIdentifier(node)) {
    return node.name === 'undefined';
  }
  if (t.isArrayExpression(node)) {
    const elements = node.elements;
    return elements.every((element) => element && isConstant(element));
  }
  if (t.isObjectExpression(node)) {
    return node.properties.every((property) => isConstant((property as any).value));
  }
  if (t.isLiteral(node)) {
    return true;
  }
  return false;
};

const mergeAsArray = (existing: t.ObjectProperty, incoming: t.ObjectProperty) => {
  if (t.isArrayExpression(existing.value)) {
    existing.value.elements.push(incoming.value as t.Expression);
  } else {
    existing.value = t.arrayExpression([
      existing.value as t.Expression,
      incoming.value as t.Expression,
    ]);
  }
};

const dedupeProperties = (properties: t.ObjectProperty[] = []) => {
  const knownProps = new Map<string, t.ObjectProperty>();
  const deduped: t.ObjectProperty[] = [];
  properties.forEach((prop) => {
    const { value: name } = prop.key as t.StringLiteral;
    const existing = knownProps.get(name);
    if (existing) {
      if (name === 'style' || name === 'class' || name.startsWith('on')) {
        mergeAsArray(existing, prop);
      }
    } else {
      knownProps.set(name, prop);
      deduped.push(prop);
    }
  });

  return deduped;
};

const buildProps = (path: NodePath<t.JSXElement>, state: State) => {
  const tag = getTag(path, state);
  const isComponent = checkIsComponent(path.get('openingElement'));
  const props = path.get('openingElement').get('attributes');
  const directives: t.ArrayExpression[] = [];
  const dynamicPropNames = new Set();

  let patchFlag = 0;

  if (isFragment(path.get('openingElement').get('name'))) {
    patchFlag |= PatchFlags.STABLE_FRAGMENT;
  }

  if (props.length === 0) {
    return {
      tag,
      props: t.nullLiteral(),
      directives,
      patchFlag,
      dynamicPropNames,
    };
  }

  const properties: t.ObjectProperty[] = [];

  // patchFlag analysis
  let hasRef = false;
  let hasClassBinding = false;
  let hasStyleBinding = false;
  let hasHydrationEventBinding = false;
  let hasDynamicKeys = false;

  const mergeArgs: (t.CallExpression | t.ObjectProperty | t.Identifier)[] = [];
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
              '@ant-design-vue/babel-helper-vue-transform-on',
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
          const { directive, modifiers, directiveName } = parseDirectives({
            tag,
            isComponent,
            name,
            path: prop,
            state,
            value: attributeValue,
          });

          if (directive) {
            directives.push(t.arrayExpression(directive));
          } else {
            // must be v-model and is a component
            properties.push(t.objectProperty(
              t.stringLiteral('modelValue'),
              // @ts-ignore
              attributeValue,
            ));

            dynamicPropNames.add('modelValue');

            if (modifiers.size) {
              properties.push(t.objectProperty(
                t.stringLiteral('modelModifiers'),
                t.objectExpression(
                  [...modifiers].map((modifier) => (
                    t.objectProperty(
                      t.stringLiteral(modifier),
                      t.booleanLiteral(true),
                    )
                  )),
                ),
              ));
            }
          }

          if (directiveName === 'model' && attributeValue) {
            properties.push(t.objectProperty(
              t.stringLiteral('onUpdate:modelValue'),
              t.arrowFunctionExpression(
                [t.identifier('$event')],
                // @ts-ignore
                t.assignmentExpression('=', attributeValue, t.identifier('$event')),
              ),
            ));

            dynamicPropNames.add('onUpdate:modelValue');
          }
          return;
        }
        if (name.match(xlinkRE)) {
          name = name.replace(xlinkRE, (_, firstCharacter) => `xlink:${firstCharacter.toLowerCase()}`);
        }
        properties.push(t.objectProperty(
          t.stringLiteral(name),
          attributeValue || t.booleanLiteral(true),
        ));
      } else {
        // JSXSpreadAttribute
        hasDynamicKeys = true;
        transformJSXSpreadAttribute(prop as NodePath<t.JSXSpreadAttribute>, mergeArgs);
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
      mergeArgs.push(...dedupeProperties(properties));
    }
    if (mergeArgs.length > 1) {
      const exps: (t.CallExpression | t.Identifier)[] = [];
      const objectProperties: t.ObjectProperty[] = [];
      mergeArgs.forEach((arg) => {
        if (t.isIdentifier(arg) || t.isExpression(arg)) {
          exps.push(arg);
        } else {
          objectProperties.push(arg);
        }
      });
      propsExpression = t.callExpression(
        createIdentifier(state, 'mergeProps'),
        [
          ...exps,
          !!objectProperties.length && t.objectExpression(objectProperties),
        ].filter(Boolean as any as ExcludesFalse),
      );
    } else {
      // single no need for a mergeProps call
      propsExpression = mergeArgs[0];
    }
  } else if (properties.length) {
    propsExpression = t.objectExpression(dedupeProperties(properties));
  }

  return {
    tag,
    props: propsExpression,
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
  state: State
): t.Expression[] =>
  paths
    .map((path) => {
      if (path.isJSXText()) {
        const transformedText = transformJSXText(path);
        if (transformedText) {
          return t.callExpression(createIdentifier(state, 'createTextVNode'), [transformedText]);
        }
        return transformedText;
      }
      if (path.isJSXExpressionContainer()) {
        return transformJSXExpressionContainer(path);
      }
      if (t.isJSXSpreadChild(path)) {
        return transformJSXSpreadChild(path as NodePath<t.JSXSpreadChild>);
      }
      if (path.isCallExpression()) {
        return path.node;
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
  state: State
): t.CallExpression => {
  const children = getChildren(path.get('children'), state);
  const {
    tag,
    props,
    directives,
    patchFlag,
    dynamicPropNames,
  } = buildProps(path, state);

  const flagNames = Object.keys(PatchFlagNames)
    .map(Number)
    .filter((n) => n > 0 && patchFlag & n)
    .map((n) => PatchFlagNames[n])
    .join(', ');

  const { compatibleProps } = state.opts;
  if (compatibleProps && !state.get('compatibleProps')) {
    state.set('compatibleProps', addDefault(
      path, '@ant-design-vue/babel-helper-vue-compatible-props', { nameHint: '_compatibleProps' },
    ));
  }

  // @ts-ignore
  const createVNode = t.callExpression(createIdentifier(state, 'createVNode'), [
    tag,
    // @ts-ignore
    compatibleProps ? t.callExpression(state.get('compatibleProps'), [props]) : props,
    !!children.length ? t.arrayExpression(children) : t.nullLiteral(),
    !!patchFlag && t.addComment(t.numericLiteral(patchFlag), 'trailing', ` ${flagNames} `, false),
    !!dynamicPropNames.size
    && t.arrayExpression([...dynamicPropNames.keys()].map((name) => t.stringLiteral(name as string))),
  ].filter(Boolean as any as ExcludesFalse));

  if (!directives.length) {
    return createVNode;
  }

  return t.callExpression(createIdentifier(state, 'withDirectives'), [
    createVNode,
    t.arrayExpression(directives),
  ]);
};

export default () => ({
  JSXElement: {
    exit(path: NodePath<t.JSXElement>, state: State) {
      if (!state.get('vue')) {
        state.set('vue', addNamespace(path, 'vue'));
      }
      path.replaceWith(
        transformJSXElement(path, state),
      );
    },
  },
});
