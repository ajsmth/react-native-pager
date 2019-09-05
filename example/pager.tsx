import React, {useState, useEffect, Children, useMemo} from 'react';
import {StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';
import {PanGestureHandler, State} from 'react-native-gesture-handler';

console.disableYellowBox = true;

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
  debug,
  lessThan,
  ceil,
  diffClamp,
} = Animated;

const SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

function Pager({
  activeIndex: parentActiveIndex,
  onChange: parentOnChange,
  initialIndex = 0,
  children,
  springConfig = SPRING_CONFIG,
  panProps = {},
  pageSize = 1,
  threshold = 0.2,
  minIndex = 0,
  maxIndex: parentMax,
  adjacentChildOffset,
  style,
  dx: parentDx,
  dy: parentDy,
  type = 'horizontal',
  clamp = {
    prev: 1,
    next: 2,
  },
}) {
  const dragX = useMemo(() => new Value(0), []);
  const dragY = useMemo(() => new Value(0), []);
  const gestureState = useMemo(() => new Value(-1), []);

  const clock = useMemo(() => new Clock(), []);

  const swiping = useMemo(() => new Value(0), []);
  const dragStart = useMemo(() => new Value(0), []);

  const [dx] = useState(parentDx || new Value(0));
  const [dy] = useState(parentDy || new Value(0));

  const position = useMemo(() => new Value(initialIndex), []);
  const nextPosition = useMemo(() => new Value(0), []);

  const isControlled = parentActiveIndex !== undefined;

  const [_activeIndex, _onChange] = useState(initialIndex);

  const activeIndex = isControlled ? parentActiveIndex : _activeIndex;
  const onChange = isControlled ? parentOnChange : _onChange;

  const maxIndex =
    parentMax === undefined ? Children.count(children) - 1 : parentMax;

  const handleGesture = event(
    [
      {
        nativeEvent: {
          translationX: dragX,
          translationY: dragY,
        },
      },
    ],
    {useNativeDriver: true},
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
    },
  );

  const width = useMemo(() => new Value(0), []);
  const height = useMemo(() => new Value(0), []);

  const dimension = type === 'vertical' ? height : width;
  const translateValue = type === 'vertical' ? 'translateY' : 'translateX';
  const dragValue = type === 'vertical' ? dragY : dragX;
  const changeValue = type === 'vertical' ? dy : dx;

  function handleLayout({nativeEvent: {layout}}) {
    width.setValue(layout.width);
    height.setValue(layout.height);

    const initial = isControlled ? activeIndex : initialIndex;
    dx.setValue((initial * layout.width * -1) as any);
    dy.setValue((initial * layout.height * -1) as any);
  }

  useEffect(() => {
    if (activeIndex >= minIndex && activeIndex <= maxIndex) {
      nextPosition.setValue(activeIndex);
    }
  }, [activeIndex]);

  const translation = block([
    didChange(position, [
      call([position], ([nextIndex]) => onChange(nextIndex)),
    ]),

    cond(
      eq(gestureState, State.ACTIVE),
      [
        cond(clockRunning(clock), stopClock(clock)),
        cond(swiping, [0], set(dragStart, changeValue)),
        set(swiping, 1),
        set(nextPosition, getNextPosition(dragValue, position)),
        set(changeValue, add(dragValue, dragStart)),
      ],

      [
        set(swiping, 0),
        set(dragStart, 0),
        set(position, nextPosition),
        set(changeValue, runSpring(position)),
      ],
    ),
  ]);

  function getNextPosition(
    drag: Animated.Node<number>,
    currentPosition: Animated.Node<number>,
  ) {
    const percentDragged = divide(drag, multiply(dimension, pageSize));
    const numberOfPages = ceil(divide(abs(percentDragged), pageSize));

    const nextIndex = min(add(currentPosition, numberOfPages), maxIndex);
    const prevIndex = max(sub(currentPosition, numberOfPages), minIndex);
    const shouldTransition = greaterThan(abs(percentDragged), threshold);

    return cond(
      shouldTransition,
      cond(lessThan(percentDragged, 0), nextIndex, prevIndex),
      currentPosition,
    );
  }

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
          set(state.position, changeValue),
          set(state.finished, 0),
          cond(
            neq(config.toValue, multiply(nextIndex, page, -1)),
            set(config.toValue, multiply(nextIndex, page, -1)),
          ),
        ],
        [
          set(state.position, changeValue),
          set(state.finished, 0),
          set(state.time, 0),
          set(state.velocity, 0),
          set(config.toValue, multiply(nextIndex, page, -1)),
          startClock(clock),
        ],
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
          Math.min(
            activeIndex + adjacentChildOffset + 1,
            Children.count(children),
          ),
        )
      : children;

  const inverseTranslate = multiply(translation, -1);
  const minimum = sub(inverseTranslate, multiply(width, clamp.prev || 1));
  const maximum = add(inverseTranslate, multiply(width, clamp.next || 2));

  return (
    <Animated.View style={style || {flex: 1}}>
      <PanGestureHandler
        {...panProps}
        onGestureEvent={handleGesture}
        onHandlerStateChange={handleStateChange}>
        <Animated.View style={{flex: 1}} onLayout={handleLayout}>
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              transform: [{[translateValue]: translation}],
            }}>
            {Children.map(adjacentChildren, (child, index) => {
              let offset = index;

              if (adjacentChildOffset !== undefined) {
                offset =
                  activeIndex <= adjacentChildOffset
                    ? index
                    : activeIndex - adjacentChildOffset + index;
              }

              const t = multiply(offset, dimension);

              return (
                <Animated.View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    transform: [
                      {[translateValue]: min(max(t, minimum), maximum)},
                    ],
                  }}>
                  {child}
                </Animated.View>
              );
            })}
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

export {Pager};
