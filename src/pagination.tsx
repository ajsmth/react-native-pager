import React, { Children } from 'react';
import Animated from 'react-native-reanimated';
import { ViewStyle, LayoutChangeEvent } from 'react-native';
import { iPageInterpolation } from './pager';
import { memoize, mapConfigToStyle } from './util';

const { sub, Value, divide, multiply } = Animated;

interface iPagination {
  children: React.ReactNode;
  animatedIndex: Animated.Node<number>;
  pageInterpolation: iPageInterpolation;
  style?: ViewStyle;
}

const DEFAULT_PAGINATION_STYLE: ViewStyle = {
  height: 50,
  width: '100%',
  flexDirection: 'row',
};

function Pagination({
  children,
  animatedIndex,
  pageInterpolation,
  style,
}: iPagination) {
  return (
    <Animated.View
      style={{
        ...DEFAULT_PAGINATION_STYLE,
        ...style,
      }}
    >
      {Children.map(children, (child: any, index) => (
        <PaginationItem
          animatedIndex={animatedIndex}
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
  animatedIndex: Animated.Node<number>;
  pageInterpolation: iPageInterpolation;
  index: number;
  style?: ViewStyle;
}

function PaginationItem({
  children,
  animatedIndex,
  pageInterpolation,
  index,
  style,
}: iPaginationItem) {
  const offset = memoize(sub(index, animatedIndex));
  const configStyles = memoize(mapConfigToStyle(offset, pageInterpolation));

  return (
    <Animated.View style={[style || { flex: 1 }, configStyles]}>
      {children}
    </Animated.View>
  );
}

interface iSlider {
  numberOfScreens: number;
  animatedIndex: Animated.Node<number>;
  style: ViewStyle;
}

function Slider({ numberOfScreens, animatedIndex, style }: iSlider) {
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
          ...style,
        }}
      />
    </Animated.View>
  );
}

export { Pagination, Slider };
