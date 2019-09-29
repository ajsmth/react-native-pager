import { useRef, MutableRefObject } from 'react';
import { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { iPageInterpolation, SpringConfig } from './pager';

const {
  interpolate,
  concat,
  Value,
  clockRunning,
  cond,
  neq,
  set,
  startClock,
  spring,
  stopClock,
  block,
} = Animated;

function mapConfigToStyle(
  offset: Animated.Node<number>,
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

const DEFAULT_SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

function runSpring(
  clock: Animated.Clock,
  position: Animated.Value<number>,
  toValue: Animated.Node<number>,
  springConfig?: Partial<SpringConfig>
) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: position,
    time: new Value(0),
  };

  const config = {
    ...DEFAULT_SPRING_CONFIG,
    ...springConfig,
    toValue: new Value(0),
  };

  return block([
    cond(
      clockRunning(clock),
      [
        cond(neq(config.toValue, toValue), [
          set(state.finished, 0),
          set(config.toValue, toValue),
        ]),
      ],
      [
        set(state.finished, 0),
        set(state.time, 0),
        set(state.velocity, 0),
        set(config.toValue, toValue),
        startClock(clock),
      ]
    ),
    spring(clock, state, config),
    cond(state.finished, [stopClock(clock), set(position, state.position)]),
    state.position,
  ]);
}

// prevents layout bugs on multiply calls to an Animated.Value.setValue()
// setValue() issue: https://github.com/kmagiera/react-native-reanimated/issues/216
// it's not entirely foolproof, not exactly sure how this works to be honest,
// but from the issue above it appears to happen only in debug mode anyways
function safelyUpdateValues(
  fn: Function,
  ref: MutableRefObject<undefined | number>
) {
  if (ref.current) {
    cancelAnimationFrame(ref.current);
  }

  ref.current = requestAnimationFrame(() => {
    fn();
    ref.current = undefined;
  });
}

export { mapConfigToStyle, memoize, runSpring, safelyUpdateValues };
