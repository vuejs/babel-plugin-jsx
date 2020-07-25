import { shallowMount } from '@vue/test-utils';

const is = (a, b) => expect(a).toBe(b);

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

  expect(wrapper.element.checked).toBe(true);
  wrapper.vm.test = false;
  await wrapper.vm.$nextTick();
  expect(wrapper.element.checked).toBe(false);
  expect(wrapper.vm.test).toBe(false);
  await wrapper.trigger('click');
  expect(wrapper.element.checked).toBe(true);
  expect(wrapper.vm.test).toBe(true);
});

test('input[type="checkbox"] bind to Array value', async () => {
  const wrapper = shallowMount({
    data: () => ({
      test: ['1'],
    }),
    render() {
      return (
        <>
          <input type="checkbox" v-model={this.test} value="1" />
          <input type="checkbox" v-model={this.test} value="2" />
        </>
      );
    },
  });

  is(wrapper.element.children[0].checked, true);
  is(wrapper.element.children[1].checked, false);
  wrapper.element.children[0].click();
  is(wrapper.vm.test.length, 0);
  wrapper.element.children[1].click();
  wrapper.element.children[0].click();
  wrapper.vm.test = ['1'];
  await wrapper.vm.$nextTick();
  is(wrapper.element.children[0].checked, true);
  is(wrapper.element.children[1].checked, false);
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

  is(wrapper.element.children[0].checked, true);
  is(wrapper.element.children[1].checked, false);
  wrapper.vm.test = '2';
  await wrapper.vm.$nextTick();
  is(wrapper.element.children[0].checked, false);
  is(wrapper.element.children[1].checked, true);
  await wrapper.element.children[0].click();
  is(wrapper.element.children[0].checked, true);
  is(wrapper.element.children[1].checked, false);
  is(wrapper.vm.test, '1');
});
