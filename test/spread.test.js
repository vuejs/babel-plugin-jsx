import { createMountedApp } from './util';

test('Spread (single object expression)', () => {
  const props = {
    innerHTML: 123,
    other: '1',
  };
  const { node, dom } = createMountedApp({ render: () => <div {...props}></div> });
  expect(dom.innerHTML).toBe('<div other="1">123</div>');
  expect(node.props.other).toBe('1');
});

test('Spread (mixed)', () => {
  const calls = [];
  const data = {
    id: 'hehe',
    onClick() {
      calls.push(3);
    },
    innerHTML: 2,
    class: ['a', 'b'],
  };

  const { node, dom } = createMountedApp({
    setup: () => () => (
      <div
        href="huhu"
        {...data}
        class={{ c: true }}
        on-click={() => calls.push(4)}
        hook-insert={() => calls.push(2)}
      />
    ),
  });
  expect(node.props.id).toBe('hehe');
  expect(node.props.href).toBe('huhu');
  expect(node.props.class).toBe(['a', 'b', { c: true }]);
  expect(node.props.innerHTML).toBe('2');
  expect(calls).toBe([1, 2]);
  dom.click();
  expect(calls).toBe([1, 2, 3, 4]);
});
