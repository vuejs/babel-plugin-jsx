import { createApp, defineComponent } from 'vue';

const Child = defineComponent({
  props: ['foo'],
  setup(props) {
    return () => <div>{props.foo}</div>;
  },
});

Child.inheritAttrs = false;

const App = defineComponent({
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

const app = createApp(App);

app.mount('#app');

console.log(app);
