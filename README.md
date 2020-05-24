# Babel Preset JSX for Vue 3.0

To add Vue JSX support.

## Installation

Install the preset with:

```
npm install @ant-design-vue/babel-preset-jsx
```

Then add the preset to .babelrc:

```
{
  "presets": ["@ant-design-vue/babel-preset-jsx"]
}
```

## Syntax

### Content
functional component

```jsx
const App = () => <div></div>
```

with render

```jsx
const App = {
  render() {
    return <div>Vue 3.0</div>
  }
}
```

```jsx
const App = defineComponent(() => {
  const count = ref(0);

  const inc = () => {
    count.value++;
  };

  return () => (
    <div onClick={inc}>
      {count.value}
    </div>
  )
})
```

fragment

```jsx
const App = () => (
  <>
    <span>I'm</span>
    <span>Fragment</span>
  </>
)
```

### Attributes/Props

```jsx
const App = () => <input type="email" />
```

with a dynamic binding:

```jsx
const placeholderText = 'email'
const App = () => (
  <input
    type="email"
    placeholder={placeholderText}
  />
)
```

### Directives

> It is recommended to use camelCase version of it (`vModel`) in JSX, but you can use kebab-case too (`v-model`).

v-show

```jsx
const App = {
  data() {
    return { visible: true };
  },
  render() {
    return <input vShow={this.visible} />;
  },
};
```

v-model

* You should use underscore (`_`) instead of dot (`.`) for modifiers (`vModel_trim={this.test}`)

```jsx
export default {
  data: () => ({
    test: 'Hello World',
  }),
  render() {
    return (
      <>
        <input type="text" vModel_trim={this.test} />
        {this.test}
      </>
    )
  },
}
```


## Compatibility

This repo is only compatible with:

- **Babel 7+**
- **Vue 3+**
