import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import { addDefault } from '@babel/helper-module-imports';
import {
  createIdentifier,
  isDirective,
  checkIsComponent,
  getTag,
  getJSXAttributeName,
  walksScope,
  transformJSXExpressionContainer,
} from './utils';
import parseDirectives from './parseDirectives';
import { PatchFlags } from './patchFlags';
import { State } from '.';
import { transformJSXElement } from './transform-vue-jsx';
import SlotFlags from './slotFlags';

const xlinkRE = /^xlink([A-Z])/;
const onRE = /^on[^a-z]/;

const isOn = (key: string) => onRE.test(key);

export type Slots = t.Identifier | t.ObjectExpression | null;

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

const transformJSXSpreadAttribute = (
  nodePath: NodePath,
  path: NodePath<t.JSXSpreadAttribute>,
  mergeProps: boolean,
  args: (t.ObjectProperty | t.Expression | t.SpreadElement)[],
) => {
  const argument = path.get('argument') as NodePath<t.ObjectExpression>;
  const { properties } = argument.node;
  if (!properties) {
    if (argument.isIdentifier()) {
      walksScope(nodePath, (argument as any).name, SlotFlags.DYNAMIC);
    }
    args.push(mergeProps ? argument.node : t.spreadElement(argument.node));
  } else if (mergeProps) {
    args.push(t.objectExpression(properties));
  } else {
    args.push(...(properties as t.ObjectProperty[]));
  }
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

const dedupeProperties = (properties: t.ObjectProperty[] = [], mergeProps?: boolean) => {
  if (!mergeProps) {
    return properties;
  }
  const knownProps = new Map<string, t.ObjectProperty>();
  const deduped: t.ObjectProperty[] = [];
  properties.forEach((prop) => {
    if (t.isStringLiteral(prop.key)) {
      const { value: name } = prop.key;
      const existing = knownProps.get(name);
      if (existing) {
        if (name === 'style' || name === 'class' || name.startsWith('on')) {
          mergeAsArray(existing, prop);
        }
      } else {
        knownProps.set(name, prop);
        deduped.push(prop);
      }
    } else {
      // v-model target with variable
      deduped.push(prop);
    }
  });

  return deduped;
};

/**
 *  Check if an attribute value is constant
 * @param node
 * @returns boolean
 */
const isConstant = (
  node: t.Expression | t.Identifier | t.Literal | t.SpreadElement | null,
): boolean => {
  if (t.isIdentifier(node)) {
    return node.name === 'undefined';
  }
  if (t.isArrayExpression(node)) {
    const { elements } = node;
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

const buildProps = (path: NodePath<t.JSXElement>, state: State) => {
  const tag = getTag(path, state);
  const isComponent = checkIsComponent(path.get('openingElement'));
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
              const isIdentifierProp = t.isIdentifier(propName);

              // must be v-model or v-models and is a component
              if (!directive) {
                properties.push(
                  t.objectProperty(t.isNullLiteral(propName)
                    ? t.stringLiteral('modelValue') : propName, value as any, isIdentifierProp),
                );
                if (!isIdentifierProp) {
                  dynamicPropNames.add((propName as t.StringLiteral)?.value || 'modelValue');
                }

                if (modifiers[index]?.size) {
                  properties.push(
                    t.objectProperty(
                      isIdentifierProp
                        ? t.binaryExpression('+', propName, t.stringLiteral('Modifiers'))
                        : t.stringLiteral(`${(propName as t.StringLiteral)?.value || 'model'}Modifiers`),
                      t.objectExpression(
                        [...modifiers[index]].map((modifier) => t.objectProperty(
                          t.stringLiteral(modifier),
                          t.booleanLiteral(true),
                        )),
                      ),
                      isIdentifierProp,
                    ),
                  );
                }
              }

              const updateName = isIdentifierProp
                ? t.binaryExpression('+', t.stringLiteral('onUpdate'), propName)
                : t.stringLiteral(`onUpdate:${(propName as t.StringLiteral)?.value || 'modelValue'}`);

              properties.push(
                t.objectProperty(
                  updateName,
                  t.arrowFunctionExpression(
                    [t.identifier('$event')],
                    t.assignmentExpression('=', value as any, t.identifier('$event')),
                  ),
                  isIdentifierProp,
                ),
              );

              if (!isIdentifierProp) {
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

export default buildProps;
