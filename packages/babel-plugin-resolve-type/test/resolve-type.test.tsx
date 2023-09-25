import { transformAsync } from '@babel/core';
import ResolveType from '../src';

async function transform(code: string): Promise<string> {
  const result = await transformAsync(code, {
    plugins: [[ResolveType, { isTSX: true }]],
  });
  return result!.code!;
}

describe('resolve type', () => {
  describe('runtime props', () => {
    test('basic', async () => {
      const result = await transform(
        `
        import { defineComponent, h } from 'vue';
        interface Props {
          msg: string;
          optional?: boolean;
        }
        interface Props2 {
          set: Set<string>;
        }
        defineComponent((props: Props & Props2) => {
          return () => h('div', props.msg);
        })
        `
      );
      expect(result).toMatchSnapshot();
    });

    test('with static default value', async () => {
      const result = await transform(
        `
        import { defineComponent, h } from 'vue';
        defineComponent((props: { msg?: string } = { msg: 'hello' }) => {
          return () => h('div', props.msg);
        })
        `
      );
      expect(result).toMatchSnapshot();
    });

    test('with dynamic default value', async () => {
      const result = await transform(
        `
        import { defineComponent, h } from 'vue';
        const defaults = {}
        defineComponent((props: { msg?: string } = defaults) => {
          return () => h('div', props.msg);
        })
        `
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('runtime emits', () => {
    test('basic', async () => {
      const result = await transform(
        `
        import { type SetupContext, defineComponent } from 'vue';
        defineComponent(
          (
            props,
            { emit }: SetupContext<{ change(val: string): void; click(): void }>
          ) => {
            emit('change');
            return () => {};
          }
        );
        `
      );
      expect(result).toMatchSnapshot();
    });
  });

  test('w/ tsx', async () => {
    const result = await transform(
      `
      import { type SetupContext, defineComponent } from 'vue';
      defineComponent(() => {
        return () => <div/ >;
      });
      `
    );
    expect(result).toMatchSnapshot();
  });

  describe('defineComponent scope', () => {
    test('fake', async () => {
      const result = await transform(
        `
        const defineComponent = () => {};
        defineComponent((props: { msg?: string }) => {
          return () => <div/ >;
        });
        `
      );
      expect(result).toMatchSnapshot();
    });

    test('w/o import', async () => {
      const result = await transform(
        `
        defineComponent((props: { msg?: string }) => {
          return () => <div/ >;
        });
        `
      );
      expect(result).toMatchSnapshot();
    });

    test('import sub-package', async () => {
      const result = await transform(
        `
        import { defineComponent } from 'vue/dist/vue.esm-bundler';
        defineComponent((props: { msg?: string }) => {
          return () => <div/ >;
        });
        `
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('infer component name', () => {
    test('no options', async () => {
      const result = await transform(
        `
        import { defineComponent } from 'vue';
        const Foo = defineComponent(() => {})
        `
      );
      expect(result).toMatchSnapshot();
    });

    test('object options', async () => {
      const result = await transform(
        `
        import { defineComponent } from 'vue';
        const Foo = defineComponent(() => {}, { foo: 'bar' })
        `
      );
      expect(result).toMatchSnapshot();
    });

    test('identifier options', async () => {
      const result = await transform(
        `
        import { defineComponent } from 'vue';
        const Foo = defineComponent(() => {}, opts)
        `
      );
      expect(result).toMatchSnapshot();
    });

    test('rest param', async () => {
      const result = await transform(
        `
        import { defineComponent } from 'vue';
        const Foo = defineComponent(() => {}, ...args)
        `
      );
      expect(result).toMatchSnapshot();
    });
  });
});
