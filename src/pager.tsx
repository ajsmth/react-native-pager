import React, {
  useState,
  Children,
  useMemo,
  createContext,
  useContext,
  memo,
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
  onChange: didChange,
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
  pageInterpolation?: ViewStyle;
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
  threshold = 0.2,
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
    prev: -REALLY_BIG_NUMBER,
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
        prev: -REALLY_BIG_NUMBER,
        next: REALLY_BIG_NUMBER,
      };
    }

    return clampDrag;
  }, [clampDrag.prev, clampDrag.next]);

  const dragX = useMemo(() => new Value(0), []);
  const dragY = useMemo(() => new Value(0), []);
  const gestureState = useMemo(() => new Value(-1), []);

  const clock = useMemo(() => new Clock(), []);

  const swiping = useMemo(() => new Value(0), []);
  const dragStart = useMemo(() => new Value(0), []);

  const [translationValue] = useState(animatedValue || new Value(0));

  const position = useMemo(() => new Value(initialIndex), []);
  const nextPosition = useMemo(() => new Value(0), []);

  const isControlled = parentActiveIndex !== undefined;

  const [_activeIndex, _onChange] = useState(initialIndex);

  const activeIndex = isControlled ? parentActiveIndex : (_activeIndex as any);
  const onChange = isControlled ? parentOnChange : (_onChange as any);

  const numberOfScreens = Children.count(children);

  const maxIndex = parentMax === undefined ? numberOfScreens - 1 : parentMax;

  const handleGesture = event(
    [
      {
        nativeEvent: {
          translationX: dragX,
          translationY: dragY,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const handleStateChange = event(
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
  );

  const width = useMemo(() => new Value(0), []);
  const height = useMemo(() => new Value(0), []);

  const targetDimension = useMemo(
    () => (type === 'vertical' ? 'height' : 'width'),
    [type]
  );

  const dimension = useMemo(() => (type === 'vertical' ? height : width), [
    type,
  ]);

  const translateValue = useMemo(
    () => (type === 'vertical' ? 'translateY' : 'translateX'),
    [type]
  );

  const dragValue = useMemo(() => (type === 'vertical' ? dragY : dragX), [
    type,
  ]);

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    width.setValue(layout.width as any);
    height.setValue(layout.height as any);

    const initial = isControlled ? activeIndex : (initialIndex as any);
    translationValue.setValue((initial * layout[targetDimension] * -1) as any);
  }

  Animated.useCode(set(nextPosition, activeIndex), [activeIndex]);

  const clampedDragPrev =
    clampDrag.prev !== undefined ? clampDrag.prev : -REALLY_BIG_NUMBER;

  const clampedDragNext =
    clampDrag.next !== undefined ? clampDrag.next : REALLY_BIG_NUMBER;

  const clampedDragValue = min(
    max(clampedDragPrev, dragValue),
    clampedDragNext
  );

  const percentDragged = divide(
    clampedDragValue,
    multiply(dimension, pageSize)
  );

  const numberOfPagesDragged = ceil(divide(abs(percentDragged), pageSize));

  const nextIndex = min(add(position, numberOfPagesDragged), maxIndex);
  const prevIndex = max(sub(position, numberOfPagesDragged), minIndex);
  const shouldTransition = greaterThan(abs(percentDragged), threshold);

  const translation = useMemo(
    () =>
      block([
        didChange(position, [
          call([position], ([nextIndex]) => onChange(nextIndex)),
        ]),

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
            set(swiping, 0),
            set(position, nextPosition),
            set(translationValue, runSpring(position)),
          ]
        ),
      ]),
    []
  );

  function runSpring(nextIndex: Animated.Node<number>) {
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

    const page = multiply(dimension, pageSize);

    return block([
      cond(
        clockRunning(clock),
        [
          set(state.position, translationValue),
          set(state.finished, 0),
          cond(
            neq(config.toValue, multiply(nextIndex, page, -1)),
            set(config.toValue, multiply(nextIndex, page, -1))
          ),
        ],
        [
          set(state.position, translationValue),
          set(state.finished, 0),
          set(state.time, 0),
          set(state.velocity, 0),
          set(config.toValue, multiply(nextIndex, page, -1)),
          startClock(clock),
        ]
      ),
      spring(clock, state, config),
      cond(state.finished, [stopClock(clock)]),
      state.position,
    ]);
  }

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

  return (
    <Animated.View style={style || { flex: 1 }} onLayout={handleLayout}>
      <PanGestureHandler
        {...panProps}
        activeOffsetX={[-20, 20]}
        failOffsetY={[-20, 20]}
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
  pageInterpolation: any;
  children: React.ReactNode;
}

function _Page({
  index,
  dimension,
  translation,
  targetDimension,
  translateValue,
  clamp,
  pageInterpolation,
  children,
}: iPage) {
  const inverseTranslate = multiply(translation, -1);

  const minimum = sub(
    inverseTranslate,
    multiply(
      dimension,
      clamp.prev !== undefined ? clamp.prev : REALLY_BIG_NUMBER
    )
  );

  const maximum = add(
    inverseTranslate,
    multiply(
      dimension,
      clamp.next !== undefined ? clamp.next : REALLY_BIG_NUMBER
    )
  );

  const position = multiply(index, dimension);
  const offset = divide(add(translation, position), max(dimension, 1));

  const defaultStyle = {
    [targetDimension]: dimension,
    transform: [{ [translateValue]: min(max(position, minimum), maximum) }],
  };

  const innerStyle = mapConfigToStyle(offset, index, pageInterpolation);
  const { zIndex, ...otherStyles } = innerStyle;

  return (
    <Animated.View
      style={{
        ...StyleSheet.absoluteFillObject,
        ...defaultStyle,
        zIndex: zIndex || index * -1,
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
  offset: any,
  index: number,
  pageInterpolation?: any
): ViewStyle {
  if (!pageInterpolation) {
    return {};
  }

  return Object.keys(pageInterpolation).reduce((styles: any, key: any) => {
    const currentStyle = pageInterpolation[key];

    if (Array.isArray(currentStyle)) {
      const _style = currentStyle.map((s: any) =>
        mapConfigToStyle(offset, index, s)
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
      const _style = currentStyle(offset, index);
      styles[key] = _style;
      return styles;
    }

    return styles;
  }, {});
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
    throw new Error('usePager must be used within a <PagerProvier />');
  }

  return context;
}

export { Pager, PagerProvider, usePager };
