# Babel Preset JSX for Vue 3.0

To add Vue JSX support.

## Syntax

functional component

```jsx
const App = () => <div></div>
```

with setup render

```jsx
const App = defineComponent(() => {
  const count = ref(0);
  return () => (
    <div>
      {count.value}
    </div>
  )
})
```
