import React, {useState} from 'react';
import {View, Text} from 'react-native';
import {Pager, usePager} from '@crowdlinker/react-native-pager';
import {Slide, NavigationButtons} from './shared-components';

const children = Array.from({length: 1000}, (_, i) => <Slide key={i} />);

function MyPager() {
  const [activeIndex, onChange] = usePager();

  return (
    <View style={{flex: 1}}>
      <Text
        style={{
          textAlign: 'center',
          marginBottom: 20,
        }}>
        {`Number of screens: ${children.length}`}
      </Text>

      <Pager>{children}</Pager>

      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
}

export {MyPager};
