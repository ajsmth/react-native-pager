import React from 'react';
import {
  Pager,
  iPageInterpolation,
  usePager,
} from '@crowdlinker/react-native-pager';
import {Slide, NavigationButtons} from './shared-components';
import {View} from 'react-native';
import Animated from 'react-native-reanimated';
const {floor, divide, multiply} = Animated;

const swipeCardsConfig: iPageInterpolation = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
      },
    },
    {
      translateX: {
        inputRange: [-1, 0, 1],
        outputRange: [-150, 0, 0],
      },
    },
    {
      translateY: offset => multiply(offset, 10),
    },
    {
      rotate: {
        unit: 'deg',
        inputRange: [-1, 0, 1],
        outputRange: [-20, 0, 0],
      },
    },
  ],

  opacity: {
    inputRange: [-1, 0, 1, 2, 3],
    outputRange: [0, 1, 1, 1, 0],
  },

  zIndex: offset => floor(divide(offset, -1)),
};

function SwipeCards() {
  // using <PagerProvider /> parent which registers correct props to <Pager />
  const [activeIndex, onChange] = usePager();

  return (
    <View>
      <Pager
        clamp={{next: 0}}
        style={{height: 200, width: 200, alignSelf: 'center', padding: 10}}
        pageInterpolation={swipeCardsConfig}>
        {Array.from({length: 7}, (_, i) => (
          <Slide key={i} i={i} />
        ))}
      </Pager>
      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
}

export {SwipeCards};
