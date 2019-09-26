import React, {useState} from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import {Pager} from '@crowdlinker/react-native-pager';
import {Slide, NavigationButtons} from './shared-components';

const children = Array.from({length: 1000}, (_, i) => <Slide key={i} i={i} />);

function MyPager() {
  const [activeIndex, onChange] = useState(400);

  return (
    <View>
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
