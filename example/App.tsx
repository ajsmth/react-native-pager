/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */
// annoying react-native-reanimated warning
console.disableYellowBox = true;

import React from 'react';
import {SafeAreaView, View} from 'react-native';

import {InlineCards} from './src/inline-cards';
import {KilterCards} from './src/kilter-cards';
import {StackedCards} from './src/stacked-cards';
import {SwipeCards} from './src/swipe-cards';
import {Stack} from './src/stack';
import {Tabs} from './src/tabs';

const App = () => {
  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      <SafeAreaView style={{flex: 1, justifyContent: 'center'}}>
        <SwipeCards />
      </SafeAreaView>
    </View>
  );
};

export default App;
