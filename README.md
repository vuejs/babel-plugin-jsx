# Babel Preset JSX for Vue 3.0

To add Vue JSX support.

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

## Compatibility

This repo is only compatible with:

- **Babel 7+**
- **Vue 3+**
