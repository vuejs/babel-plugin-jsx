const syntaxJsx = require('@babel/plugin-syntax-jsx').default;
const t = require('@babel/types');
const helperModuleImports = require('@babel/helper-module-imports');

const transformFragment = (path, { name }) => {
  const children = path.get('children') || [];
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier(name), []),
    t.jsxClosingElement(t.jsxIdentifier(name)),
    children.map(({ node }) => node),
    false,
  );
};

module.exports = () => ({
  name: 'babel-sugar-fragment',
  inherits: syntaxJsx,
  visitor: {
    JSXFragment: {
      enter(path, state) {
        if (!state.vueFragment) {
          state.vueFragment = helperModuleImports.addNamed(path, 'Fragment', 'vue');
        }
        path.replaceWith(transformFragment(path, state.vueFragment));
      },
    },
  },
});
