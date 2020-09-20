# Vue 3 Babel JSX 插件

[![CircleCI](https://circleci.com/gh/vuejs/jsx-next.svg?style=svg)](https://circleci.com/gh/vuejs/vue-next) [![npm package](https://img.shields.io/npm/v/@vue/babel-plugin-jsx.svg?style=flat-square)](https://www.npmjs.com/package/@vue/babel-plugin-jsx)

以 JSX 的方式来编写 Vue 代码

[English](/packages/babel-plugin-jsx/README.md) | 简体中文

## 安装

安装插件

```bash
npm install @vue/babel-plugin-jsx -D
```

配置 Babel 

```js
{
  "plugins": ["@vue/babel-plugin-jsx"]
}
```

## 使用

### 参数

#### transformOn

Type: `boolean`

Default: `false`

把 `on: { click: xx }` 转成 `onClick: xxx`

#### optimize

Type: `boolean`

Default: `false`

是否开启优化. 如果你对 Vue 3 不太熟悉，不建议打开

#### isCustomElement

Type: `(tag: string) => boolean`

Default: `undefined`

自定义元素

#### mergeProps

Type: `boolean`

Default: `true`

合并 class / style / onXXX handlers

## 表达式

### 内容
函数式组件

```jsx
const App = () => <div></div>;
```

在 render 中使用

```jsx
const App = {
  render() {
    return <div>Vue 3.0</div>;
  }
};
```

```jsx
import { withModifiers, defineComponent } from 'vue';

const App = defineComponent({
  setup() {
    const count = ref(0);

    const inc = () => {
      count.value++;
    };

    return () => (
      <div onClick={withModifiers(inc, ['self'])}>
        {count.value}
      </div>
    );
  }
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

### 指令

v-show

```jsx
const App = {
  data() {
    return { visible: true };
  },
  render() {
    return <input v-show={this.visible} />;
  },
};
```

v-model

> 注意：如果想要使用 `arg`, 第二个参数需要为字符串

```jsx
<input v-model={val} />
```

```jsx
<input v-model={[val, ['trim']]} />
```

```jsx
<A v-model={[val, 'foo', ['bar']]} />
```

会变编译成：

```js
h(A, {
  'foo': val,
  "fooModifiers": {
    "bar": true
  },
  "onUpdate:foo": $event => val = $event
})
```

自定义指令

```jsx
const App = {
  directives: { custom: customDirective },
  setup() {
    return () => (
      <a
        v-custom={[val, 'arg', ['a', 'b']]}
      />
    );
  },
};
```

### 插槽 

```jsx
const App = {
  setup() {
    const slots = {
      default: () => <div>A</div>,
      foo: () => <span>B</span>
    };
    return () => <A v-slots={slots} />;
  }
};
```

### 在 TypeSript 中使用

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

## 谁在用

<table>
  <tbody>
    <tr>
      <td align="center">
        <a target="_blank" href="https://www.antdv.com/">
          <img
            width="32"
            src="https://qn.antdv.com/logo.png"
          />
          <br>
          <strong>Ant Design Vue</strong>
        </a>
      </td>
      <td align="center">
        <a target="_blank" href="https://youzan.github.io/vant/#/zh-CN/">
          <img
            width="32"
            style="vertical-align: -0.32em; margin-right: 8px;"
            src="https://img.yzcdn.cn/vant/logo.png"
          />
          <br>
          <strong>Vant</strong>
        </a>
      </td>
      <td align="center">
        <a target="_blank" href="https://github.com/element-plus/element-plus">
          <img
            height="32"
            style="vertical-align: -0.32em; margin-right: 8px;"
            src="https://user-images.githubusercontent.com/10731096/91267529-259f3680-e7a6-11ea-9a60-3286f750de01.png"
          />
          <br>
          <strong>Element Plus</strong>
        </a>
      </td>
    </tr>
  </tbody>
</table>

## 兼容性

要求：

- **Babel 7+**
- **Vue 3+**
