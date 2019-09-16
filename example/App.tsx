/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {useState} from 'react';
import {SafeAreaView, StyleSheet, View, Text} from 'react-native';

import Animated from 'react-native-reanimated';
import {TouchableOpacity} from 'react-native-gesture-handler';

console.disableYellowBox = true;

import {Pager, PagerProvider, usePager} from '@crowdlinker/react-native-pager';
import {ReText} from 'react-native-redash';

const colors = [
  'aquamarine',
  'coral',
  'gold',
  'cadetblue',
  'crimson',
  'darkorange',
  'darkmagenta',
  'salmon',
];

const {Extrapolate, floor, divide} = Animated;

function Slide({i}) {
  return (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginHorizontal: 5,
        backgroundColor: colors[i % colors.length],
      }}>
      <Text>{`Screen: ${i}`}</Text>
    </Animated.View>
  );
}

import {Stack, Tabs} from './tabs-stack';

const children = Array.from({length: 3}, (c, i) => <Slide i={i} key={i} />);

const App = () => {
  const [activeIndex, setActiveIndex] = useState(2);

  function onChange(nextIndex: number) {
    setActiveIndex(nextIndex);
  }

  return (
    <SafeAreaView style={{flex: 1, justifyContent: 'center'}}>
      <Tabs>{children}</Tabs>
    </SafeAreaView>
  );
};

function Buttons({activeIndex, onChange}) {
  return (
    <View style={{height: 75, width: '100%'}}>
      <Text
        style={{
          fontSize: 16,
          height: 25,
          textAlign: 'center',
        }}>{`activeIndex: ${activeIndex}`}</Text>

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 10,
        }}>
        <TouchableOpacity
          style={{
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            width: 150,
          }}
          onPress={() => onChange(activeIndex - 1)}>
          <Text>{`<`}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            width: 150,
          }}
          onPress={() => onChange(activeIndex + 1)}>
          <Text>{`>`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default App;

const stackedCards = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.8, 1, 0.9],
        clamp: Extrapolate.EXTEND,
      },
      translateX: {
        inputRange: [-1, 0, 1, 2],
        outputRange: [-100, 0, 50, 100],
        clamp: Extrapolate.EXTEND,
      },
    },
  ],
  opacity: {
    inputRange: [-1, 0, 1, 2, 3],
    outputRange: [1, 1, 0.9, 0.9, 0],
    clamp: Extrapolate.CLAMP,
  },

  zIndex: (_, index) => -index,
};

const inlineCards = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
      },
    },
  ],
  opacity: {
    inputRange: [-1, 0, 1],
    outputRange: [1, 1, 0.9],
  },
};

const swipeCards = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
        clamp: Extrapolate.EXTEND,
      },
    },
    {
      translateX: {
        inputRange: [-1, 0, 1],
        outputRange: [-150, 0, 0],
      },
    },
    {
      translateY: (offset: Animated.Value<number>) =>
        Animated.multiply(offset, 10),
    },
    {
      rotate: {
        unit: 'deg',
        inputRange: [-1, 0, 1],
        outputRange: [-20, 0, 0],
        clamp: Extrapolate.EXTEND,
      },
    },
  ],

  zIndex: offset => floor(divide(offset, -1)),
};

const kilterCards = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
      },
    },

    {
      translateY: {
        inputRange: [-1, 0, 1, 2],
        outputRange: [0, 0, 10, -15],
      },
    },

    {
      rotate: {
        unit: 'deg',
        inputRange: [-1, 0, 1, 2],
        outputRange: [-20, 0, -7.5, 5],
      },
    },
  ],

  opacity: {
    inputRange: [-1, 0, 1, 2, 3],
    outputRange: [0, 1, 1, 1, 0],
  },
};
