import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import { createIdentifier } from './utils';
import { State, ExcludesBoolean } from '.';

export type Tag = t.Identifier | t.MemberExpression | t.StringLiteral | t.CallExpression;

/**
 * Get JSX element type
 *
 * @param path Path<JSXOpeningElement>
 */
const getType = (path: NodePath<t.JSXOpeningElement>) => {
  const typePath = path
    .get('attributes')
    .find((attribute) => {
      if (!t.isJSXAttribute(attribute)) {
        return false;
      }
      return t.isJSXIdentifier(attribute.get('name'))
        && (attribute.get('name') as NodePath<t.JSXIdentifier>).node.name === 'type';
    }) as NodePath<t.JSXAttribute> | undefined;

  return typePath ? typePath.get('value').node : null;
};

const parseModifiers = (value: t.Expression) => {
  let modifiers: string[] = [];
  if (t.isArrayExpression(value)) {
    modifiers = value.elements
      .map((el) => (t.isStringLiteral(el) ? el.value : '')).filter(Boolean);
  }
  return modifiers;
};

const parseDirectives = (args: {
  name: string,
  path: NodePath<t.JSXAttribute>,
  value: t.StringLiteral | t.Expression | null,
  state: State,
  tag: Tag,
  isComponent: boolean
}) => {
  const {
    name, path, value, state, tag, isComponent,
  } = args;
  let modifiers: string[] = name.split('_');
  let arg;
  let val;

  const directiveName: string = modifiers.shift()
    ?.replace(/^v/, '')
    .replace(/^-/, '')
    .replace(/^\S/, (s: string) => s.toLowerCase()) || '';

  if (directiveName === 'model' && !t.isJSXExpressionContainer(path.get('value'))) {
    throw new Error('You have to use JSX Expression inside your v-model');
  }

  const shouldResolve = !['html', 'text', 'model'].includes(directiveName)
    || (directiveName === 'model' && !isComponent);

  if (t.isArrayExpression(value)) {
    const { elements } = value;
    const [first, second, third] = elements;
    if (t.isStringLiteral(second)) {
      arg = second;
      modifiers = parseModifiers(third as t.Expression);
    } else if (second) {
      modifiers = parseModifiers(second as t.Expression);
    }
    val = first;
  }

  const modifiersSet = new Set(modifiers);

  return {
    directiveName,
    modifiers: modifiersSet,
    value: val || value,
    arg,
    directive: shouldResolve ? [
      resolveDirective(path, state, tag, directiveName),
      val || value,
      !!modifiersSet.size && t.unaryExpression('void', t.numericLiteral(0), true),
      !!modifiersSet.size && t.objectExpression(
        [...modifiersSet].map(
          (modifier) => t.objectProperty(
            t.identifier(modifier),
            t.booleanLiteral(true),
          ),
        ),
      ),
    ].filter(Boolean as any as ExcludesBoolean) : undefined,
  };
};

const resolveDirective = (
  path: NodePath<t.JSXAttribute>,
  state: State,
  tag: Tag,
  directiveName: string,
) => {
  if (directiveName === 'show') {
    return createIdentifier(state, 'vShow');
  }
  if (directiveName === 'model') {
    let modelToUse;
    const type = getType(path.parentPath as NodePath<t.JSXOpeningElement>);
    switch ((tag as t.StringLiteral).value) {
      case 'select':
        modelToUse = createIdentifier(state, 'vModelSelect');
        break;
      case 'textarea':
        modelToUse = createIdentifier(state, 'vModelText');
        break;
      default:
        if (t.isStringLiteral(type) || !type) {
          switch ((type as t.StringLiteral)?.value) {
            case 'checkbox':
              modelToUse = createIdentifier(state, 'vModelCheckbox');
              break;
            case 'radio':
              modelToUse = createIdentifier(state, 'vModelRadio');
              break;
            default:
              modelToUse = createIdentifier(state, 'vModelText');
          }
        } else {
          modelToUse = createIdentifier(state, 'vModelDynamic');
        }
    }
    return modelToUse;
  }
  return t.callExpression(
    createIdentifier(state, 'resolveDirective'), [
      t.stringLiteral(directiveName),
    ],
  );
};

export default parseDirectives;
