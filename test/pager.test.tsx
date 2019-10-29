import React from 'react';
import { render } from './test-utils';
import { Pager } from '../src';
import { Text } from 'react-native';

test('render()', () => {
  const { debug } = render(
    <Pager style={{ width: 200, height: 200 }}>
      <Text>1</Text>
      <Text>2</Text>
    </Pager>
  );

  debug();
});
