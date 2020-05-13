import { defineComponent } from 'vue';
import { createMountedApp } from './util';
test('directive', () => {
  const calls = [];
  const customDirective = {
    mounted() {
      calls.push(1);
    },
  };
  const compoentA = defineComponent(
    {
      directives: { customDirective },
      render: () => (
        <div
          v-custom-directive={
            {
              value: 123,
              modifiers: { modifier: true },
              arg: 'arg',
            }
          } />
      ),
    },
  );
  const { node } = createMountedApp(compoentA);
  expect(calls).toEqual(expect.arrayContaining([1]));
  expect(node.dirs).toHaveLength(1);
  expect(node.dirs[0]).toMatchObject({
    modifiers: { modifier: true }, dir: customDirective, arg: 'arg', value: 123,
  });
});


test('directive in spread object property', () => {
  const calls = [];
  const customDirective = {
    mounted() {
      calls.push(1);
    },
  };
  const directives = [
    {
      name: 'custom-directive', value: 123, modifiers: { modifier: true }, arg: 'arg',
    },
  ];
  const compoentA = defineComponent(
    {
      directives: { customDirective },
      render: () => (<div {...{ directives }}>123</div>),
    },
  );
  const { node } = createMountedApp(compoentA);
  expect(calls).toEqual(expect.arrayContaining([1]));
  expect(node.dirs).toHaveLength(1);
  expect(node.dirs[0]).toMatchObject({
    modifiers: { abc: true }, dir: customDirective, arg: 'arg', value: 123,
  });
});
