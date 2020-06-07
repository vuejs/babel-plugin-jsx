import camelCase from 'camelcase';
import { addNamespace } from '@babel/helper-module-imports';
import { createIdentifier, checkIsComponent } from './utils';

const cachedCamelCase = (() => {
  const cache = Object.create(null);
  return (string) => {
    if (!cache[string]) {
      cache[string] = camelCase(string);
    }

    return cache[string];
  };
})();

const startsWithCamel = (string, match) => string.startsWith(match)
  || string.startsWith(cachedCamelCase(match));

/**
 * Add property to a JSX element
 *
 * @param t
 * @param path JSXOpeningElement
 * @param value string
 */
const addProp = (path, value) => {
  path.node.attributes.push(value);
};

/**
 * Get JSX element tag name
 *
 * @param path Path<JSXOpeningElement>
 */
const getTagName = (path) => path.get('name.name').node;

/**
 * Get JSX element type
 *
 * @param t
 * @param path Path<JSXOpeningElement>
 */
const getType = (t, path) => {
  const typePath = path
    .get('attributes')
    .find(
      (attributePath) => t.isJSXAttribute(attributePath)
        && t.isJSXIdentifier(attributePath.get('name'))
        && attributePath.get('name.name').node === 'type'
        && t.isStringLiteral(attributePath.get('value')),
    );

  return typePath ? typePath.get('value.value').node : '';
};

/**
 * @param t
 * Transform vModel
*/
const getModelDirective = (t, path, state, value) => {
  const tag = getTagName(path);
  const type = getType(t, path);

  addProp(path, t.jsxSpreadAttribute(
    t.objectExpression([
      t.objectProperty(
        t.stringLiteral('onUpdate:modelValue'),
        t.arrowFunctionExpression(
          [t.identifier('$event')],
          t.assignmentExpression('=', value, t.identifier('$event')),
        ),
      ),
    ]),
  ));

  if (checkIsComponent(t, path)) {
    addProp(path, t.jsxAttribute(t.jsxIdentifier('modelValue'), t.jsxExpressionContainer(value)));
    return null;
  }

  let modelToUse;
  switch (tag) {
    case 'select':
      modelToUse = createIdentifier(t, state, 'vModelSelect');
      break;
    case 'textarea':
      modelToUse = createIdentifier(t, state, 'vModelText');
      break;
    default:
      switch (type) {
        case 'checkbox':
          modelToUse = createIdentifier(t, state, 'vModelCheckbox');
          break;
        case 'radio':
          modelToUse = createIdentifier(t, state, 'vModelRadio');
          break;
        default:
          modelToUse = createIdentifier(t, state, 'vModelText');
      }
  }

  return modelToUse;
};


/**
 * Parse vModel metadata
 *
 * @param t
 * @param  path JSXAttribute
 * @returns null | Object<{ modifiers: Set<string>, valuePath: Path<Expression>}>
 */
const parseVModel = (t, path) => {
  if (t.isJSXNamespacedName(path.get('name')) || !startsWithCamel(path.get('name.name').node, 'v-model')) {
    return null;
  }

  if (!t.isJSXExpressionContainer(path.get('value'))) {
    throw new Error('You have to use JSX Expression inside your v-model');
  }

  const modifiers = path.get('name.name').node.split('_');
  modifiers.shift();

  return {
    modifiers: new Set(modifiers),
    value: path.get('value.expression').node,
  };
};

export default (t) => ({
  JSXAttribute: {
    exit(path, state) {
      const parsed = parseVModel(t, path);
      if (!parsed) {
        return;
      }

      if (!state.get('vue')) {
        state.set('vue', addNamespace(path, 'vue'));
      }

      const { modifiers, value } = parsed;

      const parent = path.parentPath;
      // v-model={xx} --> v-_model={[directive, xx, void 0, { a: true, b: true }]}
      const directive = getModelDirective(t, parent, state, value);
      if (directive) {
        path.replaceWith(
          t.jsxAttribute(
            t.jsxIdentifier('_model'), // TODO
            t.jsxExpressionContainer(
              t.arrayExpression([
                directive,
                value,
                modifiers.size && t.unaryExpression('void', t.numericLiteral(0), true),
                modifiers.size && t.objectExpression(
                  [...modifiers].map(
                    (modifier) => t.objectProperty(
                      t.identifier(modifier),
                      t.booleanLiteral(true),
                    ),
                  ),
                ),
              ].filter(Boolean)),
            ),
          ),
        );
      } else {
        path.remove();
      }
    },
  },
});
