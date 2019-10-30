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
import {PagerProvider} from '@crowdlinker/react-native-pager';
import {ContainerStyle} from './src/panhandler-width';
import {VerticalPager} from './src/vertical';

const App = () => {
  const [activeIndex, setActiveIndex] = useState(1);

  function onChange(nextIndex: number) {
    // console.log({nextIndex});
    setActiveIndex(nextIndex);
  }

  return (
    <SafeAreaView style={{flex: 1}}>
      <View
        style={{flex: 1, backgroundColor: 'white', justifyContent: 'center'}}>
        <PagerProvider activeIndex={activeIndex} onChange={onChange}>
          <KilterCards />
        </PagerProvider>
      </View>
    </SafeAreaView>
  );
};

export default App;
