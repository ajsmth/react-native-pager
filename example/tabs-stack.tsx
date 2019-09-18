import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View, Text} from 'react-native';
import {Pager, Pagination, Slider} from '@crowdlinker/react-native-pager';
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

const animatedIndex = new Value(0);

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

function Tabs({
  children,
  activeIndex: parentActiveIndex,
  onChange: parentOnChange,
  ...rest
}) {
  const [_activeIndex, _onChange] = useState(0);

  const activeIndex =
    parentActiveIndex !== undefined ? parentActiveIndex : _activeIndex;
  const onChange = parentActiveIndex !== undefined ? parentOnChange : _onChange;

  return (
    <View style={{height: 400, width: '100%', alignSelf: 'center'}}>
      <Pager
        style={{flex: 1, paddingBottom: 50, overflow: 'hidden'}}
        animatedIndex={animatedIndex}
        activeIndex={activeIndex}
        onChange={onChange}
        {...rest}>
        {children}
      </Pager>

      <Pagination
        pageInterpolation={circleInterpolation}
        animatedIndex={animatedIndex}
        style={{
          height: 20,
          width: '50%',
          alignSelf: 'center',
          transform: [{translateY: -25}],
        }}>
        {React.Children.map(children, (c, i) => (
          <Circle i={i} onPress={onChange} />
        ))}
      </Pagination>

      <View style={{backgroundColor: 'white'}}>
        <View style={{height: 50, flexDirection: 'row'}}>
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

        <Slider
          numberOfScreens={children.length}
          animatedIndex={animatedIndex}
          style={{
            backgroundColor: colors[activeIndex % colors.length],
            height: 3,
          }}
        />
      </View>
    </View>
  );
}

export {Stack, Tabs};
