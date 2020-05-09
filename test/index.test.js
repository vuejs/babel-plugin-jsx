import { createApp, defineComponent } from 'vue';

test('render', () => {
  let dom = document.createElement('div');
  let ACC = defineComponent(() => () => <span>text1</span>);
  createApp({
    setup: () => () => <ACC></ACC>,
  }).mount(dom);
  expect(dom.innerHTML).toBe('<span>text1</span>');
});
test('render2', () => {
  let dom = document.createElement('div');
  var ACC = defineComponent({
    setup: () => () => <span>text1</span>,
  });
  createApp({
    setup: () => () => <ACC></ACC>,
  }).mount(dom);

  expect(dom.innerHTML).toBe('<span>text1</span>');
});
test('render3', () => {
  let dom = document.createElement('div');
  var ACC = defineComponent({
    render: () => <span>text1</span>,
  });
  createApp({
    setup: () => () => <ACC></ACC>,
  }).mount(dom);

  expect(dom.innerHTML).toBe('<span>text1</span>');
});
test('render4', () => {
  let dom = document.createElement('div');
  createApp({
    render: () => <span>text1</span>,
  }).mount(dom);

  expect(dom.innerHTML).toBe('<span>text1</span>');
});
