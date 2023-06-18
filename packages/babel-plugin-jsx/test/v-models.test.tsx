import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

test('single value binding should work', async () => {
  const Child = defineComponent({
    props: {
      foo: Number,
    },
    emits: ['update:foo'],
    setup(props, { emit }) {
      const handleClick = () => {
        emit('update:foo', 3);
      };
      return () => <div onClick={handleClick}>{props.foo}</div>;
    },
  });

  const wrapper = mount({
    data() {
      return {
        foo: 1,
      };
    },
    render() {
      return <Child v-models={[[this.foo, 'foo']]} />;
    },
  });

  expect(wrapper.html()).toBe('<div>1</div>');
  wrapper.vm.$data.foo += 1;
  await wrapper.vm.$nextTick();
  expect(wrapper.html()).toBe('<div>2</div>');
  await wrapper.trigger('click');
  expect(wrapper.html()).toBe('<div>3</div>');
});

test('multiple values binding should work', async () => {
  const Child = defineComponent({
    props: {
      foo: Number,
      bar: Number,
    },
    emits: ['update:foo', 'update:bar'],
    setup(props, { emit }) {
      const handleClick = () => {
        emit('update:foo', 3);
        emit('update:bar', 2);
      };
      return () => (
        <div onClick={handleClick}>
          {props.foo},{props.bar}
        </div>
      );
    },
  });

  const wrapper = mount({
    data() {
      return {
        foo: 1,
        bar: 0,
      };
    },
    render() {
      return (
        <Child
          v-models={[
            [this.foo, 'foo'],
            [this.bar, 'bar'],
          ]}
        />
      );
    },
  });

  expect(wrapper.html()).toBe('<div>1,0</div>');
  wrapper.vm.$data.foo += 1;
  wrapper.vm.$data.bar += 1;
  await wrapper.vm.$nextTick();
  expect(wrapper.html()).toBe('<div>2,1</div>');
  await wrapper.trigger('click');
  expect(wrapper.html()).toBe('<div>3,2</div>');
});

test('modifier should work', async () => {
  const Child = defineComponent({
    props: {
      foo: {
        type: Number,
        default: 0,
      },
      fooModifiers: {
        default: () => ({ double: false }),
      },
    },
    emits: ['update:foo'],
    setup(props, { emit }) {
      const handleClick = () => {
        emit('update:foo', 3);
      };
      return () => (
        <div onClick={handleClick}>
          {props.fooModifiers.double ? props.foo * 2 : props.foo}
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
      return <Child v-models={[[this.foo, 'foo', ['double']]]} />;
    },
  });

  expect(wrapper.html()).toBe('<div>2</div>');
  wrapper.vm.$data.foo += 1;
  await wrapper.vm.$nextTick();
  expect(wrapper.html()).toBe('<div>4</div>');
  await wrapper.trigger('click');
  expect(wrapper.html()).toBe('<div>6</div>');
});
