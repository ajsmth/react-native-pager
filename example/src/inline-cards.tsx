import React from 'react';
import {Pager} from '@crowdlinker/react-native-pager';
import {Slide} from './shared-components';

const inlineCardsConfig = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.9, 1, 0.9],
      },
    },
  ],
};

function InlineCards() {
  return (
    <Pager
      initialIndex={2}
      style={{height: 200, width: 200, alignSelf: 'center'}}
      pageInterpolation={inlineCardsConfig}>
      <Slide i={0} />
      <Slide i={1} />
      <Slide i={2} />
      <Slide i={3} />
      <Slide i={4} />
      <Slide i={5} />
      <Slide i={6} />
      <Slide i={7} />
    </Pager>
  );
}

export {InlineCards};
