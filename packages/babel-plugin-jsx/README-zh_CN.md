# Vue 3 Babel JSX 插件

[![npm package](https://img.shields.io/npm/v/@vue/babel-plugin-jsx.svg?style=flat-square)](https://www.npmjs.com/package/@vue/babel-plugin-jsx)
[![issues-helper](https://img.shields.io/badge/Issues%20Manage%20By-issues--helper-orange?style=flat-square)](https://github.com/actions-cool/issues-helper)

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

开启此选项后，JSX 插件会尝试使用 [`PatchFlags`](https://cn.vuejs.org/guide/extras/rendering-mechanism#patch-flags) 和 [`SlotFlags`](https://github.com/vuejs/core/blob/v3.5.13/packages/runtime-core/src/componentSlots.ts#L69-L77) 来优化运行时代码，从而提升渲染性能。需要注意的是，JSX 的灵活性远高于模板语法，这使得编译优化的可能性相对有限，其优化效果会比 Vue 官方模板编译器更为有限。

优化后的代码会选择性地跳过一些重渲染操作以提高性能。因此，建议在开启此选项后对应用进行完整的测试，确保所有功能都能正常工作。

#### isCustomElement

Type: `(tag: string) => boolean`

Default: `undefined`

自定义元素

#### mergeProps

Type: `boolean`

Default: `true`

合并 class / style / onXXX handlers

#### enableObjectSlots

使用 `enableObjectSlots` (文档下面会提到)。虽然在 JSX 中比较好使，但是会增加一些 `_isSlot` 的运行时条件判断，这会增加你的项目体积。即使你关闭了 `enableObjectSlots`，`v-slots` 还是可以使用

#### pragma

Type: `string`

Default: `createVNode`

替换编译 JSX 表达式的时候使用的函数

#### resolveType

Type: `boolean`

Default: `false`

(**Experimental**) Infer component metadata from types (e.g. `props`, `emits`, `name`). This is an experimental feature and may not work in all cases.

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
  },
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
      <div onClick={withModifiers(inc, ['self'])}>{count.value}</div>
    );
  },
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

动态绑定:

```jsx
const placeholderText = 'email';
const App = () => <input type="email" placeholder={placeholderText} />;
```

### 指令

#### v-show

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

#### v-model

> 注意：如果想要使用 `arg`, 第二个参数需要为字符串

```jsx
<input v-model={val} />
```

```jsx
<input v-model:argument={val} />
```

```jsx
<input v-model={[val, ['modifier']]} />
// 或者
<input v-model_modifier={val} />
```

```jsx
<A v-model={[val, 'argument', ['modifier']]} />
// 或者
<input v-model:argument_modifier={val} />
```

会编译成：

```js
h(A, {
  argument: val,
  argumentModifiers: {
    modifier: true,
  },
  'onUpdate:argument': ($event) => (val = $event),
});
```

#### v-models (从 1.1.0 开始不推荐使用)

> 注意: 你应该传递一个二维数组给 v-models。

```jsx
<A v-models={[[foo], [bar, 'bar']]} />
```

```jsx
<A
  v-models={[
    [foo, 'foo'],
    [bar, 'bar'],
  ]}
/>
```

```jsx
<A
  v-models={[
    [foo, ['modifier']],
    [bar, 'bar', ['modifier']],
  ]}
/>
```

会编译成：

```js
h(A, {
  modelValue: foo,
  modelModifiers: {
    modifier: true,
  },
  'onUpdate:modelValue': ($event) => (foo = $event),
  bar: bar,
  barModifiers: {
    modifier: true,
  },
  'onUpdate:bar': ($event) => (bar = $event),
});
```

#### 自定义指令

只有 argument 的时候推荐使用

```jsx
const App = {
  directives: { custom: customDirective },
  setup() {
    return () => <a v-custom:arg={val} />;
  },
};
```

```jsx
const App = {
  directives: { custom: customDirective },
  setup() {
    return () => <a v-custom={[val, 'arg', ['a', 'b']]} />;
  },
};
```

### 插槽

> 注意: 在 `jsx` 中，应该使用 **`v-slots`** 代替 _`v-slot`_

```jsx
const A = (props, { slots }) => (
  <>
    <h1>{slots.default ? slots.default() : 'foo'}</h1>
    <h2>{slots.bar?.()}</h2>
  </>
);

const App = {
  setup() {
    const slots = {
      bar: () => <span>B</span>,
    };
    return () => (
      <A v-slots={slots}>
        <div>A</div>
      </A>
    );
  },
};

// or

const App = {
  setup() {
    const slots = {
      default: () => <div>A</div>,
      bar: () => <span>B</span>,
    };
    return () => <A v-slots={slots} />;
  },
};

// 或者，当 `enableObjectSlots` 不是 `false` 时，您可以使用对象插槽
const App = {
  setup() {
    return () => (
      <>
        <A>
          {{
            default: () => <div>A</div>,
            bar: () => <span>B</span>,
          }}
        </A>
        <B>{() => 'foo'}</B>
      </>
    );
  },
};
```

### 在 TypeScript 中使用

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

## 谁在使用

<table>
  <tbody>
    <tr>
      <td align="center">
        <a target="_blank" href="https://www.antdv.com/">
          <img
            width="32"
            src="https://github.com/vuejs/babel-plugin-jsx/assets/6481596/8d604d42-fe5f-4450-af87-97999537cd21"
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
      <td align="center">
        <a target="_blank" href="https://github.com/leezng/vue-json-pretty">
          <img
            height="32"
            style="vertical-align: -0.32em; margin-right: 8px;"
            src="https://raw.githubusercontent.com/leezng/vue-json-pretty/master/static/logo.svg"
          />
          <br>
          <strong>Vue Json Pretty</strong>
        </a>
      </td>
    </tr>
  </tbody>
</table>

## 兼容性

要求：

- **Babel 8+**
- **Vue 3+**
