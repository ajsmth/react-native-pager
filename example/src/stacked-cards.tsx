import React, {useState} from 'react';
import {Pager, iPageInterpolation} from '@crowdlinker/react-native-pager';
import {Slide, NavigationButtons} from './shared-components';
import {View} from 'react-native';
import Animated from 'react-native-reanimated';

const {multiply, floor} = Animated;

const stackedCardsConfig: iPageInterpolation = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.8, 1, 0.9],
      },
      translateX: {
        inputRange: [-1, 0, 1, 2],
        outputRange: [-100, 0, 50, 100],
      },
    },
  ],

  opacity: {
    inputRange: [-1, 0, 1, 2, 3],
    outputRange: [1, 1, 1, 1, 0],
  },

  zIndex: offset => multiply(floor(offset), -1),
};

function StackedCards() {
  const [activeIndex, onChange] = useState(2);

  return (
    <View>
      <Pager
        activeIndex={activeIndex}
        onChange={onChange}
        clamp={{next: 0}}
        threshold={0.3}
        adjacentChildOffset={5}
        style={{height: 200, width: 200, alignSelf: 'center', padding: 10}}
        pageInterpolation={stackedCardsConfig}>
        {Array.from({length: activeIndex + 3}, (_, i) => (
          <Slide key={i} />
        ))}
      </Pager>
      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
}

export {StackedCards};
