import React from 'react';
import {View} from 'react-native';
import {SingleStack, usePager} from '@crowdlinker/react-native-pager';
import {Slide, NavigationButtons} from './shared-components';

const rootConfig = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [1.1, 1, 1.1],
      },
    },
  ],
};

const pageConfig = {
  transform: [
    {
      scale: {
        inputRange: [-1, 0, 1],
        outputRange: [0.9, 1, 0.9],
      },
    },
  ],
};

function SingleStackExample() {
  const [activeIndex, onChange] = usePager();

  return (
    <View style={{flex: 1, justifyContent: 'center'}}>
      <SingleStack
        style={{
          width: 200,
          height: 200,
          alignSelf: 'center',
          padding: 5,
        }}
        rootIndex={2}
        rootInterpolation={rootConfig}
        pageInterpolation={pageConfig}
        activeIndex={activeIndex}
        onChange={onChange}>
        <Slide i={0} />
        <Slide i={1} />
        <Slide i={2} />
        <Slide i={3} />
        <Slide i={4} />
      </SingleStack>

      <NavigationButtons activeIndex={activeIndex} onChange={onChange} />
    </View>
  );
}

export {SingleStackExample};
