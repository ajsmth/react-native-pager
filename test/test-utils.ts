import { render, prettyPrint } from '@testing-library/react-native';
import format from 'pretty-format';

const { ReactElement, ReactTestComponent } = format.plugins;

function createFormatter(propsToRemove) {
  const plugin = {
    test(val: any) {
      return val.props !== undefined;
    },
    serialize(
      element: any,
      config: any,
      indentation: any,
      depth: any,
      refs: any,
      printer: any
    ) {
      Object.keys(element.props).map(prop => {
        if (propsToRemove.includes(prop)) {
          delete element.props[prop];
        }
      });

      if (ReactTestComponent.test(element)) {
        return ReactTestComponent.serialize(
          element,
          config,
          indentation,
          depth,
          refs,
          printer
        );
      }

      return ReactElement.serialize(
        element,
        config,
        indentation,
        depth,
        refs,
        printer
      );
    },
  };

  return plugin;
}

const removeStyleProp = createFormatter([
  'style',
  'pointerEvents',
  'collapsable',
]);

const defaultPlugins = [removeStyleProp, ReactTestComponent, ReactElement];

const customRender = (ui: any, options?: any) => {
  const utils = render(ui, { ...options });

  function removeStylesFromDebug() {
    return console.log(
      // @ts-ignore
      prettyPrint(utils.baseElement, undefined, { plugins: defaultPlugins })
    );
  }

  return {
    ...utils,
    debug: removeStylesFromDebug,
  };
};

// re-export everything
export * from '@testing-library/react-native';

// override render method
export { customRender as render };
