import { shallowMount, mount } from '@vue/test-utils';
import { defineComponent, VNode } from '@vue/runtime-dom';

test('input[type="checkbox"] should work', async () => {
  const wrapper = shallowMount({
    data() {
      return {
        test: true,
      };
    },
    render() {
      return <input type="checkbox" v-model={this.test} />;
    },
  });

  expect(wrapper.vm.$el.checked).toBe(true);
  wrapper.vm.test = false;
  await wrapper.vm.$nextTick();
  expect(wrapper.vm.$el.checked).toBe(false);
  expect(wrapper.vm.test).toBe(false);
  await wrapper.trigger('click');
  expect(wrapper.vm.$el.checked).toBe(true);
  expect(wrapper.vm.test).toBe(true);
});

test('input[type="radio"] should work', async () => {
  const wrapper = shallowMount({
    data: () => ({
      test: '1',
    }),
    render() {
      return (
        <>
          <input type="radio" value="1" v-model={this.test} name="test" />
          <input type="radio" value="2" v-model={this.test} name="test" />
        </>
      );
    },
  });

  const [a, b] = wrapper.vm.$.subTree.children as VNode[];

  expect(a.el!.checked).toBe(true);
  wrapper.vm.test = '2';
  await wrapper.vm.$nextTick();
  expect(a.el!.checked).toBe(false);
  expect(b.el!.checked).toBe(true);
  await a.el!.click();
  expect(a.el!.checked).toBe(true);
  expect(b.el!.checked).toBe(false);
  expect(wrapper.vm.test).toBe('1');
});

test('select should work with value bindings', async () => {
  const wrapper = shallowMount({
    data: () => ({
      test: 2,
    }),
    render() {
      return (
        <select v-model={this.test}>
          <option value="1">a</option>
          <option value={2}>b</option>
          <option value={3}>c</option>
        </select>
      );
    },
  });

  const el = wrapper.vm.$el;

  expect(el.value).toBe('2');
  expect(el.children[1].selected).toBe(true);
  wrapper.vm.test = 3;
  await wrapper.vm.$nextTick();
  expect(el.value).toBe('3');
  expect(el.children[2].selected).toBe(true);

  el.value = '1';
  await wrapper.trigger('change');
  expect(wrapper.vm.test).toBe('1');

  el.value = '2';
  await wrapper.trigger('change');
  expect(wrapper.vm.test).toBe(2);
});

test('textarea should update value both ways', async () => {
  const wrapper = shallowMount({
    data: () => ({
      test: 'b',
    }),
    render() {
      return <textarea v-model={this.test} />;
    },
  });
  const el = wrapper.vm.$el;

  expect(el.value).toBe('b');
  wrapper.vm.test = 'a';
  await wrapper.vm.$nextTick();
  expect(el.value).toBe('a');
  el.value = 'c';
  await wrapper.trigger('input');
  expect(wrapper.vm.test).toBe('c');
});

test('input[type="text"] should update value both ways', async () => {
  const wrapper = shallowMount({
    data: () => ({
      test: 'b',
    }),
    render() {
      return <input v-model={this.test} />;
    },
  });
  const el = wrapper.vm.$el;

  expect(el.value).toBe('b');
  wrapper.vm.test = 'a';
  await wrapper.vm.$nextTick();
  expect(el.value).toBe('a');
  el.value = 'c';
  await wrapper.trigger('input');
  expect(wrapper.vm.test).toBe('c');
});

test('input[type="text"] .lazy modifier', async () => {
  const wrapper = shallowMount({
    data: () => ({
      test: 'b',
    }),
    render() {
      return <input v-model={[this.test, ['lazy']]} />;
    },
  });
  const el = wrapper.vm.$el;

  expect(el.value).toBe('b');
  expect(wrapper.vm.test).toBe('b');
  el.value = 'c';
  await wrapper.trigger('input');
  expect(wrapper.vm.test).toBe('b');
  el.value = 'c';
  await wrapper.trigger('change');
  expect(wrapper.vm.test).toBe('c');
});

test('dynamic type should work', async () => {
  const wrapper = shallowMount({
    data() {
      return {
        test: true,
        type: 'checkbox',
      };
    },
    render() {
      return <input type={this.type} v-model={this.test} />;
    },
  });

  expect(wrapper.vm.$el.checked).toBe(true);
  wrapper.vm.test = false;
  await wrapper.vm.$nextTick();
  expect(wrapper.vm.$el.checked).toBe(false);
});

test('underscore modifier should work', async () => {
  const wrapper = shallowMount({
    data: () => ({
      test: 'b',
    }),
    render() {
      return <input v-model_lazy={this.test} />;
    },
  });
  const el = wrapper.vm.$el;

  expect(el.value).toBe('b');
  expect(wrapper.vm.test).toBe('b');
  el.value = 'c';
  await wrapper.trigger('input');
  expect(wrapper.vm.test).toBe('b');
  el.value = 'c';
  await wrapper.trigger('change');
  expect(wrapper.vm.test).toBe('c');
});

test('underscore modifier should work in custom component', async () => {
  const Child = defineComponent({
    emits: ['update:modelValue'],
    props: {
      modelValue: {
        type: Number,
        default: 0,
      },
      modelModifiers: {
        default: () => ({ double: false }),
      },
    },
    setup(props, { emit }) {
      const handleClick = () => {
        emit('update:modelValue', 3);
      };
      return () => (
        <div onClick={handleClick}>
          {props.modelModifiers.double
            ? props.modelValue * 2
            : props.modelValue}
        </div>
      );
    },
  });

  const wrapper = mount({
    data() {
      return {
        foo: 1,
      };
    },
    render() {
      return <Child v-model_double={this.foo} />;
    },
  });

  expect(wrapper.html()).toBe('<div>2</div>');
  wrapper.vm.$data.foo += 1;
  await wrapper.vm.$nextTick();
  expect(wrapper.html()).toBe('<div>4</div>');
  await wrapper.trigger('click');
  expect(wrapper.html()).toBe('<div>6</div>');
});
