import { createApp } from 'vue';

const render = (app) => {
  const root = document.createElement('div');
  document.body.append(root);
  createApp(app).mount(root);
  return root;
};

test('should render with setup', () => {
  const App = {
    setup() {
      return () => <div>123</div>;
    },
  };

  const wrapper = render(App);
  expect(wrapper.innerHTML).toBe('<div>123</div>');
});

test('should not fallthrough with inheritAttrs: false', () => {
  const Child = (props) => <div>{props.foo}</div>;

  Child.inheritAttrs = false;

  const Parent = () => (
    <Child class="parent" foo={1} />
  );

  const wrapper = render(Parent);
  expect(wrapper.innerHTML).toBe('<div>1</div>');
});


test('should render', () => {
  const App = {
    render() {
      return <div>1234</div>;
    },
  };
  const wrapper = render(App);
  expect(wrapper.innerHTML).toBe('<div>1234</div>');
});

test('xlink:href', () => {
  const wrapper = render(() => <use xlinkHref={'#name'}></use>);
  expect(wrapper.innerHTML).toBe('<use xlink:href="#name"></use>');
});

// test('Merge class', () => {
//   const wrapper = render(() => <div class="a" {...{ class: 'b' } } />);
//   expect(wrapper.innerHTML).toBe('<div class="a b"></div>');
// });

test('JSXSpreadChild', () => {
  const a = ['1', '2'];
  const wrapper = render(() => <div>{[...a]}</div>);
  expect(wrapper.innerHTML).toBe('<div>12</div>');
});

test('domProps input[value]', () => {
  const val = 'foo';
  const wrapper = render(() => <input type="text" value={val} />);
  expect(wrapper.innerHTML).toBe('<input type="text">');
});
