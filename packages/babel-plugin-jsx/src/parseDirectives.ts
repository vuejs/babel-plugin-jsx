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
  let modifiers: string[] | string[][] = name.split('_');
  let arg: t.StringLiteral | t.StringLiteral[] | undefined;
  let val: t.Expression | t.Expression[] | undefined;
  let modifiersSet: Set<string> | Set<string>[];
  const directiveName: string = modifiers.shift()
    ?.replace(/^v/, '')
    .replace(/^-/, '')
    .replace(/^\S/, (s: string) => s.toLowerCase()) || '';

  if (directiveName === 'model' && !t.isJSXExpressionContainer(path.get('value'))) {
    throw new Error('You have to use JSX Expression inside your v-model');
  }

  if (directiveName === 'models' && !isComponent) {
    throw new Error('v-models can only use in custom components');
  }

  const shouldResolve = !['html', 'text', 'model', 'models'].includes(directiveName)
    || (directiveName === 'model' && !isComponent);

  if (directiveName === 'models' && t.isArrayExpression(value)) {
    const { elements } = value;
    arg = [];
    modifiers = [];
    val = [];

    elements.forEach((element) => {
      const { elements: _elements } = element as t.ArrayExpression;
      const [first, second, third] = _elements;
      if (t.isStringLiteral(second)) {
        (arg as t.StringLiteral[]).push(second);
        (modifiers as string[][]).push(parseModifiers(third as t.Expression));
      } else {
        throw new Error('You should pass the second param as string to the array element in the 2D array');
      }
      (val as t.Expression[]).push(first as t.Expression);
    });
  } else if (t.isArrayExpression(value)) {
    const { elements } = value;
    const [first, second, third] = elements;
    if (t.isStringLiteral(second)) {
      arg = second;
      modifiers = parseModifiers(third as t.Expression);
    } else if (second) {
      modifiers = parseModifiers(second as t.Expression);
    }
    val = first as t.Expression;
  }

  if (directiveName === 'models' && t.isArrayExpression(value)) {
    modifiersSet = (modifiers as string[][]).map((item) => new Set(item));
  } else {
    modifiersSet = new Set(modifiers as string[]);
  }

  return {
    directiveName,
    modifiers: modifiersSet,
    value: val || value,
    arg,
    directive: shouldResolve ? [
      resolveDirective(path, state, tag, directiveName),
      (val as t.Expression) || value,
      !!(modifiersSet as Set<string>).size && t.unaryExpression('void', t.numericLiteral(0), true),
      !!(modifiersSet as Set<string>).size && t.objectExpression(
        [...(modifiersSet as Set<string>)].map(
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
