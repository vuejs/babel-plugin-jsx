const syntaxJsx = require('@babel/plugin-syntax-jsx').default;
const t = require('@babel/types');
const htmlTags = require('html-tags');
const svgTags = require('svg-tags');
const camelCase = require('camelcase');
const { addNamed } = require('@babel/helper-module-imports');


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
 * @param t
 * @param path Path<JSXOpeningElement>
 */
const getTagName = (path) => path.get('name.name').node;

/**
 * Get JSX element type
 *
 * @param t
 * @param path Path<JSXOpeningElement>
 */
const getType = (path) => {
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
 * Check if a JSXOpeningElement is a component
 *
 * @param t
 * @param path JSXOpeningElement
 * @returns boolean
 */
const isComponent = (path) => {
  const name = path.get('name');

  if (t.isJSXMemberExpression(name)) {
    return true;
  }

  const tag = name.get('name').node;

  return !htmlTags.includes(tag) && !svgTags.includes(tag);
};

/**
 * Transform vModel
*/
const getModelDirective = (path, state, value) => {
  const tag = getTagName(path);
  const type = getType(path);

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

  if (isComponent(path)) {
    addProp(path, t.jsxAttribute(t.jsxIdentifier('modelValue'), t.jsxExpressionContainer(value)));
    return null;
  }

  let modelToUse;
  switch (tag) {
    case 'select':
      if (!state.vueVModelSelect) {
        state.vueVModelSelect = addNamed(path, 'vModelSelect', 'vue');
      }
      modelToUse = state.vueVModelSelect;
      break;
    case 'textarea':
      if (!state.vueVModelText) {
        state.vueVModelText = addNamed(path, 'vModelText', 'vue');
      }
      break;
    default:
      switch (type) {
        case 'checkbox':
          if (!state.vueVModelCheckbox) {
            state.vueVModelCheckbox = addNamed(path, 'vModelCheckbox', 'vue');
          }
          modelToUse = state.vueVModelCheckbox;
          break;
        case 'radio':
          if (!state.vueVModelRadio) {
            state.vueVModelRadio = addNamed(path, 'vModelRadio', 'vue');
          }
          modelToUse = state.vueVModelRadio;
          break;
        default:
          if (!state.vueVModelText) {
            state.vueVModelText = addNamed(path, 'vModelText', 'vue');
          }
          modelToUse = state.vueVModelText;
      }
  }

  return modelToUse;
};


/**
 * Parse vModel metadata
 *
 * @param  path JSXAttribute
 * @returns null | Object<{ modifiers: Set<string>, valuePath: Path<Expression>}>
 */
const parseVModel = (path) => {
  if (t.isJSXNamespacedName(path.get('name')) || !startsWithCamel(path.get('name.name').node, 'v-model')) {
    return null;
  }

  if (!t.isJSXExpressionContainer(path.get('value'))) {
    throw new Error('You have to use JSX Expression inside your v-model');
  }

  const modifiers = path.get('name.name').node.split('_');

  return {
    modifiers: new Set(modifiers),
    value: path.get('value.expression').node,
  };
};

module.exports = () => ({
  name: 'babel-sugar-v-model',
  inherits: syntaxJsx,
  visitor: {
    JSXAttribute: {
      exit(path, state) {
        const parsed = parseVModel(path);
        if (!parsed) {
          return;
        }

        const { modifiers, value } = parsed;

        const parent = path.parentPath;
        // v-model={xx} --> v-_model={[directive, xx, void 0, { a: true, b: true }]}
        const directive = getModelDirective(parent, state, value);
        if (directive) {
          path.replaceWith(
            t.jsxAttribute(
              t.jsxIdentifier('v-_model'), // TODO
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
  },
});
