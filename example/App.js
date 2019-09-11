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
  ScrollView,
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

function Screen({index}) {
  return (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors[index % colors.length],
        marginHorizontal: 5,
      }}>
      <Text>{`Screen: ${index}`}</Text>
    </Animated.View>
  );
}

function Tabs({children}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{flex: 1, borderWidth: StyleSheet.hairlineWidth}}>
      <Pager
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        style={{flex: 1, overflow: 'hidden', paddingVertical: 5}}>
        {children}
      </Pager>

      <View style={{height: 50, flexDirection: 'row'}}>
        {React.Children.map(children, (c, i) => (
          <TouchableOpacity
            onPress={() => setActiveIndex(i)}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: activeIndex === i ? colors[i] : 'black',
            }}>
            <Text style={{color: activeIndex === i ? colors[i] : 'black'}}>
              {i + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Stack({children}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{flex: 1, borderWidth: StyleSheet.hairlineWidth}}>
      <Pager
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        clamp={{prev: 0.3}}
        clampDrag={{prev: 0}}
        style={{flex: 1, overflow: 'hidden', paddingVertical: 5}}>
        {children}
      </Pager>

      <View style={{height: 50, flexDirection: 'row'}}>
        <TouchableOpacity
          onPress={() =>
            setActiveIndex(Math.min(activeIndex + 1, children.length - 1))
          }
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors[activeIndex],
          }}>
          <Text style={{color: colors[activeIndex]}}>Push</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const children = Array.from({length: 1000}, (c, i) => <Slide i={i} key={i} />);

const App = () => {
  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
          }}>
          <View style={{overflow: 'hidden'}}>
            <Heading>Featured</Heading>
            <HR />
            <Pager style={{flex: 1, height: 200, paddingVertical: 20}}>
              <Thumbnail color={colors[3]} />
              <Thumbnail color={colors[2]} />
              <Thumbnail color={colors[0]} />
              <Thumbnail color={colors[1]} />
              <Thumbnail color={colors[5]} />
            </Pager>

            <Heading>Browse</Heading>
            <HR />
            <Pager
              pageSize={0.5}
              style={{height: 300, width: '100%', paddingVertical: 20}}>
              <ThumbnailGridScreen index={0} />
              <ThumbnailGridScreen index={4} />
              <ThumbnailGridScreen index={8} />
            </Pager>

            <Heading>News & Noteworthy</Heading>

            <Pager style={{width: '75%', height: 150, paddingVertical: 20}}>
              <Thumbnail color={colors[0]} />
              <Thumbnail color={colors[1]} />
              <Thumbnail color={colors[2]} />
              <Thumbnail color={colors[3]} />
              <Thumbnail color={colors[4]} />
            </Pager>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function HR() {
  return <View style={{height: 1, borderWidth: 1}} />;
}

function Heading({children, size}) {
  return (
    <Text style={{fontWeight: 'bold', fontSize: size || 18, marginBottom: 10}}>
      {children}
    </Text>
  );
}

function ThumbnailGridScreen({index}) {
  return (
    <View style={{flex: 1, flexDirection: 'row'}}>
      <View style={{flex: 1}}>
        <Thumbnail color={colors[index % colors.length]} />
        <Thumbnail color={colors[(index + 1) % colors.length]} />
      </View>

      <View style={{flex: 1}}>
        <Thumbnail color={colors[(index + 2) % colors.length]} />
        <Thumbnail color={colors[(index + 3) % colors.length]} />
      </View>
    </View>
  );
}

function Thumbnail({color}) {
  return (
    <View
      style={{
        flex: 1,
        marginHorizontal: 10,
      }}>
      <View
        style={{
          flex: 1,
          backgroundColor: color,
          backgroundColor: color,
          borderRadius: 4,
        }}
      />

      <View
        style={{
          paddingVertical: '10%',
          height: '30%',
        }}>
        <View
          style={{
            width: '80%',
            height: 1,
            backgroundColor: 'lightgrey',
            marginBottom: '5%',
            borderRadius: 4,
          }}
        />
        <View
          style={{
            width: '40%',
            height: 1,
            backgroundColor: 'lightgrey',
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

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
