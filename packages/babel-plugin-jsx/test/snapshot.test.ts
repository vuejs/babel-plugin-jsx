import { transform } from '@babel/core';
import plugin from '../dist/index.js';

const transpile = (source: string) => new Promise((resolve, reject) => transform(source,

  {
    filename: '',
    plugins: [plugin],
  }, (error, result) => {
    if (error) {
      return reject(error);
    }
    resolve(result?.code);
  }));

const tests = [
  {
    name: 'Basic onClick',
    from: '<div onClick={foo}>test</div>',
  },
  {
    name: 'Fragment',
    from: '<><span>I\'m</span><span>Fragment</span></>',
  },
  {
    name: 'Attributes',
    from: '<input type="email" placeholder={placeholderText}/>',
  },
  {
    name: 'Dynamic binding',
    from: '<input type="email" placeholder={placeholderText}/>',
  },
  {
    name: 'Directives',
    from: '<input v-show={this.visible} />',
  },
  {
    name: 'Basic v-model',
    from: '<input v-model={val} />',
  },
  {
    name: 'v-model with modifiers',
    from: '<input v-model={[val, ["trim"]]} />',
  },
  {
    name: 'Aliased v-model with modifiers',
    from: '<A v-model={[val, "foo", ["bar"]]} />',
  },
  {
    name: 'Custom directive',
    from: '<a v-custom={[val, "arg", ["a", "b"]]}/>',
  },
  {
    name: 'slot',
    from: '<A v-slots={slots} />',
  },
];

tests.forEach(({ name, from }) => test(name,
  async () => expect(await transpile(from)).toMatchSnapshot(name)));
