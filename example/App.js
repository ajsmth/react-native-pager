/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Button,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';

import Animated from 'react-native-reanimated';

console.disableYellowBox = true;

import {Pager, PagerProvider, usePager} from '@crowdlinker/react-native-pager';
import {ReText} from 'react-native-redash';

const colors = [
  'coral',
  'aquamarine',
  'gold',
  'cadetblue',
  'crimson',
  'darkorange',
  'darkmagenta',
  'salmon',
];

const {multiply, abs, interpolate, Extrapolate, floor} = Animated;

// clamp -> next: 0
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

      translateX: {
        inputRange: [-1, 0, 1],
        outputRange: [-150, 0, 0],
      },

      translateY: {
        inputRange: [-1, 0, 1],
        outputRange: [0, 0, 10],
        clamp: Extrapolate.EXTEND,
      },

      rotate: {
        unit: 'deg',
        inputRange: [-1, 0, 1],
        outputRange: [-20, 0, 0],
        clamp: Extrapolate.EXTEND,
      },
    },
  ],
};

const kilterCards = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
      },

      translateY: {
        inputRange: [-1, 0, 1, 2],
        outputRange: [0, 0, 10, -15],
      },

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

function Slide({active, offset, i}) {
  const [activeIndex] = usePager();
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

const children = Array.from({length: 1000}, (c, i) => <Slide i={i} key={i} />);

const App = () => {
  return (
    <SafeAreaView style={{flex: 1}}>
      <PagerProvider initialIndex={2}>
        {({activeIndex, onChange}) => (
          <>
            <View
              style={{
                width: 200,
                height: 200,
                top: 50,
                marginBottom: 150,
                alignSelf: 'center',
              }}>
              <Pager
                pageInterpolation={kilterCards}
                clamp={{
                  next: 0,
                }}
                adjacentChildOffset={3}
                activeIndex={activeIndex}
                onChange={onChange}>
                {children}
              </Pager>
            </View>
            <Buttons activeIndex={activeIndex} setActiveIndex={onChange} />
          </>
        )}
      </PagerProvider>
    </SafeAreaView>
  );
};

function Buttons({activeIndex, setActiveIndex}) {
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
          title="Dec"
          style={{
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            width: 150,
          }}
          onPress={() => setActiveIndex(activeIndex - 1)}>
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
          onPress={() => setActiveIndex(activeIndex + 1)}>
          <Text>{`>`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default App;
