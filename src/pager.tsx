import React, {
  useState,
  Children,
  useMemo,
  createContext,
  useContext,
  memo,
  useRef,
  useEffect,
} from 'react';
import { StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  PanGestureHandler,
  State,
  GestureHandlerProperties,
} from 'react-native-gesture-handler';

type SpringConfig = {
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
  offset: Animated.Value<number>
) => Animated.Value<number>;

interface iInterpolationConfig extends InterpolationConfig {
  unit?: 'deg' | 'rad';
}

type iTransformProp = {
  [transformProp: string]: iInterpolationConfig | iInterpolationFn;
};

interface iPageInterpolation {
  [animatedProp: string]:
    | iTransformProp[]
    | iInterpolationConfig
    | iInterpolationFn;
}

const {
  event,
  block,
  Value,
  divide,
  cond,
  eq,
  add,
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
  interpolate,
  concat,
  // @ts-ignore
  debug,
} = Animated;

const DEFAULT_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

export interface PagerProps {
  activeIndex?: number;
  onChange?: (nextIndex: number) => void;
  initialIndex?: number;
  children: React.ReactNode[];
  springConfig?: Partial<SpringConfig>;
  pageInterpolation?: iPageInterpolation;
  panProps?: Partial<GestureHandlerProperties>;
  pageSize?: number;
  threshold?: number;
  minIndex?: number;
  maxIndex?: number;
  adjacentChildOffset?: number;
  style?: ViewStyle;
  animatedValue?: Animated.Value<number>;
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

function Pager({
  activeIndex: parentActiveIndex,
  onChange: parentOnChange,
  initialIndex = 0,
  children,
  springConfig = DEFAULT_SPRING_CONFIG,
  panProps = {},
  pageSize = 1,
  threshold = 0.1,
  minIndex = 0,
  maxIndex: parentMax,
  adjacentChildOffset = 5,
  style,
  animatedValue,
  type = 'horizontal',
  pageInterpolation,
  clamp = {
    prev: REALLY_BIG_NUMBER,
    next: REALLY_BIG_NUMBER,
  },
  clampDrag = {
    prev: REALLY_BIG_NUMBER,
    next: REALLY_BIG_NUMBER,
  },
}: PagerProps) {
  clamp = useMemo(() => {
    if (!clamp) {
      return {
        prev: REALLY_BIG_NUMBER,
        next: REALLY_BIG_NUMBER,
      };
    }

    return clamp;
  }, [clamp.prev, clamp.next]);

  clampDrag = useMemo(() => {
    if (!clampDrag) {
      return {
        prev: REALLY_BIG_NUMBER,
        next: REALLY_BIG_NUMBER,
      };
    }

    return clampDrag;
  }, [clampDrag.prev, clampDrag.next]);

  const dragX = memoize(new Value(0));
  const dragY = memoize(new Value(0));
  const gestureState = memoize(new Value(-1));

  const clock = memoize(new Clock());

  const swiping = memoize(new Value(0));
  const dragStart = memoize(new Value(0));

  const translationValue = memoize(animatedValue || new Value(0));

  const position = memoize(new Value(initialIndex));
  const nextPosition = memoize(new Value(0));

  const isControlled = parentActiveIndex !== undefined;

  const [_activeIndex, _onChange] = useState(initialIndex);

  const activeIndex = isControlled ? parentActiveIndex : (_activeIndex as any);
  const onChange = isControlled ? parentOnChange : (_onChange as any);

  const numberOfScreens = Children.count(children);

  const maxIndex =
    parentMax === undefined
      ? Math.ceil((numberOfScreens - 1) / pageSize)
      : parentMax;

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

  const width = memoize(new Value(0));
  const height = memoize(new Value(0));

  const targetDimension = type === 'vertical' ? 'height' : 'width';
  const dimension = type === 'vertical' ? height : width;
  const translateValue = type === 'vertical' ? 'translateY' : 'translateX';
  const dragValue = type === 'vertical' ? dragY : dragX;

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    width.setValue(layout.width as any);
    height.setValue(layout.height as any);

    translationValue.setValue((activeIndex *
      layout[targetDimension] *
      -1) as any);
  }

  useEffect(() => {
    nextPosition.setValue(activeIndex);
  }, [activeIndex]);

  const clampedDragPrev =
    clampDrag.prev !== undefined ? clampDrag.prev : REALLY_BIG_NUMBER;

  const clampedDragNext =
    clampDrag.next !== undefined ? clampDrag.next : REALLY_BIG_NUMBER;

  const clampedDragValue = memoize(
    max(min(clampedDragPrev, dragValue), multiply(clampedDragNext, -1))
  );

  const percentDragged = memoize(divide(clampedDragValue, dimension));

  const numberOfPagesDragged = memoize(
    ceil(divide(abs(percentDragged), pageSize))
  );

  const nextIndex = memoize(min(add(position, numberOfPagesDragged), maxIndex));
  const prevIndex = memoize(max(sub(position, numberOfPagesDragged), minIndex));
  const shouldTransition = memoize(greaterThan(abs(percentDragged), threshold));

  const page = useMemo(() => multiply(dimension, pageSize), [
    dimension,
    pageSize,
  ]);

  const runSpring = memoize((nextIndex: Animated.Node<number>) => {
    const state = {
      finished: new Value(0),
      velocity: new Value(0),
      position: new Value(0),
      time: new Value(0),
    };

    const config = {
      ...DEFAULT_SPRING_CONFIG,
      ...springConfig,
      toValue: new Value(0),
    };

    const nextPosition = multiply(nextIndex, page, -1);

    return block([
      cond(
        clockRunning(clock),
        [
          set(state.position, translationValue),
          set(state.finished, 0),
          cond(
            neq(config.toValue, nextPosition),
            set(config.toValue, nextPosition)
          ),
        ],
        [
          set(state.position, translationValue),
          set(state.finished, 0),
          set(state.time, 0),
          set(state.velocity, 0),
          set(config.toValue, nextPosition),
          startClock(clock),
        ]
      ),
      spring(clock, state, config),
      cond(state.finished, [stopClock(clock), set(state.time, 0)]),
      state.position,
    ]);
  });

  const translation = memoize(
    block([
      cond(
        eq(gestureState, State.ACTIVE),
        [
          cond(clockRunning(clock), stopClock(clock)),
          cond(swiping, 0, set(dragStart, translationValue)),
          set(swiping, 1),
          set(
            nextPosition,
            cond(
              shouldTransition,
              [cond(lessThan(percentDragged, 0), nextIndex, prevIndex)],
              position
            )
          ),
          set(translationValue, add(clampedDragValue, dragStart)),
        ],

        [
          cond(neq(position, nextPosition), [
            set(position, nextPosition),
            cond(
              swiping,
              call([position], ([nextIndex]) => onChange(nextIndex))
            ),
          ]),
          set(swiping, 0),
          set(translationValue, runSpring(position)),
        ]
      ),
    ])
  );

  const adjacentChildren =
    adjacentChildOffset !== undefined
      ? children.slice(
          Math.max(activeIndex - adjacentChildOffset, 0),
          Math.min(activeIndex + adjacentChildOffset + 1, numberOfScreens)
        )
      : children;

  const totalDimension = useMemo(() => {
    return multiply(dimension, numberOfScreens);
  }, [dimension, numberOfScreens]);

  const inverseTranslate = memoize(multiply(translation, -1));

  const minimumOffset = useMemo(
    () =>
      sub(
        inverseTranslate,
        multiply(
          dimension,
          clamp.prev !== undefined ? clamp.prev : REALLY_BIG_NUMBER
        )
      ),
    [dimension, clamp.prev]
  );

  const maximumOffset = useMemo(
    () =>
      add(
        inverseTranslate,
        multiply(
          dimension,
          clamp.next !== undefined ? clamp.next : REALLY_BIG_NUMBER
        )
      ),
    [dimension, clamp.next]
  );

  return (
    <Animated.View style={style || { flex: 1 }} onLayout={handleLayout}>
      <PanGestureHandler
        {...panProps}
        onGestureEvent={handleGesture}
        onHandlerStateChange={handleStateChange}
      >
        <Animated.View style={{ flex: 1 }}>
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              [targetDimension]: totalDimension,
              transform: [{ [translateValue]: translation }],
            }}
          >
            {Children.map(adjacentChildren, (child: any, i) => {
              let index = i;

              if (adjacentChildOffset !== undefined) {
                index =
                  activeIndex <= adjacentChildOffset
                    ? i
                    : activeIndex - adjacentChildOffset + i;
              }

              return (
                <Page
                  index={index}
                  dimension={dimension}
                  translation={translation}
                  targetDimension={targetDimension}
                  translateValue={translateValue}
                  clamp={clamp}
                  clampPrev={minimumOffset}
                  clampNext={maximumOffset}
                  pageInterpolation={pageInterpolation}
                >
                  {child}
                </Page>
              );
            })}
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

interface iPage {
  index: number;
  dimension: Animated.Value<number>;
  translation: Animated.Node<number>;
  targetDimension: 'width' | 'height';
  translateValue: 'translateX' | 'translateY';
  clamp: {
    prev?: number;
    next?: number;
  };
  pageInterpolation?: iPageInterpolation;
  children: React.ReactNode;
  clampPrev: Animated.Node<number>;
  clampNext: Animated.Node<number>;
}

function _Page({
  index,
  dimension,
  translation,
  targetDimension,
  translateValue,
  clampPrev,
  clampNext,
  pageInterpolation,
  children,
}: iPage) {
  const position = memoize(multiply(index, dimension));
  const offset = memoize(divide(add(translation, position), max(dimension, 1)));

  const defaultStyle = {
    [targetDimension]: dimension,
    transform: [{ [translateValue]: min(max(position, clampPrev), clampNext) }],
  };

  const innerStyle = memoize(mapConfigToStyle(offset, pageInterpolation));

  let { zIndex, ...otherStyles } = innerStyle;

  if (!zIndex) {
    zIndex = -index;
  }

  return (
    <Animated.View
      style={{
        ...StyleSheet.absoluteFillObject,
        ...defaultStyle,
        zIndex: zIndex,
      }}
    >
      <Animated.View style={[{ flex: 1 }, otherStyles]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const Page = memo(_Page);

function mapConfigToStyle(
  offset: Animated.Value<number>,
  pageInterpolation?: iPageInterpolation
): ViewStyle {
  if (!pageInterpolation) {
    return {};
  }

  return Object.keys(pageInterpolation).reduce((styles: any, key: any) => {
    const currentStyle = pageInterpolation[key];

    if (Array.isArray(currentStyle)) {
      const _style = currentStyle.map((interpolationConfig: any) =>
        mapConfigToStyle(offset, interpolationConfig)
      );

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'object') {
      let _style;
      const { unit, ...rest } = currentStyle;
      if (currentStyle.unit) {
        _style = concat(interpolate(offset, rest), currentStyle.unit);
      } else {
        _style = interpolate(offset, currentStyle);
      }

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'function') {
      const _style = currentStyle(offset);
      styles[key] = _style;
      return styles;
    }

    return styles;
  }, {});
}

function memoize(value: any): any {
  const ref = useRef(value);
  return ref.current;
}

type iPagerContext = [number, (nextIndex: number) => void];
const PagerContext = createContext<undefined | iPagerContext>(undefined);

interface iPagerProvider {
  children: React.ReactNode;
  initialIndex?: number;
}

function PagerProvider({ children, initialIndex = 0 }: iPagerProvider) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  function onChange(nextIndex: number) {
    setActiveIndex(nextIndex);
  }

  return (
    <PagerContext.Provider value={[activeIndex, onChange]}>
      {typeof children === 'function'
        ? children({ activeIndex, onChange })
        : children}
    </PagerContext.Provider>
  );
}

function usePager(): iPagerContext {
  const context = useContext(PagerContext);

  if (context === undefined) {
    throw new Error('usePager must be used within a <PagerProvider />');
  }

  return context;
}

export { Pager, PagerProvider, usePager };
