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

const parseDirectives = (params: {
  name: string,
  path: NodePath<t.JSXAttribute>,
  value: t.StringLiteral | t.Expression | null,
  state: State,
  tag: Tag,
  isComponent: boolean
}) => {
  const {
    name, path, value, state, tag, isComponent,
  } = params;
  const args: t.StringLiteral[] = [];
  const vals: t.Expression[] = [];
  const modifiersSet: Set<string>[] = [];
  const directiveName: string = name.split('_').shift()
    ?.replace(/^v/, '')
    .replace(/^-/, '')
    .replace(/^\S/, (s: string) => s.toLowerCase()) || '';

  const isVModels = directiveName === 'models';
  if (directiveName === 'model' && !t.isJSXExpressionContainer(path.get('value'))) {
    throw new Error('You have to use JSX Expression inside your v-model');
  }

  if (isVModels && !isComponent) {
    throw new Error('v-models can only use in custom components');
  }

  const shouldResolve = !['html', 'text', 'model', 'models'].includes(directiveName)
    || (directiveName === 'model' && !isComponent);

  if (['models', 'model'].includes(directiveName) && t.isArrayExpression(value)) {
    let elementsList;
    if (isVModels) {
      elementsList = value.elements;
    } else {
      elementsList = [value];
    }

    elementsList.forEach((element) => {
      if (isVModels && !t.isArrayExpression(element)) {
        throw new Error('You should pass a 2D array to v-models');
      }

      const { elements } = element as t.ArrayExpression;
      const [first, second, third] = elements;

      if (isVModels && !t.isStringLiteral(second)) {
        throw new Error('You should pass the second param as string to the array element in the 2D array');
      }

      if (t.isStringLiteral(second)) {
        args.push(second);
        modifiersSet.push(new Set(parseModifiers(third as t.Expression)));
      } else if (second) {
        modifiersSet.push(new Set(parseModifiers(second as t.Expression)));
      }
      vals.push(first as t.Expression);
    });
  }

  return {
    directiveName,
    modifiers: modifiersSet,
    values: vals.length ? vals : [value],
    args,
    directive: shouldResolve ? [
      resolveDirective(path, state, tag, directiveName),
      vals[0] || value,
      !!modifiersSet[0]?.size && t.unaryExpression('void', t.numericLiteral(0), true),
      !!modifiersSet[0]?.size && t.objectExpression(
        [...modifiersSet[0]].map(
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
