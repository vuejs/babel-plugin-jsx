import { createApp, ref, defineComponent } from 'vue';

const SuperButton = (props, context) => {
  const obj = {
    mouseover: () => {
      context.emit('mouseover');
    },
    click: () => {
      context.emit('click');
    },
  };
  return (
    <div class={props.class}>
      Super
      <button
        on={obj}
      >
        { props.buttonText }
        {context.slots.default()}
      </button>
    </div>
  );
};

SuperButton.inheritAttrs = false;

const App = defineComponent(() => {
  const count = ref(0);
  const inc = () => {
    count.value++;
  };

  const obj = {
    click: inc,
    mouseover: inc,
  };

  return () => (
    <div>
      Foo {count.value}
      <SuperButton
        buttonText="VueComponent"
        class="xxx"
        vShow={true}
        on={obj}
      >
        <button>1234</button>
      </SuperButton>
    </div>
  );
});

createApp(App).mount('#app');
