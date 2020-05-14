import { shallowMount } from '@vue/test-utils';

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

  const wrapper = shallowMount({
    setup() {
      return () => (
        <Child class="parent" foo={1} />
      );
    },
  });
  expect(wrapper.text()).toBe('1');
});


test('should render', () => {
  const App = {
    render() {
      return <div>1234</div>;
    },
  };
  const wrapper = shallowMount(App);
  expect(wrapper.html()).toBe('<div>1234</div>');
});

test('xlink:href', () => {
  const wrapper = shallowMount({
    setup() {
      return () => <use xlinkHref={'#name'}></use>;
    },
  });
  expect(wrapper.attributes()['xlink:href']).toBe('#name');
});

// // test('Merge class', () => {
// //   const wrapper = render(() => <div class="a" {...{ class: 'b' } } />);
// //   expect(wrapper.innerHTML).toBe('<div class="a b"></div>');
// // });

test('JSXSpreadChild', () => {
  const a = ['1', '2'];
  const wrapper = shallowMount({
    setup() {
      return () => <div>{[...a]}</div>;
    },
  });
  expect(wrapper.text).toBe('12');
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
