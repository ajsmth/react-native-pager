import React from 'react';
import {
  Pager,
  iPageInterpolation,
  Pagination,
  Slider,
  usePager,
  Progress,
} from '@crowdlinker/react-native-pager';
import {Slide, colors} from './shared-components';
import {View, Text, TouchableOpacity, ViewStyle} from 'react-native';

const tabsConfig: iPageInterpolation = {
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

const children = Array.from({length: 7}, (_, i) => <Slide key={i} i={i} />);

function Tabs() {
  const [activeIndex, onChange] = usePager();
  const activeColor = colors[activeIndex % children.length];

  return (
    <View>
      <Pager
        style={{
          height: 200,
          width: 200,
          overflow: 'hidden',
          alignSelf: 'center',
        }}
        pageInterpolation={tabsConfig}>
        {children}
      </Pager>

      <Circles onChange={onChange}>{children}</Circles>

      <View style={{paddingTop: 30}}>
        <Progress
          numberOfScreens={children.length}
          style={{height: 2, backgroundColor: activeColor}}
        />

        <Tabbar activeIndex={activeIndex} onChange={onChange}>
          {children}
        </Tabbar>

        <Slider
          numberOfScreens={children.length}
          style={{height: 2, backgroundColor: activeColor}}
        />
      </View>
    </View>
  );
}

const circleConfig = {
  transform: [
    {
      scale: {
        inputRange: [-2, -1, 0, 1, 2],
        outputRange: [0.5, 0.5, 0.8, 0.5, 0.5],
      },
    },
  ],
};

interface iTabbar {
  children: React.ReactNode;
  onChange: (nextIndex: number) => void;
  activeIndex: number;
}

function Tabbar({children, onChange, activeIndex}: iTabbar) {
  return (
    <View style={{height: 40, flexDirection: 'row'}}>
      {React.Children.map(children, (_, i) => (
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

interface iCircles {
  children: React.ReactNode;
  onChange: (nextIndex: number) => void;
}

function Circles({children, onChange}: iCircles) {
  return (
    <Pagination pageInterpolation={circleConfig} style={circlesContainer}>
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
  transform: [{translateY: 15}],
};

interface iCircle {
  i: number;
  onPress: (index: number) => void;
}

function Circle({i, onPress}: iCircle) {
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

export {Tabs};
