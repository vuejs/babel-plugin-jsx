import { createApp, ref, defineComponent } from 'vue';

const SuperButton = (props, context) => (
    <div class={props.class}>
      Super
      <button
        on={{
          click: () => {
            context.emit('click');
          },
        }}
      >
        { props.buttonText }
      </button>
    </div>
);

SuperButton.inheritAttrs = false;

const App = defineComponent(() => {
  const count = ref(0);
  const inc = () => {
    count.value++;
  };

  return () => (
    <div>
      Foo {count.value}
      <SuperButton
        buttonText="VueComponent"
        class="xxx"
        on={{
          click: inc,
        }}
      />
    </div>
  );
});

createApp(App).mount('#app');
