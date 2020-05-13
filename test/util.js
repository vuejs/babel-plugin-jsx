import { createApp } from 'vue';

export const createMountedApp = function (compoent) {
  const dom = document.createElement('div');
  const App = createApp(compoent).mount(dom);
  return { App, dom, node: App.$.subTree };
};
