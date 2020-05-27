# Babel Plugin JSX for Vue 3.0

To add Vue JSX support.

## Installation

Install the plugin with:

```
npm install @ant-design-vue/babel-plugin-jsx -D

npm install @ant-design-vue/babel-helper-vue-transform-on
```

Then add the plugin to .babelrc:

```
{
  "plugins": ["@ant-design-vue/babel-plugin-jsx", { "transformOn": true, "compatibleProps": true }]
}
```

## Usage

### options

* transformOn

transform `on: { click: xx }` to `onClick: xxx`, and you should install `@ant-design-vue/babel-helper-vue-transform-on`

* compatibleProps

compatible with Vue 2.x and you should install `@ant-design-vue/babel-helper-vue-compatible-props`

## Compatibility

This repo is only compatible with:

- **Babel 7+**
- **Vue 3+**
