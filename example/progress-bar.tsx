import React from 'react';
import Animated from 'react-native-reanimated';

const {divide} = Animated;

function ProgressBar({dx, numberOfScreens, style}) {
  const translateX = divide(dx, numberOfScreens, -1);

  return (
    <Animated.View
      style={[
        {
          width: `${100 / numberOfScreens}%`,
          transform: [{translateX}],
          height: 4,
          backgroundColor: 'black',
        },
        style,
      ]}
    />
  );
}

export {ProgressBar};
