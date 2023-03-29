import { transform } from '@babel/core';
import JSX, { VueJSXPluginOptions } from '../src';

interface Test {
  name: string;
  from: string;
}

const transpile = (
  source: string, options: VueJSXPluginOptions = {},
) => new Promise((resolve, reject) => transform(
  source,
  {
    filename: '',
    presets: null,
    plugins: [[JSX, options]],
    configFile: false,
  }, (error, result) => {
    if (error) {
      return reject(error);
    }
    resolve(result?.code);
  },
));

[
  {
    name: 'input[type="checkbox"]',
    from: '<input type="checkbox" v-model={test} />',
  },
  {
    name: 'input[type="radio"]',
    from: `
      <>
        <input type="radio" value="1" v-model={test} name="test" />
        <input type="radio" value="2" v-model={test} name="test" />
      </>
    `,
  },
  {
    name: 'select',
    from: `
      <select v-model={test}>
        <option value="1">a</option>
        <option value={2}>b</option>
        <option value={3}>c</option>
      </select>
    `,
  },
  {
    name: 'textarea',
    from: '<textarea v-model={test} />',
  },
  {
    name: 'input[type="text"]',
    from: '<input v-model={test} />',
  },
  {
    name: 'dynamic type in input',
    from: '<input type={type} v-model={test} />',
  },
  {
    name: 'v-show',
    from: '<div v-show={x}>vShow</div>',
  },
  {
    name: 'input[type="text"] .lazy modifier',
    from: `
      <input v-model={[test, ['lazy']]} />
    `,
  },
  {
    name: 'custom directive',
    from: '<A vCus={x} />',
  },
  {
    name: 'vHtml',
    from: '<h1 v-html="<div>foo</div>"></h1>',
  },
  {
    name: 'vText',
    from: '<div v-text={text}></div>',
  },
  {
    name: 'Without props',
    from: '<a>a</a>',
  },
  {
    name: 'MereProps Order',
    from: '<button loading {...x} type="submit">btn</button>',
  },
  {
    name: 'Merge class/ style attributes into array',
    from: '<div class="a" class={b} style="color: red" style={s}></div>',
  },
  {
    name: 'single no need for a mergeProps call',
    from: '<div {...x}>single</div>',
  },
  {
    name: 'should keep `import * as Vue from "vue"`',
    from: `
      import * as Vue from 'vue';

      <div>Vue</div>
    `,
  },
  {
    name: 'specifiers should be merged into a single importDeclaration',
    from: `
      import { createVNode, Fragment as _Fragment } from 'vue';
      import { vShow } from 'vue'

      <_Fragment />
    `,
  },
  {
    name: 'Without JSX should work',
    from: `
      import { createVNode } from 'vue';
      createVNode('div', null, ['Without JSX should work']);
    `,
  },
  {
    name: 'reassign variable as component',
    from: `
      import { defineComponent } from 'vue';
      let a = 1;
      const A = defineComponent({
        setup(_, { slots }) {
          return () => <span>{slots.default()}</span>;
        },
      });

      const _a2 = 2;

      a = _a2;

      a = <A>{a}</A>;
    `,
  },
  {
    name: 'custom directive',
    from: `
      <>
        <A v-xxx={x} />
        <A v-xxx={[x]} />
        <A v-xxx={[x, 'y']} />
        <A v-xxx={[x, 'y', ['a', 'b']]} />
        <A v-xxx={[x, ['a', 'b']]} />
        <A v-xxx={[x, y, ['a', 'b']]} />
        <A v-xxx={[x, y, ['a', 'b']]} />
      </>
    `,
  },
  {
    name: 'directive in slot',
    from: `
      <>
        <A>
          <B><div /></B>
        </A>
        <A><div v-xxx /></A>
        <A>
          <B><div v-xxx /></B>
        </A>
      </>
    `,
  },
  {
    name: 'vModels',
    from: '<C v-models={[[foo, ["modifier"]], [bar, "bar", ["modifier1", "modifier2"]]]} />',
  },
  {
    name: 'use "model" as the prop name',
    from: '<C v-model={[foo, "model"]} />',
  },
  {
    name: 'named import specifier `Keep Alive`',
    from: `
      import { KeepAlive } from 'vue';

      <KeepAlive>123</KeepAlive>
    `,
  },
  {
    name: 'namespace specifier `Keep Alive`',
    from: `
      import * as Vue from 'vue';

      <Vue.KeepAlive>123</Vue.KeepAlive>
    `,
  },
  {
    name: 'use "@jsx" comment specify pragma',
    from: `
      /* @jsx custom */
      <div id="custom">Hello</div>
    `,
  },
  {
    name: 'v-model target value support variable',
    from: `
      const foo = 'foo';

      const a = () => 'a';

      const b = { c: 'c' };
      <>
        <A v-model={[xx, foo]} />
        <B v-model={[xx, ['a']]} />
        <C v-model={[xx, foo, ['a']]} />
        <D v-model={[xx, foo === 'foo' ? 'a' : 'b', ['a']]} />
        <E v-model={[xx, a(), ['a']]} />
        <F v-model={[xx, b.c, ['a']]} />
      </>
    `,
  },
  {
    name: 'using v-slots without children should not be spread',
    from: '<A v-slots={slots} />',
  },
].forEach((
  { name, from },
) => {
  test(
    name,
    async () => {
      expect(await transpile(from, { optimize: true, enableObjectSlots: true })).toMatchSnapshot(name);
    },
  );
});

const overridePropsTests: Test[] = [{
  name: 'single',
  from: '<div {...a} />',
}, {
  name: 'multiple',
  from: '<A loading {...a} {...{ b: 1, c: { d: 2 } }} class="x" style={x} />',
}];

overridePropsTests.forEach((
  { name, from },
) => {
  test(
    `override props ${name}`,
    async () => {
      expect(await transpile(from, { mergeProps: false })).toMatchSnapshot(name);
    },
  );
});

const slotsTests: Test[] = [
  {
    name: 'multiple expressions',
    from: '<A>{foo}{bar}</A>',
  },
  {
    name: 'single expression, function expression',
    from: `
      <A>{() => "foo"}</A>
    `,
  },
  {
    name: 'single expression, non-literal value: runtime check',
    from: `
      const foo = () => 1;
      <A>{foo()}</A>;
    `,
  },
];

slotsTests.forEach(({
  name, from,
}) => {
  test(
    `passing object slots via JSX children ${name}`,
    async () => {
      expect(await transpile(from, { optimize: true, enableObjectSlots: true })).toMatchSnapshot(name);
    },
  );
});

const objectSlotsTests = [
  {
    name: 'defaultSlot',
    from: '<Badge>{slots.default()}</Badge>',
  },
];

objectSlotsTests.forEach(({
  name, from,
}) => {
  test(
    `disable object slot syntax with ${name}`,
    async () => {
      expect(await transpile(from, { optimize: true, enableObjectSlots: false }))
        .toMatchSnapshot(name);
    },
  );
});

const pragmaTests = [
  {
    name: 'custom',
    from: '<div>pragma</div>',
  },
];

pragmaTests.forEach(({
  name, from,
}) => {
  test(
    `set pragma to ${name}`,
    async () => {
      expect(await transpile(from, { pragma: 'custom' }))
        .toMatchSnapshot(name);
    },
  );
});

const isCustomElementTests = [{
  name: 'isCustomElement',
  from: '<foo><span>foo</span></foo>',
}];

isCustomElementTests.forEach(({ name, from }) => {
  test(
    name,
    async () => {
      expect(await transpile(from, { isCustomElement: (tag) => tag === 'foo' })).toMatchSnapshot(name);
    },
  );
});

const fragmentTests = [{
  name: '_Fragment already imported',
  from: `
      import { Fragment as _Fragment } from 'vue'
      const Root1 = () => <>root1</>
      const Root2 = () => <_Fragment>root2</_Fragment>
      `,
}];

fragmentTests.forEach(({ name, from }) => {
  test(
    name,
    async () => {
      expect(await transpile(from)).toMatchSnapshot(name);
    },
  );
});
