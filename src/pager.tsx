import React, {
  useState,
  Children,
  useMemo,
  createContext,
  useContext,
  cloneElement,
} from 'react';
import { StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  PanGestureHandler,
  State,
  GestureHandlerProperties,
} from 'react-native-gesture-handler';

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
  springConfig?: any;
  panProps?: Partial<GestureHandlerProperties>;
  pageSize?: number;
  threshold?: number;
  minIndex?: number;
  maxIndex?: number;
  adjacentChildOffset?: number;
  style?: any;
  animatedValue?: Animated.Value<number>;
  type?: 'horizontal' | 'vertical';
  clamp?: {
    prev?: number;
    next?: number;
  };

  clampDrag: {
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
  adjacentChildOffset,
  style,
  animatedValue,
  type = 'horizontal',
  clamp = {
    prev: REALLY_BIG_NUMBER,
    next: REALLY_BIG_NUMBER,
  },
  clampDrag = {
    prev: -REALLY_BIG_NUMBER,
    next: REALLY_BIG_NUMBER,
  },
}: PagerProps) {
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

  if (numberOfScreens === 1) {
    children = [children];
  }

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

  const targetDimension = type === 'horizontal' ? 'width' : 'height';
  const dimension = type === 'vertical' ? height : width;
  const translateValue = type === 'vertical' ? 'translateY' : 'translateX';
  const dragValue = type === 'vertical' ? dragY : dragX;

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

  const numberOfPages = ceil(divide(abs(percentDragged), pageSize));

  const nextIndex = min(add(position, numberOfPages), maxIndex);
  const prevIndex = max(sub(position, numberOfPages), minIndex);
  const shouldTransition = greaterThan(abs(percentDragged), threshold);

  const translation = block([
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
  ]);

  function runSpring(nextIndex: Animated.Node<number>) {
    const state = {
      finished: new Value(0),
      velocity: new Value(0),
      position: new Value(0),
      time: new Value(0),
    };

    const config = {
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

  const inverseTranslate = multiply(translation, -1);

  const minimum = sub(
    inverseTranslate,
    multiply(width, clamp.prev || REALLY_BIG_NUMBER)
  );

  const maximum = add(
    inverseTranslate,
    multiply(width, clamp.next || REALLY_BIG_NUMBER)
  );

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
            {Children.map(adjacentChildren, (child, index) => {
              let offset = index;

              if (adjacentChildOffset !== undefined) {
                offset =
                  activeIndex <= adjacentChildOffset
                    ? index
                    : activeIndex - adjacentChildOffset + index;
              }

              const pos = multiply(offset, dimension);

              return (
                <Animated.View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    [targetDimension]: dimension,
                    zIndex: activeIndex === offset ? 1 : 0,
                    transform: [
                      { [translateValue]: min(max(pos, minimum), maximum) },
                    ],
                  }}
                >
                  {cloneElement(child as any, {
                    active: offset === activeIndex,
                  })}
                </Animated.View>
              );
            })}
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

type iPagerContext = [number, (nextIndex: number) => void];
const PagerContext = createContext<undefined | iPagerContext>(undefined);

interface iPagerProvider {
  children: React.ReactNode;
  initialIndex?: number;
}

function PagerProvider({ children, initialIndex = 0 }: iPagerProvider) {
  const [activeIndex, onChange] = useState(initialIndex);

  return (
    <PagerContext.Provider value={[activeIndex, onChange]}>
      {children}
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
