import React, {
  useState,
  Children,
  createContext,
  useContext,
  useEffect,
  memo,
  cloneElement,
  useMemo,
} from 'react';
import { StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerProperties,
} from 'react-native-gesture-handler';
import { memoize, interpolateWithConfig, runSpring } from './util';

export type SpringConfig = {
  damping: Animated.Adaptable<number>;
  mass: Animated.Adaptable<number>;
  stiffness: Animated.Adaptable<number>;
  overshootClamping: Animated.Adaptable<number> | boolean;
  restSpeedThreshold: Animated.Adaptable<number>;
  restDisplacementThreshold: Animated.Adaptable<number>;
  toValue: Animated.Adaptable<number>;
};

// copied from react-native-reanimated for now, can't get the export
export enum Extrapolate {
  EXTEND = 'extend',
  CLAMP = 'clamp',
  IDENTITY = 'identity',
}

interface InterpolationConfig {
  inputRange: ReadonlyArray<Animated.Adaptable<number>>;
  outputRange: ReadonlyArray<Animated.Adaptable<number>>;
  extrapolate?: Extrapolate;
  extrapolateLeft?: Extrapolate;
  extrapolateRight?: Extrapolate;
}

type iInterpolationFn = (
  offset: Animated.Node<number>
) => Animated.Node<number>;

interface iInterpolationConfig extends InterpolationConfig {
  unit?: string;
}

type iTransformProp = {
  [transformProp: string]: iInterpolationConfig | iInterpolationFn;
};

export interface iPageInterpolation {
  [animatedProp: string]:
    | iTransformProp[]
    | iInterpolationConfig
    | iInterpolationFn;
}

const VERTICAL = 1;
const HORIZONTAL = 2;

const {
  event,
  block,
  Value,
  divide,
  cond,
  eq,
  add,
  or,
  stopClock,
  Clock,
  set,
  clockRunning,
  spring,
  startClock,
  multiply,
  neq,
  sub,
  call,
  max,
  min,
  greaterThan,
  abs,
  lessThan,
  ceil,
  proc,
  // @ts-ignore
  debug,
} = Animated;

export interface iPager {
  activeIndex?: number;
  onChange?: (nextIndex: number) => void;
  initialIndex?: number;
  children: React.ReactNode[];
  springConfig?: Partial<SpringConfig>;
  pageInterpolation?: iPageInterpolation;
  panProps?: Partial<PanGestureHandlerProperties>;
  pageSize?: number;
  threshold?: number;
  minIndex?: number;
  maxIndex?: number;
  adjacentChildOffset?: number;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  animatedValue?: Animated.Value<number>;
  animatedIndex?: Animated.Value<number>;
  type?: 'horizontal' | 'vertical';
  clamp?: {
    prev?: number;
    next?: number;
  };
  clampDrag?: {
    prev?: number;
    next?: number;
  };
}
const REALLY_BIG_NUMBER = 1000000000;

const minMax = proc((value, minimum, maximum) =>
  min(max(value, minimum), maximum)
);

function Pager({
  children,
  panProps,
  style,
  type = 'horizontal',
  containerStyle,
  adjacentChildOffset,
  activeIndex: parentActiveIndex,
  onChange: parentOnChange,
  initialIndex,
  threshold = 0.1,
  springConfig,
  clampDrag = {
    next: REALLY_BIG_NUMBER,
    prev: REALLY_BIG_NUMBER,
  },
  clamp = {
    next: REALLY_BIG_NUMBER,
    prev: REALLY_BIG_NUMBER,
  },

  pageInterpolation,
}: iPager) {
  const isControlled = parentActiveIndex !== undefined;

  const [_activeIndex, _onChange] = useState(initialIndex);

  const activeIndex = isControlled
    ? (parentActiveIndex as number)
    : (_activeIndex as number);

  const onChange = isControlled ? (parentOnChange as any) : (_onChange as any);

  const dragX = memoize(new Value(0));
  const dragY = memoize(new Value(0));
  const gestureState = memoize(new Value(0));

  const handleGesture = memoize(
    event(
      [
        {
          nativeEvent: {
            translationX: dragX,
            translationY: dragY,
          },
        },
      ],
      { useNativeDriver: true }
    )
  );

  const handleStateChange = memoize(
    event(
      [
        {
          nativeEvent: {
            state: gestureState,
          },
        },
      ],
      {
        useNativeDriver: true,
      }
    )
  );

  const numberOfScreens = Children.count(children);
  const [width, setWidth] = useState(-1);
  const [height, setHeight] = useState(-1);

  const dimension = memoize(new Value(0));
  const targetDimension = type === 'vertical' ? 'height' : 'width';
  const targetTransform = type === 'vertical' ? 'translateY' : 'translateX';
  const delta = type === 'vertical' ? dragY : dragX;
  const totalDimension = multiply(dimension, numberOfScreens);

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    layout.width !== width && setWidth(layout.width);
    layout.height !== height && setHeight(layout.height);
  }

  const TYPE = type === 'vertical' ? VERTICAL : HORIZONTAL;

  Animated.useCode(
    cond(
      // dimension already set to last layout
      or(eq(dimension, width), eq(dimension, height)),
      [],
      [cond(eq(TYPE, VERTICAL), set(dimension, height), set(dimension, width))]
    ),
    [width, height]
  );

  const dragStart = memoize(new Value(0));
  const swiping = memoize(new Value(0));
  const position = memoize(new Value(activeIndex));
  const nextIndex = memoize(new Value(activeIndex));
  const change = memoize(new Value(0));
  const absChange = memoize(new Value(0));
  const indexChange = memoize(new Value(0));
  const clamped = memoize(new Value(0));
  const clock = memoize(new Clock());
  const shouldTransition = memoize(new Value(0));

  // props that might change over time should be reactive:
  const animatedThreshold = useAnimatedValue(threshold);
  const animatedActiveIndex = useAnimatedValue(activeIndex);
  const clampDragPrev = useAnimatedValue(clampDrag.prev, REALLY_BIG_NUMBER);
  const clampDragNext = useAnimatedValue(clampDrag.next, REALLY_BIG_NUMBER);

  useEffect(() => {
    nextIndex.setValue(activeIndex);
  }, [activeIndex]);

  const animatedIndex = memoize(
    block([
      cond(
        eq(gestureState, State.ACTIVE),
        [
          cond(clockRunning(clock), stopClock(clock)),
          cond(swiping, 0, [set(dragStart, position), set(swiping, 1)]),

          set(change, sub(animatedActiveIndex, position)),
          set(absChange, abs(change)),
          set(shouldTransition, greaterThan(absChange, animatedThreshold)),

          set(
            clamped,
            minMax(
              divide(delta, dimension),
              multiply(clampDragNext, -1),
              clampDragPrev
            )
          ),

          debug('clamped', clamped),
          debug('clampDragNext', clampDragNext),
          debug('clampDragPrev', clampDragPrev),
          debug('change', divide(delta, dimension)),

          set(position, sub(dragStart, clamped)),
        ],
        [
          cond(swiping, [
            set(swiping, 0),
            set(nextIndex, animatedActiveIndex),
            cond(shouldTransition, [
              set(indexChange, ceil(absChange)),
              set(
                nextIndex,
                cond(
                  greaterThan(change, 0),
                  sub(animatedActiveIndex, indexChange),
                  add(animatedActiveIndex, indexChange)
                )
              ),
              call([nextIndex], ([nextIndex]) => onChange(nextIndex)),
            ]),
          ]),

          set(position, runSpring(clock, position, nextIndex, springConfig)),
        ]
      ),
      position,
    ])
  );

  const clampPrevValue = useAnimatedValue(clamp.prev, numberOfScreens);
  const clampNextValue = useAnimatedValue(clamp.next, numberOfScreens);

  const minimum = memoize(
    multiply(sub(animatedIndex, clampPrevValue), dimension)
  );

  const maximum = memoize(
    multiply(add(animatedIndex, clampNextValue), dimension)
  );

  const containerTranslation = memoize(multiply(animatedIndex, dimension, -1));

  const adjacentChildren =
    adjacentChildOffset !== undefined
      ? children.slice(
          Math.max(activeIndex - adjacentChildOffset, 0),
          Math.min(activeIndex + adjacentChildOffset + 1, numberOfScreens)
        )
      : children;

  const defaultContainerStyle =
    style && style.height ? { height: style.height } : undefined;

  return (
    <Animated.View
      style={containerStyle || defaultContainerStyle || { flex: 1 }}
    >
      <PanGestureHandler
        {...panProps}
        onGestureEvent={handleGesture}
        onHandlerStateChange={handleStateChange}
      >
        <Animated.View style={{ flex: 1 }}>
          <Animated.View style={style || { flex: 1 }}>
            <Animated.View style={{ flex: 1 }} onLayout={handleLayout}>
              <Animated.View
                style={{
                  flex: 1,
                  [targetDimension]: totalDimension,
                  transform: [{ [targetTransform]: containerTranslation }],
                }}
              >
                {width === -1
                  ? null
                  : adjacentChildren.map((child: any, i) => {
                      // use map instead of React.Children because we want to track
                      // the keys of these children by there index
                      // React.Children shifts these key values intelligently, but it
                      // causes issues with the memoized values in <Page /> components
                      let index = i;

                      if (adjacentChildOffset !== undefined) {
                        index =
                          activeIndex <= adjacentChildOffset
                            ? i
                            : activeIndex - adjacentChildOffset + i;
                      }

                      return (
                        <Page
                          key={index}
                          index={index}
                          animatedIndex={animatedIndex}
                          minimum={minimum}
                          maximum={maximum}
                          dimension={dimension}
                          targetTransform={targetTransform}
                          targetDimension={targetDimension}
                          pageInterpolation={pageInterpolation}
                        >
                          {child}
                        </Page>
                      );
                    })}
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

function Page({
  children,
  index,
  minimum,
  maximum,
  dimension,
  targetTransform,
  targetDimension,
  pageInterpolation,
  animatedIndex,
}: any) {
  const position = memoize(multiply(index, dimension));
  const translation = memoize(minMax(position, minimum, maximum));

  const defaultStyle = memoize({
    // map to height / width value depending on vertical / horizontal configuration
    [targetDimension]: dimension,
    // min-max the position based on clamp values
    // this means the <Page /> will have a container that is always positioned
    // in the same place, but the inner view can be translated within these bounds
    transform: [
      {
        [targetTransform]: translation,
      },
    ],
  });

  const offset = memoize(sub(index, animatedIndex));

  // apply interpolation configs to <Page />
  const interpolatedStyles = memoize(
    interpolateWithConfig(offset, pageInterpolation)
  );

  // take out zIndex here as it needs to be applied to siblings, which inner containers
  // are not, however the outer container requires the absolute translateX/Y to properly
  // position itself
  let { zIndex, ...otherStyles } = interpolatedStyles;

  // zIndex is not a requirement of interpolation
  // it will be clear when someone needs it as views will overlap with some configurations
  if (!zIndex) {
    zIndex = 0;
  }

  return (
    <Animated.View
      style={{
        ...StyleSheet.absoluteFillObject,
        ...defaultStyle,
        zIndex,
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, otherStyles]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

function useAnimatedValue(
  value?: number,
  defaultValue?: number
): Animated.Value<number> {
  const initialValue = value || defaultValue || 0;
  const animatedValue = memoize(new Value(initialValue));

  useEffect(() => {
    if (value !== undefined) {
      animatedValue.setValue(value);
    }
  }, [value]);

  return animatedValue;
}

export { Pager };
