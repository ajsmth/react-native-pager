import React, {useState} from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import {Pager} from '@crowdlinker/react-native-pager';
import {Slide, NavigationButtons} from './shared-components';

const children = Array.from({length: 10000}, (_, i) => <Slide key={i} i={i} />);

function MyPager() {
  const [activeIndex, onChange] = useState(5000);

  return (
    <View>
      <Text
        style={{
          textAlign: 'center',
          marginBottom: 20,
        }}>
        {`Number of screens: ${children.length}`}
      </Text>

      <Pager
        activeIndex={activeIndex}
        onChange={onChange}
        style={{
          height: 200,
          width: 200,
          alignSelf: 'center',
        }}>
        {children}
      </Pager>

      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
}

export {MyPager};
