import {
  reactive, ref, defineComponent, CSSProperties, ComponentPublicInstance,
} from 'vue';
import { shallowMount, mount, VueWrapper } from '@vue/test-utils';

const patchFlagExpect = (
  wrapper: VueWrapper<ComponentPublicInstance>,
  flag: number,
  dynamic: string[] | null,
) => {
  const { patchFlag, dynamicProps } = wrapper.vm.$.subTree;

  expect(patchFlag).toBe(flag);
  expect(dynamicProps).toEqual(dynamic);
};

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
        return () => <div id="hi" />;
      },
    });
    expect(wrapper.element.id).toBe('hi');
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
    const Child = defineComponent({
      props: {
        foo: Number,
      },
      setup(props) {
        return () => <div>{props.foo}</div>;
      },
    });

    Child.inheritAttrs = false;

    const wrapper = mount({
      render() {
        return (
          <Child class="parent" foo={1} />
        );
      },
    });
    expect(wrapper.classes()).toStrictEqual([]);
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
    const A = {
      B: defineComponent({
        setup() {
          return () => <div>123</div>;
        },
      }),
    };

    A.B.inheritAttrs = false;

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
        // @ts-ignore
        return () => <div class="a" {...{ class: 'b' } } />;
      },
    });
    expect(wrapper.classes().sort()).toEqual(['a', 'b'].sort());
  });

  test('Merge style', () => {
    const propsA = {
      style: {
        color: 'red',
      } as CSSProperties,
    };
    const propsB = {
      style: {
        color: 'blue',
        width: '300px',
        height: '300px',
      } as CSSProperties,
    };
    const wrapper = shallowMount({
      setup() {
        // @ts-ignore
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
    const val = true;
    const wrapper = shallowMount({
      setup() {
        return () => <input checked={val} />;
      },
    });

    expect(wrapper.vm.$.subTree?.props?.checked).toBe(val);
  });

  test('domProps option[selected]', () => {
    const val = true;
    const wrapper = shallowMount({
      render() {
        return <option selected={val} />;
      },
    });
    expect(wrapper.vm.$.subTree?.props?.selected).toBe(val);
  });

  test('domProps video[muted]', () => {
    const val = true;
    const wrapper = shallowMount({
      render() {
        return <video muted={val} />;
      },
    });

    expect(wrapper.vm.$.subTree?.props?.muted).toBe(val);
  });

  test('Spread (single object expression)', () => {
    const props = {
      id: '1',
    };
    const wrapper = shallowMount({
      render() {
        return <div {...props}>123</div>;
      },
    });
    expect(wrapper.html()).toBe('<div id="1">123</div>');
  });

  test('Spread (mixed)', async () => {
    const calls: number[] = [];
    const data = {
      id: 'hehe',
      onClick() {
        calls.push(3);
      },
      innerHTML: '2',
      class: ['a', 'b'],
    };

    const wrapper = shallowMount({
      setup() {
        return () => (
          <a
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
});

describe('directive', () => {
  test('custom', () => {
    const calls: number[] = [];
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

  test('vHtml', () => {
    const wrapper = shallowMount(({
      setup() {
        return () => <h1 v-html="<div>foo</div>"></h1>;
      },
    }));
    expect(wrapper.html()).toBe('<h1><div>foo</div></h1>');
  });

  test('vText', () => {
    const text = 'foo';
    const wrapper = shallowMount(({
      setup() {
        return () => <div v-text={text}></div>;
      },
    }));
    expect(wrapper.html()).toBe('<div>foo</div>');
  });
});

describe('slots', () => {
  test('with default', () => {
    const A = defineComponent({
      setup(_, { slots }) {
        return () => (
          <div>
            {slots.default?.()}
            {slots.foo?.('val')}
          </div>
        );
      },
    });

    A.inheritAttrs = false;

    const wrapper = mount({
      setup() {
        return () => <A v-slots={{ foo: (val: string) => val }}><span>default</span></A>;
      },
    });

    expect(wrapper.html()).toBe('<div><span>default</span>val</div>');
  });

  test('without default', () => {
    const A = defineComponent({
      setup(_, { slots }) {
        return () => (
          <div>
            {slots.foo?.('foo')}
          </div>
        );
      },
    });

    A.inheritAttrs = false;

    const wrapper = mount({
      setup() {
        return () => <A v-slots={{ foo: (val: string) => val }} />;
      },
    });

    expect(wrapper.html()).toBe('<div>foo</div>');
  });
});

describe('PatchFlags', () => {
  test('static', () => {
    const wrapper = shallowMount({
      setup() {
        return () => <div class="static">static</div>;
      },
    });
    patchFlagExpect(wrapper, 0, null);
  });

  test('props', async () => {
    const wrapper = mount({
      setup() {
        const visible = ref(true);
        const onClick = () => {
          visible.value = false;
        };
        return () => <div v-show={visible.value} onClick={onClick}>NEED_PATCH</div>;
      },
    });

    patchFlagExpect(wrapper, 8, ['onClick']);
    await wrapper.trigger('click');
    expect(wrapper.html()).toBe('<div style="display: none;">NEED_PATCH</div>');
  });

  test('full props', async () => {
    const wrapper = mount({
      setup() {
        const bindProps = reactive({ class: 'a', style: { marginTop: 10 } });
        const onClick = () => {
          bindProps.class = 'b';
        };

        return () => (
          <div {...bindProps} class="static" onClick={onClick}>full props</div>
        );
      },
    });
    patchFlagExpect(wrapper, 16, ['onClick']);

    await wrapper.trigger('click');

    expect(wrapper.classes().sort()).toEqual(['b', 'static'].sort());
  });
});

describe('variables outside slots', () => {
  const A = defineComponent({
    props: {
      inc: Function,
    },
    render() {
      return this.$slots.default?.();
    },
  });

  A.inheritAttrs = false;

  // test('internal', async () => {
  //   const wrapper = mount(defineComponent({
  //     data() {
  //       return {
  //         val: 0,
  //       };
  //     },
  //     methods: {
  //       inc() {
  //         this.val += 1;
  //       },
  //     },
  //     render() {
  //       const attrs = {
  //         innerHTML: `${this.val}`,
  //       };
  //       return (
  //         <A inc={this.inc}>
  //           <div>
  //             <textarea id="textarea" {...attrs} />
  //           </div>
  //           <button id="button" onClick={this.inc}>+1</button>
  //         </A>
  //       );
  //     },
  //   }));

  //   expect(wrapper.get('#textarea').element.innerHTML).toBe('0');
  //   await wrapper.get('#button').trigger('click');
  //   expect(wrapper.get('#textarea').element.innerHTML).toBe('1');
  // });

  test('forwarded', async () => {
    const wrapper = mount({
      data() {
        return {
          val: 0,
        };
      },
      methods: {
        inc() {
          this.val += 1;
        },
      },
      render() {
        const attrs = {
          innerHTML: `${this.val}`,
        };
        const textarea = <textarea id="textarea" {...attrs} />;
        return (
          <A inc={this.inc}>
            <div>
              {textarea}
            </div>
            <button id="button" onClick={this.inc}>+1</button>
          </A>
        );
      },
    });

    expect(wrapper.get('#textarea').element.innerHTML).toBe('0');
    await wrapper.get('#button').trigger('click');
    expect(wrapper.get('#textarea').element.innerHTML).toBe('1');
  });
});

test('reassign variable as component should work', () => {
  let a: any = 1;

  const A = defineComponent({
    setup(_, { slots }) {
      return () => <span>{slots.default!()}</span>;
    },
  });

  /* eslint-disable */
  // @ts-ignore
  const _a2 = 2;
  a = _a2;
  /* eslint-enable */

  a = <A>{a}</A>;

  const wrapper = mount({
    render() {
      return a;
    },
  });

  expect(wrapper.html()).toBe('<span>2</span>');
});
