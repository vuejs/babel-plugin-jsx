import { ref } from 'vue';
import { shallowMount, mount } from '@vue/test-utils';

describe('Transform JSX', () => {
  test('should render with render function', () => {
    const wrapper = shallowMount({
      render() {
        return <div>123</div>;
      },
    });
    expect(wrapper.text()).toBe('123');
  });

  test('should render with setup', () => {
    const wrapper = shallowMount({
      setup() {
        return () => <div>123</div>;
      },
    });
    expect(wrapper.text()).toBe('123');
  });

  test('Extracts attrs', () => {
    const wrapper = shallowMount({
      setup() {
        return () => <div id="hi" dir="ltr" />;
      },
    });
    expect(wrapper.element.id).toBe('hi');
    expect(wrapper.element.dir).toBe('ltr');
  });

  test('Binds attrs', () => {
    const id = 'foo';
    const wrapper = shallowMount({
      setup() {
        return () => <div>{id}</div>;
      },
    });
    expect(wrapper.text()).toBe('foo');
  });

  test('should not fallthrough with inheritAttrs: false', () => {
    const Child = (props) => <div>{props.foo}</div>;

    Child.inheritAttrs = false;

    const wrapper = mount({
      setup() {
        return () => (
          <Child class="parent" foo={1} />
        );
      },
    });
    expect(wrapper.text()).toBe('1');
  });

  test('Fragment', () => {
    const Child = () => <div>123</div>;

    Child.inheritAttrs = false;

    const wrapper = mount({
      setup() {
        return () => (
          <>
            <Child />
            <div>456</div>
          </>
        );
      },
    });

    expect(wrapper.html()).toBe('<div>123</div><div>456</div>');
  });

  test('nested component', () => {
    const A = {};

    A.B = () => <div>123</div>;

    const wrapper = mount(() => <A.B />);

    expect(wrapper.html()).toBe('<div>123</div>');
  });

  test('xlink:href', () => {
    const wrapper = shallowMount({
      setup() {
        return () => <use xlinkHref={'#name'}></use>;
      },
    });
    expect(wrapper.attributes()['xlink:href']).toBe('#name');
  });

  test('Merge class', () => {
    const wrapper = shallowMount({
      setup() {
        return () => <div class="a" {...{ class: 'b' } } />;
      },
    });
    expect(wrapper.classes().sort()).toEqual(['a', 'b'].sort());
  });

  test('Merge style', () => {
    const propsA = {
      style: {
        color: 'red',
      },
    };
    const propsB = {
      style: [
        {
          color: 'blue',
          width: '200px',
        },
        {
          width: '300px',
          height: '300px',
        },
      ],
    };
    const wrapper = shallowMount({
      setup() {
        return () => <div { ...propsA } { ...propsB } />;
      },
    });
    expect(wrapper.html()).toBe('<div style="color: blue; width: 300px; height: 300px;"></div>');
  });

  test('JSXSpreadChild', () => {
    const a = ['1', '2'];
    const wrapper = shallowMount({
      setup() {
        return () => <div>{[...a]}</div>;
      },
    });
    expect(wrapper.text()).toBe('12');
  });

  test('domProps input[value]', () => {
    const val = 'foo';
    const wrapper = shallowMount({
      setup() {
        return () => <input type="text" value={val} />;
      },
    });
    expect(wrapper.html()).toBe('<input type="text">');
  });

  test('domProps input[checked]', () => {
    const val = 'foo';
    const wrapper = shallowMount({
      setup() {
        return () => <input checked={val} />;
      },
    });

    expect(wrapper.vm.$.subTree.props.checked).toBe(val);
  });

  test('domProps option[selected]', () => {
    const val = 'foo';
    const wrapper = shallowMount({
      render() {
        return <option selected={val} />;
      },
    });
    expect(wrapper.vm.$.subTree.props.selected).toBe(val);
  });

  test('domProps video[muted]', () => {
    const val = 'foo';
    const wrapper = shallowMount({
      render() {
        return <video muted={val} />;
      },
    });

    expect(wrapper.vm.$.subTree.props.muted).toBe(val);
  });

  test('Spread (single object expression)', () => {
    const props = {
      innerHTML: 123,
      other: '1',
    };
    const wrapper = shallowMount({
      render() {
        return <div {...props}></div>;
      },
    });
    expect(wrapper.html()).toBe('<div other="1">123</div>');
  });

  test('Spread (mixed)', async () => {
    const calls = [];
    const data = {
      id: 'hehe',
      onClick() {
        calls.push(3);
      },
      innerHTML: 2,
      class: ['a', 'b'],
    };

    const wrapper = shallowMount({
      setup() {
        return () => (
          <div
            href="huhu"
            {...data}
            class={{ c: true }}
            onClick={() => calls.push(4)}
            hook-insert={() => calls.push(2)}
          />
        );
      },
    });

    expect(wrapper.attributes('id')).toBe('hehe');
    expect(wrapper.attributes('href')).toBe('huhu');
    expect(wrapper.text()).toBe('2');
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['a', 'b', 'c']));

    await wrapper.trigger('click');

    expect(calls).toEqual(expect.arrayContaining([3, 4]));
  });

  test('directive', () => {
    const calls = [];
    const customDirective = {
      mounted() {
        calls.push(1);
      },
    };
    const wrapper = shallowMount(({
      directives: { custom: customDirective },
      setup() {
        return () => (
          <a
            v-custom={{
              value: 123,
              modifiers: { modifier: true },
              arg: 'arg',
            }}
          />
        );
      },
    }));
    const node = wrapper.vm.$.subTree;
    expect(calls).toEqual(expect.arrayContaining([1]));
    expect(node.dirs).toHaveLength(1);
  });
});

describe('Patch Flags', () => {
  let renders = 0;
  const Child = {
    props: ['text'],
    setup(props) {
      return () => {
        renders++;
        return <div>{props.text}</div>;
      };
    },
  };
  Child.inheritAttrs = false;

  it('should render when props change', async () => {
    const wrapper = mount({
      setup() {
        const count = ref(0);
        const inc = () => {
          count.value++;
        };
        return () => (
          <div onClick={inc}>
            <Child text={count.value} />
          </div>
        );
      },
    });

    expect(renders).toBe(1);
    await wrapper.trigger('click');
    expect(renders).toBe(2);
  });

  it('should not render with static props', async () => {
    renders = 0;
    const wrapper = mount({
      setup() {
        const count = ref(0);
        const inc = () => {
          count.value++;
        };
        return () => (
          <div onClick={inc}>
            <Child text={1} />
          </div>
        );
      },
    });

    expect(renders).toBe(1);
    await wrapper.trigger('click');
    expect(renders).toBe(1);
  });

  it('should not render when props does not change', async () => {
    renders = 0;
    const wrapper = mount({
      setup() {
        const count = ref(0);
        const s = ref('a');
        const inc = () => {
          count.value++;
        };
        return () => (
          <div onClick={inc}>
            <Child text={s.value} />
            {count.value}
          </div>
        );
      },
    });

    await wrapper.trigger('click');
    expect(renders).toBe(1);
  });
});
