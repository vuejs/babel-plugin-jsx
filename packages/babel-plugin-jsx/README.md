# @ant-design-vue/babel-plugin-jsx

To add Vue JSX support.

English | [简体中文](./README-zh_CN.md)

## Installation

Install the plugin with:

```bash
npm install @ant-design-vue/babel-plugin-jsx -D
```

Then add the plugin to .babelrc:

```js
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

## Syntax

### Content
functional component

```jsx
const App = () => <div></div>;
```

with render

```jsx
const App = {
  render() {
    return <div>Vue 3.0</div>;
  }
};
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
  );
});
```

Fragment

```jsx
const App = () => (
  <>
    <span>I'm</span>
    <span>Fragment</span>
  </>
);
```

### Attributes / Props

```jsx
const App = () => <input type="email" />;
```

with a dynamic binding:

```jsx
const placeholderText = 'email';
const App = () => (
  <input
    type="email"
    placeholder={placeholderText}
  />
);
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

> Note: You should pass the second param as string for using `arg`.

```jsx
<input vModel={val} />
```

```jsx
<input vModel={[val, ['trim']]} />
```

```jsx
<A vModel={[val, 'foo', ['bar']]} />
```

Will compile to:

```js
h(A, {
  'foo': val,
  "fooModifiers": {
    "bar": true
  },
  "onUpdate:foo": $event => val = $event
})
```

custom directive

```jsx
const App = {
  directives: { custom: customDirective },
  setup() {
    return () => (
      <a
        vCustom={[val, 'arg', ['a', 'b']]}
      />
    );
  },
};
```

### Slot 

```jsx
const App = {
  setup() {
    const slots = {
      a: () => <div>A</div>,
      b: () => <span>B</span>
    };
    return () => <A vSlots={slots} />;
  }
};
```
