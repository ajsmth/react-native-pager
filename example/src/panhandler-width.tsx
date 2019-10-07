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
    <View style={{flex: 1, justifyContent: 'center'}}>
      <View style={{height: 100, padding: 5}}>
        <Pager
          pageInterpolation={pagerConfig}
          style={{height: 80, width: 60, alignSelf: 'center', padding: 10}}>
          {[...Array(10).keys()].map(n => (
            <Square key={n}>{n}</Square>
          ))}
        </Pager>
      </View>

      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
};

export {ContainerStyle};
