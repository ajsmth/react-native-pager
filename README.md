# react-native-pager

Fully controllable, high performance pager component w/ gesture support for React Native

<p align="center">
  <img src="docs/assets/inline-cards.gif" />
</p>

# Installation

`yarn add @crowdlinker/react-native-pager`

If you're using expo, all dependencies are already installed by default. If not, you'll need to install two dependencies along with this library:

```
yarn add react-native-gesture-handler
yarn add react-native-reanimated
```

There are additional steps to setting these up:

- [react-native-gesture-handler](https://kmagiera.github.io/react-native-gesture-handler/docs/getting-started.html)
- [react-native-reanimated](https://github.com/kmagiera/react-native-reanimated#installation)

# Examples

<p align="center">
  <img src="docs/assets/kilter-cards.gif" />
  <img src="docs/assets/swipe-cards.gif" />
</p>

<p align="center">
  <img src="docs/assets/stacked-cards.gif" />
  <img src="docs/assets/inline-cards.gif" />
</p>

_These examples were inspired by the docs of the awesome [react-native-snap-carousel library](https://github.com/archriss/react-native-snap-carousel)_

From App.js in /example directory

```
// App.js
import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Button,
  Alert,
  TouchableOpacity,
} from 'react-native';

console.disableYellowBox = true;

import {Pager} from '../src';

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

const App = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const children = Array.from({length: activeIndex + 2}, (c, i) => (
    <View
      key={i}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors[i % colors.length],
      }}>
      <Text>{`Screen: ${i}`}</Text>
      <Button title="Hello" onPress={() => Alert.alert('Joe')} />
    </View>
  ));

  return (
    <SafeAreaView style={{flex: 1}}>
      <Pager
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        adjacentChildOffset={2}>
        {children}
      </Pager>

      <Buttons activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
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

      <View style={{flex: 1, flexDirection: 'row'}}>
        <TouchableOpacity
          title="Dec"
          style={{
            flex: 1,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setActiveIndex(activeIndex - 1)}>
          <Text>{`<`}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setActiveIndex(activeIndex + 1)}>
          <Text>{`>`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

# API Reference

## Pager

```
import { Pager } from 'react-native-pager-component'

Props
--------
activeIndex?: number;
onChange?: (nextIndex: number) => void;
initialIndex?: number;
children: React.ReactNode[];
springConfig?: Partial<SpringConfig>;
pageInterpolation?: ViewStyle;
panProps?: Partial<GestureHandlerProperties>;
pageSize?: number;
threshold?: number;
minIndex?: number;
maxIndex?: number;
adjacentChildOffset?: number;
style?: ViewStyle;
animatedValue?: Animated.Value<number>;
type?: 'horizontal' | 'vertical';
clamp?: {
  prev?: number;
  next?: number;
};
clampDrag?: {
  prev?: number;
  next?: number;
};
```

## Customization

The default settings for the pager component will be a full screen page that handles horizontal swipes.

You can customize the behaviour of individual cards using the `pageInterpolation` prop. It accepts an object of interpolation configurations for the different properties you want to transform. The interpolation configs can be found in the `react-native-reanimated` docs.

There's some pretty neat stuff you can do with these -- here are some examples for the configs above:

<p align="center">
  <img src="docs/assets/kilter-cards.gif" />
</p>

```
// the numbers we are interpolating are relative to the active card
// e.g an inputRange value of -1 means it is 1 page to the left of whatever is active.

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

<Pager clamp={{ next: 0 }} pageInterpolation={kilterCards}>...</Pager>
```

<p align="center">
  <img src="docs/assets/swipe-cards.gif" />
</p>

```
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

<Pager clamp={{ next: 0 }} pageInterpolation={swipeCards}>...</Pager>
```
