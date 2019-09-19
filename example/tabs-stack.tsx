import React, {useState} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ViewStyle,
} from 'react-native';
import {
  Pager,
  Pagination,
  Slider,
  Progress,
} from '@crowdlinker/react-native-pager';
import Animated from 'react-native-reanimated';

const {Value, multiply} = Animated;

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

const stackInterpolation = {
  zIndex: offset => offset,

  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.95, 1, 0.95],
      },
    },
  ],
};

function Stack({children}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{flex: 1, borderWidth: StyleSheet.hairlineWidth}}>
      <Pager
        pageInterpolation={stackInterpolation}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        clamp={{prev: 0.3}}
        clampDrag={{next: 0}}
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

const circleInterpolation = {
  transform: [
    {
      scale: {
        inputRange: [-2, -1, 0, 1, 2],
        outputRange: [0.5, 0.5, 0.8, 0.5, 0.5],
      },
    },
  ],
};

function Circles({children, onChange}) {
  return (
    <Pagination
      pageInterpolation={circleInterpolation}
      animatedIndex={animatedIndex}
      style={circlesContainer}>
      {React.Children.map(children, (_, i) => (
        <Circle i={i} onPress={onChange} />
      ))}
    </Pagination>
  );
}

const circlesContainer: ViewStyle = {
  height: 20,
  width: '70%',
  alignSelf: 'center',
  transform: [{translateY: -30}],
};

function Circle({i, onPress}) {
  return (
    <TouchableOpacity
      onPress={() => onPress(i)}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <View
        style={{
          backgroundColor: colors[i % colors.length],
          width: 20,
          height: 20,
          borderRadius: 10,
        }}
      />
    </TouchableOpacity>
  );
}

function Tabbar({children, onChange, activeIndex}) {
  return (
    <View style={{height: 40, flexDirection: 'row'}}>
      {React.Children.map(children, (c, i) => (
        <TouchableOpacity
          onPress={() => onChange(i)}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text style={{color: activeIndex === i ? colors[i] : 'black'}}>
            {i}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const animatedIndex = new Value(0);

function Tabs({children}) {
  const [activeIndex, onChange] = useState(0);
  const activeColor = colors[activeIndex % colors.length];

  return (
    <View style={{height: 400, width: 300, alignSelf: 'center'}}>
      <Pager
        style={{flex: 1, overflow: 'hidden'}}
        animatedIndex={animatedIndex}
        activeIndex={activeIndex}
        onChange={onChange}>
        {children}
      </Pager>

      <View style={{marginVertical: 30}} />

      <Circles onChange={onChange}>{children}</Circles>

      <View style={{marginVertical: 10}} />

      <Progress
        numberOfScreens={children.length}
        animatedIndex={animatedIndex}
        style={{
          backgroundColor: activeColor,
        }}
      />

      <Tabbar activeIndex={activeIndex} onChange={onChange}>
        {children}
      </Tabbar>

      <Slider
        numberOfScreens={children.length}
        animatedIndex={animatedIndex}
        style={{
          backgroundColor: activeColor,
        }}
      />
    </View>
  );
}

export {Stack, Tabs};
