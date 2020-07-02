# Babel Plugin JSX for Vue 3.0

To add Vue JSX support.

English | [简体中文](./README-zh_CN.md)

## Installation

Install the plugin with:

```
npm install @ant-design-vue/babel-plugin-jsx -D

npm install @ant-design-vue/babel-helper-vue-transform-on
```

Then add the plugin to .babelrc:

```
{
  "plugins": ["@ant-design-vue/babel-plugin-jsx"]
}
```

## Usage

### options

* transformOn

transform `on: { click: xx }` to `onClick: xxx`
* compatibleProps

compatible with Vue 2.x

`{ props, on = {}, attrs, ...rest }` will be transformed to `{ ...props, ...attrs, ...transformOn(on), ...rest }`

## Compatibility

This repo is only compatible with:

- **Babel 7+**
- **Vue 3+**
