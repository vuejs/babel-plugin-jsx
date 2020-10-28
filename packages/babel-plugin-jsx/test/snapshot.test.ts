import { transform } from '@babel/core';
import JSX, { Opts } from '../src';

const transpile = (
  source: string, options: Opts = {},
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

const tests = [
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
    name: 'vModels',
    from: '<C v-models={[[foo, ["modifier"]], [bar, "bar", ["modifier1", "modifier2"]]]} />',
  },
  {
    name: 'use "model" as the prop name',
    from: '<C v-model={[foo, "model"]} />',
  },
];

tests.forEach((
  { name, from },
) => {
  test(
    name,
    async () => {
      expect(await transpile(from, { optimize: true })).toMatchSnapshot(name);
    },
  );
});

const overridePropsTests = [{
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
