import React, {
  useState,
  Children,
  createContext,
  useContext,
  useEffect,
} from 'react';
import { StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerProperties,
} from 'react-native-gesture-handler';

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
const UNSET = -1;
const TRUE = 1;
const FALSE = 0;

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
  multiply,
  sub,
  call,
  max,
  min,
  greaterThan,
  abs,
  ceil,
  interpolate,
  concat,
  neq,
  and,
  startClock,
  spring,
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

// at its core, this component converts an activeIndex integer value to an Animated.Value
// this animated value represents all intermediate values of a pager, e.g when a user is dragging, the index
// value might be anything between 1 -> 2 as they are moving. when a gesture is completed, it figures out
// the next activeIndex, snaps to it and passes it back. it also handles snapping to different indices when the activeIndex
// prop changes.

// all styles and positioning of child screens can be computed from this one value, based on a childs index and
// any style config props passed to the Pager.

// pretty much all other props passed to the Pager are configurations for different behaviours of what is described above

function Pager({
  activeIndex: parentActiveIndex,
  onChange: parentOnChange,
  initialIndex = 0,
  children,
  springConfig,
  panProps = {},
  pageSize = 1,
  threshold = 0.1,
  minIndex = 0,
  maxIndex: parentMax,
  adjacentChildOffset = 10,
  style,
  containerStyle,
  type = 'horizontal',
  pageInterpolation,
  clamp = {},
  clampDrag = {},
  animatedValue,
}: iPager) {
  const context = useContext(PagerContext);

  const isControlled = parentActiveIndex !== undefined;

  const [_activeIndex, _onChange] = useState(initialIndex);

  const activeIndex = isControlled
    ? (parentActiveIndex as number)
    : context
    ? (context[0] as number)
    : (_activeIndex as number);

  const numberOfScreens = Children.count(children);

  const maxIndex =
    parentMax === undefined
      ? Math.ceil((numberOfScreens - 1) / pageSize)
      : parentMax;

  const onChange = isControlled
    ? (parentOnChange as any)
    : context
    ? (context[1] as any)
    : (_onChange as any);

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

  let initialWidth = UNSET;
  if (style && style.width) {
    if (typeof style.width === 'number') {
      initialWidth = style.width;
    }
  }

  let initialHeight = UNSET;
  if (style && style.height) {
    if (typeof style.height === 'number') {
      initialHeight = style.height;
    }
  }

  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  // assign references based on vertical / horizontal configurations
  const dimension = memoize(new Value(0));
  const targetDimension = type === 'vertical' ? 'height' : 'width';
  const targetTransform = type === 'vertical' ? 'translateY' : 'translateX';
  const delta = type === 'vertical' ? dragY : dragX;

  const layoutDimension = type === 'vertical' ? height : width;

  // `totalDimension` on the container view is required for android layouts to work properly
  // otherwise translations move the panHandler off of the screen
  // set the total width of the container view to the sum width of all the screens
  const totalDimension = multiply(dimension, numberOfScreens);

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    layout.width !== width && setWidth(layout.width);
    layout.height !== height && setHeight(layout.height);
  }

  const TYPE = type === 'vertical' ? VERTICAL : HORIZONTAL;

  // props that might change over time should be reactive:
  const animatedThreshold = useAnimatedValue(threshold);
  const clampDragPrev = useAnimatedValue(clampDrag.prev, REALLY_BIG_NUMBER);
  const clampDragNext = useAnimatedValue(clampDrag.next, REALLY_BIG_NUMBER);
  const animatedMaxIndex = useAnimatedValue(maxIndex);
  const animatedMinIndex = useAnimatedValue(minIndex);

  // set the initial position - priority to direct prop over context, and context over uncontrolled
  const _position = memoize(new Value(activeIndex));
  const position = animatedValue
    ? animatedValue
    : context
    ? context[2]
    : _position;

  // pan event values to track
  const dragStart = memoize(new Value(0));
  const swiping = memoize(new Value(FALSE));
  const nextIndex = memoize(new Value(activeIndex));
  const animatedActiveIndex = memoize(new Value(activeIndex));
  const change = memoize(sub(animatedActiveIndex, position));
  const absChange = memoize(abs(change));
  const shouldTransition = memoize(greaterThan(absChange, animatedThreshold));
  const indexChange = memoize(new Value(0));

  // clamp drag values between the configured clamp props
  // e.g prev => 0.5, next => 0.5 means change can only be between [-0.5, 0.5]
  // minMax order is reversed because next is negative in translation values
  const clampedDelta = memoize(
    min(
      max(divide(delta, dimension), multiply(clampDragNext, -1)),
      clampDragPrev
    )
  );

  const clock = memoize(new Clock());

  // snap focus to activeIndex when it updates
  useEffect(() => {
    if (activeIndex >= minIndex && activeIndex <= maxIndex) {
      nextIndex.setValue(activeIndex);
    }
  }, [activeIndex, minIndex, maxIndex]);

  // animatedIndex represents pager position with an animated value
  // this value is used to compute the transformations of the container screen
  // its also used to compute the offsets of child screens, and any other consumers
  const animatedIndex = memoize(
    block([
      cond(
        eq(gestureState, State.ACTIVE),
        [
          cond(clockRunning(clock), stopClock(clock)),
          // captures the initial drag value on first drag event
          cond(swiping, 0, [set(dragStart, position), set(swiping, TRUE)]),

          set(position, sub(dragStart, clampedDelta)),
        ],
        [
          // on release -- figure out if the index needs to change, and what index it should change to
          cond(swiping, [
            set(swiping, FALSE),
            cond(shouldTransition, [
              // rounds index change if pan gesture greater than just one screen
              set(indexChange, ceil(absChange)),
              // nextIndex set to the next snap point
              set(
                nextIndex,
                cond(
                  greaterThan(change, 0),
                  min(
                    max(
                      sub(animatedActiveIndex, indexChange),
                      animatedMinIndex
                    ),
                    animatedMaxIndex
                  ),
                  min(
                    max(
                      add(animatedActiveIndex, indexChange),
                      animatedMinIndex
                    ),
                    animatedMaxIndex
                  )
                )
              ),
              // update w/ value that will be snapped to
              call([nextIndex], ([nextIndex]) => onChange(nextIndex)),
            ]),
          ]),

          // set animatedActiveIndex for next swipe event
          set(animatedActiveIndex, nextIndex),
          set(position, runSpring(clock, position, nextIndex, springConfig)),
        ]
      ),
      position,
    ])
  );

  const clampPrevValue = useAnimatedValue(clamp.prev, numberOfScreens);
  const clampNextValue = useAnimatedValue(clamp.next, numberOfScreens);

  // stop child screens from translating beyond the bounds set by clamp props:
  const minimum = memoize(
    multiply(sub(animatedIndex, clampPrevValue), dimension)
  );

  const maximum = memoize(
    multiply(add(animatedIndex, clampNextValue), dimension)
  );

  const animatedPageSize = useAnimatedValue(pageSize);

  // container offset -- this is the window of focus for active screens
  // it shifts around based on the animatedIndex value
  const containerTranslation = memoize(
    multiply(animatedIndex, dimension, animatedPageSize, -1)
  );

  // slice the children that are rendered by the <Pager />
  // this enables very large child lists to render efficiently
  // the downside is that children are unmounted after they pass this threshold
  // it's an optional prop, however a default value of ~20 is set here to prevent
  // possible performance bottlenecks to those not aware of the prop or what it does

  // this will slice adjacentChildOffset number of children previous and after
  // the current active child index into a smaller child array
  const adjacentChildren =
    adjacentChildOffset !== undefined
      ? children.slice(
          Math.max(activeIndex - adjacentChildOffset, 0),
          Math.min(activeIndex + adjacentChildOffset + 1, numberOfScreens)
        )
      : children;

  // grabbing the height property from the style prop if there is no container style, this reduces
  // the chances of messing up the layout with containerStyle configurations
  // can be overridden by the prop itself, but its likely that this is what is intended most of the time
  // also has the benefit of covering 100% width of container, meaning better pan coverage on android
  const defaultContainerStyle =
    style && style.height ? { height: style.height } : undefined;

  function renderChildren() {
    // waiting for initial layout - except when testing
    if (width === UNSET) {
      return null;
    }

    return adjacentChildren.map((child: any, i) => {
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
        <IndexProvider index={index} key={index}>
          <FocusProvider focused={index === activeIndex}>
            <Page
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
          </FocusProvider>
        </IndexProvider>
      );
    });
  }

  // extra Animated.Views below may seem redundant but they preserve applied styles e.g padding and margin
  // of the page views
  return (
    <Animated.View
      style={containerStyle || defaultContainerStyle || { flex: 1 }}
    >
      <Animated.Code
        key={layoutDimension}
        exec={cond(
          // dimension already set to last layout
          and(eq(dimension, width), eq(dimension, height)),
          [],
          [
            cond(
              eq(TYPE, VERTICAL),
              set(dimension, height),
              set(dimension, width)
            ),
          ]
        )}
      />

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
                {renderChildren()}
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

interface iPage {
  children: React.ReactNode;
  index: number;
  minimum: Animated.Node<number>;
  maximum: Animated.Node<number>;
  dimension: Animated.Node<number>;
  targetTransform: 'translateX' | 'translateY';
  targetDimension: 'width' | 'height';
  pageInterpolation: iPageInterpolation | undefined;
  animatedIndex: Animated.Value<number>;
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
}: iPage) {
  // compute the absolute position of the page based on index and dimension
  // this means that it's not relative to any other child, which is good because
  // it doesn't rely on a mechanism like flex, which requires all children to be present
  // to properly position pages
  const position = memoize(multiply(index, dimension));

  // min-max the position based on clamp values
  // this means the <Page /> will have a container that is always positioned
  // in the same place, but the inner view can be translated within these bounds
  const translation = memoize(min(max(position, minimum), maximum));

  const defaultStyle = memoize({
    // map to height / width value depending on vertical / horizontal configuration
    // this is crucial to getting child views to properly lay out
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

  // compute the relative offset value to the current animated index so
  // that <Page /> can use interpolation values that are in sync with drag gestures
  const offset = memoize(sub(index, animatedIndex));

  // apply interpolation configs to <Page />
  const interpolatedStyles = memoize(
    interpolateWithConfig(offset, pageInterpolation)
  );

  // take out zIndex here as it needs to be applied to siblings
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

// utility to update animated values without changing their reference
// this is key for using memoized Animated.Values and prevents costly rerenders
function useAnimatedValue(
  value?: number,
  defaultValue = 0
): Animated.Value<number> {
  const initialValue = value !== undefined ? value : defaultValue;
  const animatedValue = memoize(new Value(initialValue));

  useEffect(() => {
    if (value !== undefined) {
      animatedValue.setValue(value);
    }
  }, [value]);

  return animatedValue;
}

type iPagerContext = [
  number,
  (nextIndex: number) => void,
  Animated.Value<number>
];

const PagerContext = createContext<undefined | iPagerContext>(undefined);

interface iPagerProvider {
  children: React.ReactNode;
  initialIndex?: number;
  activeIndex?: number;
  onChange?: (nextIndex: number) => void;
}

function PagerProvider({
  children,
  initialIndex = 0,
  activeIndex: parentActiveIndex,
  onChange: parentOnChange = () =>
    console.warn(
      '<PagerProvider /> should have an onChange() prop if it is controlled'
    ),
}: iPagerProvider) {
  const [_activeIndex, _setActiveIndex] = useState(initialIndex);

  const isControlled = parentActiveIndex !== undefined;

  const activeIndex = isControlled ? parentActiveIndex : _activeIndex;
  const onChange = isControlled ? parentOnChange : _setActiveIndex;

  const animatedIndex = memoize(new Value(activeIndex));

  return (
    <PagerContext.Provider
      value={[activeIndex, onChange, animatedIndex] as iPagerContext}
    >
      {typeof children === 'function'
        ? children({ activeIndex, onChange, animatedIndex })
        : children}
    </PagerContext.Provider>
  );
}

function usePager(): iPagerContext {
  const context = useContext(PagerContext);

  if (context === undefined) {
    throw new Error(`usePager() must be used within a <PagerProvider />`);
  }

  return context;
}

// provide hook for child screens to access pager focus:
const FocusContext = React.createContext(false);

interface iFocusProvider {
  children: React.ReactNode;
  focused: boolean;
}

function FocusProvider({ focused, children }: iFocusProvider) {
  return (
    <FocusContext.Provider value={focused}>{children}</FocusContext.Provider>
  );
}

function useFocus() {
  const focused = useContext(FocusContext);

  return focused;
}

const IndexContext = React.createContext<undefined | number>(undefined);

interface iIndexProvider {
  children: React.ReactNode;
  index: number;
}

function IndexProvider({ children, index }: iIndexProvider) {
  return (
    <IndexContext.Provider value={index}>{children}</IndexContext.Provider>
  );
}

function useIndex() {
  const index = useContext(IndexContext);

  if (index === undefined) {
    throw new Error(`useIndex() must be used within an <IndexProvider />`);
  }

  return index;
}

function useOnFocus(fn: Function) {
  const focused = useFocus();

  useEffect(() => {
    if (focused) {
      fn();
    }
  }, [focused]);
}

function useAnimatedIndex() {
  const pager = usePager();
  return pager[2];
}

function useOffset(index: number) {
  const animatedIndex = useAnimatedIndex();
  const offset = memoize(sub(index, animatedIndex));

  return offset;
}

function useInterpolation(
  pageInterpolation: iPageInterpolation,
  index?: number
) {
  const _index = index !== undefined ? index : useIndex();
  const offset = useOffset(_index);
  const styles = memoize(interpolateWithConfig(offset, pageInterpolation));
  return styles;
}

function interpolateWithConfig(
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
        interpolateWithConfig(offset, interpolationConfig)
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
  const ref = React.useRef(value);
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
    cond(state.finished, [stopClock(clock), set(state.position, position)]),
    state.position,
  ]);
}

export {
  Pager,
  PagerProvider,
  PagerContext,
  usePager,
  useFocus,
  useOffset,
  useOnFocus,
  useIndex,
  useAnimatedIndex,
  useInterpolation,
  IndexProvider,
  FocusProvider,
};
