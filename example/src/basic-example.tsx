import React, {useState} from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import {Pager} from '@crowdlinker/react-native-pager';
import {Slide, NavigationButtons} from './shared-components';

const children = Array.from({length: 1000}, (_, i) => <Slide key={i} i={i} />);

function MyPager() {
  const [activeIndex, onChange] = useState(500);

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
        style={{height: 200, width: 200, alignSelf: 'center'}}
        activeIndex={activeIndex}
        onChange={onChange}>
        {children}
      </Pager>

      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
}

export {MyPager};
