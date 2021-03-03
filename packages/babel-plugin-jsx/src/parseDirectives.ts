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

const parseModifiers = (value: t.ArrayExpression): string[] => (
  t.isArrayExpression(value)
    ? value.elements
      .map((el) => (t.isStringLiteral(el) ? el.value : ''))
      .filter(Boolean)
    : []);

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
  const args: Array<t.StringLiteral | t.Identifier | t.NullLiteral> = [];
  const vals: t.Expression[] = [];
  const modifiersSet: Set<string>[] = [];
  const underscoreModifiers = name.split('_');
  const directiveName: string = underscoreModifiers.shift()
    ?.replace(/^v/, '')
    .replace(/^-/, '')
    .replace(/^\S/, (s: string) => s.toLowerCase()) || '';

  const isVModels = directiveName === 'models';
  const isVModel = directiveName === 'model';
  if (isVModel && !t.isJSXExpressionContainer(path.get('value'))) {
    throw new Error('You have to use JSX Expression inside your v-model');
  }

  if (isVModels && !isComponent) {
    throw new Error('v-models can only use in custom components');
  }

  const shouldResolve = !['html', 'text', 'model', 'models'].includes(directiveName)
    || (isVModel && !isComponent);

  if (['models', 'model'].includes(directiveName)) {
    if (t.isArrayExpression(value)) {
      const elementsList = isVModels ? value.elements! : [value];

      elementsList.forEach((element) => {
        if (isVModels && !t.isArrayExpression(element)) {
          throw new Error('You should pass a Two-dimensional Arrays to v-models');
        }

        const { elements } = element as t.ArrayExpression;
        const [first, second, third] = elements;
        let modifiers = underscoreModifiers;

        if (t.isStringLiteral(second) || t.isIdentifier(second)) {
          args.push(second);
          modifiers = parseModifiers(third as t.ArrayExpression);
        } else if (t.isArrayExpression(second)) {
          args.push(t.nullLiteral());
          modifiers = parseModifiers(second);
        } else {
          // work as v-model={[value]} or v-models={[[value]]}
          args.push(t.nullLiteral());
        }
        modifiersSet.push(new Set(modifiers));
        vals.push(first as t.Expression);
      });
    } else if (isVModel) {
      // work as v-model={value}
      args.push(t.nullLiteral());
      modifiersSet.push(new Set(underscoreModifiers));
    }
  } else {
    modifiersSet.push(new Set(underscoreModifiers));
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
