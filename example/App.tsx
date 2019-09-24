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
import {SafeAreaView, View} from 'react-native';

import {InlineCards} from './src/inline-cards';
import {KilterCards} from './src/kilter-cards';
import {StackedCards} from './src/stacked-cards';
import {SwipeCards} from './src/swipe-cards';
import {Stack} from './src/stack';
import {Tabs} from './src/tabs';
import {MyPager} from './src/basic-example';
import {SingleStackExample} from './src/single-stack-example';
import {PagerProvider} from '@crowdlinker/react-native-pager';

const App = () => {
  const [activeIndex, setActiveIndex] = useState(1);

  function onChange(nextIndex: number) {
    // console.log({nextIndex});
    setActiveIndex(nextIndex);
  }

  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      <SafeAreaView style={{flex: 1, justifyContent: 'center'}}>
        <PagerProvider activeIndex={activeIndex} onChange={onChange}>
          <SingleStackExample />
        </PagerProvider>
      </SafeAreaView>
    </View>
  );
};

export default App;
