import { shallowMount } from '@vue/test-utils';
import { defineComponent } from 'vue';

test('directive', () => {
  const calls = [];
  const customDirective = {
    mounted() {
      calls.push(1);
    },
  };
  const compoentA = defineComponent({
    directives: { custom: customDirective },
    render: () => (
      <a
        v-custom={{
          value: 123,
          modifiers: { modifier: true },
          arg: 'arg',
        }}
      />
    ),
  });
  const wrapper = shallowMount(compoentA);
  const node = wrapper.vm.$.subTree;
  expect(calls).toEqual(expect.arrayContaining([1]));
  expect(node.dirs).toHaveLength(1);
  expect(node.dirs[0]).toMatchObject({
    modifiers: { modifier: true },
    dir: customDirective,
    arg: 'arg',
    value: 123,
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
      name: 'custom-directive',
      value: 123,
      modifiers: { modifier: true },
      arg: 'arg',
    },
  ];
  const compoentA = defineComponent({
    directives: { customDirective },
    render: () => <a {...{ directives }}>123</a>,
  });
  const wrapper = shallowMount(compoentA);
  const node = wrapper.vm.$.subTree;
  expect(calls).toEqual(expect.arrayContaining([1]));
  expect(node.dirs).toHaveLength(1);
  expect(node.dirs[0]).toMatchObject({
    modifiers: { modifier: true },
    dir: customDirective,
    arg: 'arg',
    value: 123,
  });
});
