import React from 'react';
import {
  Pager,
  iPageInterpolation,
  usePager,
} from '@crowdlinker/react-native-pager';
import {Slide, colors} from './shared-components';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

const stackConfig: iPageInterpolation = {
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

function Stack() {
  const [activeIndex, onChange] = usePager();

  return (
    <View>
      <Pager
        activeIndex={activeIndex}
        panProps={{
          enabled: activeIndex !== 0,
        }}
        onChange={onChange}
        clamp={{prev: 0.3}}
        clampDrag={{next: 0}}
        adjacentChildOffset={4}
        style={{
          height: 200,
          width: 200,
          alignSelf: 'center',
        }}
        pageInterpolation={stackConfig}>
        {Array.from({length: activeIndex + 3}, (_, i) => (
          <Slide key={i} i={i} />
        ))}
      </Pager>

      <View style={{height: 50, margin: 20}}>
        <TouchableOpacity
          onPress={() => onChange(Math.min(activeIndex + 1))}
          style={{
            flex: 1,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text style={{color: colors[activeIndex % colors.length]}}>Push</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export {Stack};
