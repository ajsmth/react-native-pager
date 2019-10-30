import React from 'react';
import { render, fireEvent } from './test-utils';
import { Pager, iPager, PagerProvider, usePager } from '../src';
import { Text, Button } from 'react-native';

function TestPager(props: iPager) {
  // style prop will render children without waiting for layout events
  return <Pager {...props} style={{ width: 100, height: 100 }} />;
}

test('render() works', () => {
  render(
    <TestPager>
      <Text>1</Text>
      <Text>2</Text>
    </TestPager>
  );
});

test('activeIndex and onChange props update pager', () => {
  function Container({ spy }) {
    const [activeIndex, onChange] = React.useState(0);

    function handleChange(nextIndex: number) {
      spy(nextIndex);
      onChange(nextIndex);
    }

    return (
      <TestPager activeIndex={activeIndex} onChange={onChange}>
        <Text>Active Index: {activeIndex}</Text>
        <Button
          title={'change'}
          onPress={() => handleChange(activeIndex + 1)}
        />
      </TestPager>
    );
  }

  const spy = jest.fn();
  const { getByText } = render(<Container spy={spy} />);

  fireEvent.press(getByText(/change/i));
  getByText('Active Index: 1');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(1);

  fireEvent.press(getByText(/change/i));
  getByText('Active Index: 2');
});

test('provider injects props into pager', () => {
  function Provider({ spy }) {
    const [activeIndex, onChange] = React.useState(0);

    function handleChange(nextIndex: number) {
      spy(nextIndex);
      onChange(nextIndex);
    }

    return (
      <PagerProvider activeIndex={activeIndex} onChange={handleChange}>
        {({ onChange }) => (
          <TestPager>
            <Text>Active Index: {activeIndex}</Text>
            <Button
              title={'change'}
              onPress={() => onChange(activeIndex + 1)}
            />
          </TestPager>
        )}
      </PagerProvider>
    );
  }

  const spy = jest.fn();
  const { getByText } = render(<Provider spy={spy} />);

  fireEvent.press(getByText(/change/i));
  getByText('Active Index: 1');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(1);

  fireEvent.press(getByText(/change/i));
  getByText('Active Index: 2');
});

test('consumers of provider are able to update pager', () => {
  function Consumer() {
    const [activeIndex, onChange] = usePager();
    return <Button title="change" onPress={() => onChange(activeIndex + 1)} />;
  }

  function Provider({ spy }) {
    const [activeIndex, onChange] = React.useState(0);

    function handleChange(nextIndex: number) {
      spy(nextIndex);
      onChange(nextIndex);
    }

    return (
      <PagerProvider activeIndex={activeIndex} onChange={handleChange}>
        <TestPager>
          <Text>Active Index: {activeIndex}</Text>
          <Consumer />
        </TestPager>
      </PagerProvider>
    );
  }

  const spy = jest.fn();
  const { getByText } = render(<Provider spy={spy} />);

  fireEvent.press(getByText(/change/i));
  getByText('Active Index: 1');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(1);

  fireEvent.press(getByText(/change/i));
  getByText('Active Index: 2');
});

test.todo('adjacentChildren removes children');

test.todo('useIndex()');
test.todo('useFocus()');
test.todo('usePager()');
test.todo('useOnFocus()');
test.todo('provider initialIndex prop works when uncontrolled');

test.todo('consumers are able to use animatedIndex');
