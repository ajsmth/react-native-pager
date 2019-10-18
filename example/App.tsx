/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */
// annoying react-native-reanimated warning
console.disableYellowBox = true;

import React, {useState} from 'react';
import {SafeAreaView, View, Text} from 'react-native';

import {InlineCards} from './src/inline-cards';
import {KilterCards} from './src/kilter-cards';
import {StackedCards} from './src/stacked-cards';
import {SwipeCards} from './src/swipe-cards';
import {Stack} from './src/stack';
import {Tabs} from './src/tabs';
import {MyPager} from './src/basic-example';
import {Pager} from '@crowdlinker/react-native-pager';
import {ContainerStyle} from './src/panhandler-width';
import {Slide} from './src/shared-components';

const stackConfig: any = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
      },
    },
  ],

  zIndex: offset => offset,
};

const App = () => {
  const [activeIndex, setActiveIndex] = useState(1);

  function onChange(nextIndex: number) {
    console.log({nextIndex});
    setActiveIndex(nextIndex);
  }

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={{flex: 1, backgroundColor: 'white'}}>
        <Pager
          pageInterpolation={stackConfig}
          // clamp={{prev: 0.4, next: 1}}
          // clampDrag={{next: 0}}
          activeIndex={activeIndex}
          onChange={onChange}>
          <Slide index={0} />
          <Slide index={1} />
          <Slide index={2} />
          <Slide index={3} />
          <Slide index={4} />
          <Slide index={5} />
        </Pager>

        <Text>{`Active index: ${activeIndex}`}</Text>
      </View>
    </SafeAreaView>
  );
};

export default App;
