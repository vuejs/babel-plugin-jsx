import { createApp as createApp2, defineComponent } from "vue";

const App = defineComponent(() => {
  return () => (
    <div class="233">
      <span class="class">hello</span>
      <span>world</span>
    </div>
  );
});

createApp2(App).mount("#app");
