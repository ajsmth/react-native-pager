import React, { Children } from 'react';
import Animated from 'react-native-reanimated';
import { ViewStyle, LayoutChangeEvent } from 'react-native';
import { iPageInterpolation, useOffset, useAnimatedIndex } from './pager';
import { memoize, interpolateWithConfig } from './util';

const { Value, divide, multiply, add } = Animated;

interface iPagination {
  children: React.ReactNode;
  pageInterpolation: iPageInterpolation;
  style?: ViewStyle;
}

const DEFAULT_PAGINATION_STYLE: ViewStyle = {
  height: 50,
  width: '100%',
  flexDirection: 'row',
};

function Pagination({ children, pageInterpolation, style }: iPagination) {
  return (
    <Animated.View
      style={{
        ...DEFAULT_PAGINATION_STYLE,
        ...style,
      }}
    >
      {Children.map(children, (child: any, index) => (
        <PaginationItem
          index={index}
          pageInterpolation={pageInterpolation}
          style={child.props.style}
        >
          {child}
        </PaginationItem>
      ))}
    </Animated.View>
  );
}

interface iPaginationItem {
  children: React.ReactNode;
  pageInterpolation: iPageInterpolation;
  index: number;
  style?: ViewStyle;
}

function PaginationItem({
  children,
  pageInterpolation,
  index,
  style,
}: iPaginationItem) {
  const offset = useOffset(index);
  const configStyles = memoize(
    interpolateWithConfig(offset, pageInterpolation)
  );

  return (
    <Animated.View style={[style || { flex: 1 }, configStyles]}>
      {children}
    </Animated.View>
  );
}

interface iSlider {
  numberOfScreens: number;
  style: ViewStyle;
}

const DEFAULT_SLIDER_STYLE = {
  height: 2,
  backgroundColor: 'aquamarine',
};

function Slider({ numberOfScreens, style }: iSlider) {
  const animatedIndex = useAnimatedIndex();
  const width = memoize(new Value(0));

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    width.setValue(layout.width as any);
  }

  const sliderWidth = divide(width, numberOfScreens);
  const translation = memoize(multiply(animatedIndex, sliderWidth));

  return (
    <Animated.View onLayout={handleLayout}>
      <Animated.View
        style={{
          width: sliderWidth,
          transform: [{ translateX: translation }],
          ...DEFAULT_SLIDER_STYLE,
          ...style,
        }}
      />
    </Animated.View>
  );
}

function Progress({ numberOfScreens, style }: iSlider) {
  const animatedIndex = useAnimatedIndex();

  const width = memoize(new Value(0));

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    width.setValue(layout.width as any);
  }

  const sliderWidth = memoize(
    divide(width, numberOfScreens, divide(1, add(animatedIndex, 1)))
  );

  return (
    <Animated.View onLayout={handleLayout}>
      <Animated.View
        style={{
          width: sliderWidth,
          height: 2,
          backgroundColor: 'rebeccapurple',
          ...DEFAULT_SLIDER_STYLE,
          ...style,
        }}
      />
    </Animated.View>
  );
}

export { Pagination, Slider, Progress };
