import * as React from 'react';
import {Text, View, StyleSheet} from 'react-native';

import {
  Pager,
  usePager,
  iPageInterpolation,
  Extrapolate,
} from '@crowdlinker/react-native-pager';
import {NavigationButtons} from './shared-components';

const Square = ({children}) => (
  <View
    style={{
      flex: 1,
      marginHorizontal: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'grey',
    }}>
    <Text style={{textAlign: 'center'}}>{children}</Text>
  </View>
);

const pagerConfig: iPageInterpolation = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.9, 1, 0.9],
        extrapolate: Extrapolate.CLAMP,
      },
    },
  ],
};

const ContainerStyle = () => {
  const [activeIndex, onChange] = usePager();
  return (
    <View>
      <Pager
        pageInterpolation={pagerConfig}
        containerStyle={{height: 100, borderWidth: 1, paddingVertical: 10}}
        style={{
          height: 80,
          width: 60,
          alignSelf: 'center',
          paddingVertical: 5,
          borderWidth: 1,
        }}>
        {[...Array(10).keys()].map(n => (
          <Square key={n}>{n}</Square>
        ))}
      </Pager>

      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
};

export {ContainerStyle};
