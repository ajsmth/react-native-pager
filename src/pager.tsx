import React, {
  useState,
  Children,
  createContext,
  useContext,
  useEffect,
  memo,
} from 'react';
import { StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerProperties,
} from 'react-native-gesture-handler';
import { memoize, interpolateWithConfig } from './util';

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
  adjacentChildOffset = 10,
  animatedValue,
  style,
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
  animatedIndex: parentAnimatedIndex,
}: iPager) {
  const context = useContext(PagerContext);

  // register these props if they exist -- they can be shared with other
  // components to keep the translation values in sync

  // prioritize direct prop, then context, then internal value
  // memoize these so they don't get reset on rerenders
  const _animatedValue =
    animatedValue !== undefined
      ? animatedValue
      : context
      ? context[2]
      : new Value(0);

  const translationValue = memoize(_animatedValue);

  const _animatedIndex =
    parentAnimatedIndex !== undefined
      ? parentAnimatedIndex
      : context
      ? context[3]
      : new Value(0);

  const animatedIndex = memoize(_animatedIndex);

  const [_activeIndex, _onChange] = useState(initialIndex);

  // assign activeIndex and onChange correctly based on controlled / uncontrolled
  // configurations

  // prioritize direct prop over context, and context over internal state
  const isControlled = parentActiveIndex !== undefined;

  const activeIndex = isControlled
    ? parentActiveIndex
    : context
    ? context[0]
    : (_activeIndex as any);

  const onChange = isControlled
    ? parentOnChange
    : context
    ? context[1]
    : (_onChange as any);

  const numberOfScreens = Children.count(children);

  // maxIndex might change over time, but computations using this value are memoized
  // so it should be saved and updated as an Animated.Value accordingly
  const maxIndexValue =
    parentMax === undefined
      ? Math.ceil((numberOfScreens - 1) / pageSize)
      : parentMax;

  const maxIndex = memoize(new Value(maxIndexValue));

  useEffect(() => {
    requestAnimationFrame(() => {
      maxIndex.setValue(maxIndexValue);
    });
  }, [maxIndexValue]);

  const dragX = memoize(new Value(0));
  const dragY = memoize(new Value(0));
  const gestureState = memoize(new Value(-1));

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

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const dimension = memoize(new Value(0));

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
      [
        cond(eq(TYPE, VERTICAL), set(dimension, height), set(dimension, width)),
        set(translationValue, multiply(activeIndex, dimension, -1)),
      ]
    ),
    [width, height]
  );

  // assign variables based on vertical / horizontal configurations
  const targetDimension = type === 'vertical' ? 'height' : 'width';
  const translateValue = type === 'vertical' ? 'translateY' : 'translateX';
  const dragValue = type === 'vertical' ? dragY : dragX;

  // compute the total size of a page to determine how far to snap
  const page = memoize(multiply(dimension, pageSize));

  // only need one clock
  const clock = memoize(new Clock());

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
          // only set the toValue when needed
          // this block runs a lot, hopefully this helps with performance
          cond(
            neq(config.toValue, nextPosition),
            set(config.toValue, nextPosition)
          ),

          set(animatedIndex, divide(state.position, max(dimension, 1), -1)),
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

  // most important parts of the following function:
  // `swiping` is used to determine how the activeIndex changed
  //  if an index change occurs and the state is swiping, its safe to say
  //  it occured by user action, and not an external / parent activeIndex prop change
  const swiping = memoize(new Value(0));
  const dragStart = memoize(new Value(0));

  // position is a different name for the current index registered with the <Pager />
  // it does not necessarily reflect the activeIndex in all states
  const position = memoize(new Value(activeIndex));

  // `nextPosition` is computed every frame (could be optimized probably)
  // and the value is used on release to snap to a given index offset
  // updating this value will trigger the spring to snap when the user releases or
  // if the activeIndex prop changes
  const nextPosition = memoize(new Value(0));

  // Animated.useCode doesn't seem to fire in time to update the nextPosition
  // value to trigger transitions, not sure why but this works for now
  useEffect(() => {
    if (activeIndex >= minIndex && activeIndex <= maxIndexValue) {
      requestAnimationFrame(() => {
        nextPosition.setValue(activeIndex);
      });
    }
  }, [activeIndex, maxIndexValue, minIndex]);

  // compute the next snap point - it could be multiply screens depending
  // on how far the user has dragged and what pageSize value is
  const clampedDragPrev =
    clampDrag.prev !== undefined ? clampDrag.prev : REALLY_BIG_NUMBER;

  const clampedDragNext =
    clampDrag.next !== undefined ? clampDrag.next : REALLY_BIG_NUMBER;

  // clamps the drag value between previous and next values
  // this defaults to a really large amount so there is no real clamping
  // but it can be use to prevent the user from swiping in a certain direction
  // e.g clampDragNext value of 0 means the user cannot swipe to the next screen
  // at all
  const clampedDragValue = memoize(
    max(min(clampedDragPrev, dragValue), multiply(clampedDragNext, -1))
  );

  const percentDragged = memoize(divide(clampedDragValue, dimension));

  // use pageSize to determine how many screens the user has dragged
  // the default is 100% of a page
  const numberOfPagesDragged = memoize(
    ceil(divide(abs(percentDragged), pageSize))
  );

  // next and previous indices based on how far the user has dragged, accounting
  // for the potential of dragging past the min/max index values of the <Pager />
  const nextIndex = memoize(min(add(position, numberOfPagesDragged), maxIndex));
  const prevIndex = memoize(max(sub(position, numberOfPagesDragged), minIndex));

  // if shouldTransition evaluates to true, it will snap to either previous or next
  // depending on the direction of the drag
  const shouldTransition = memoize(greaterThan(abs(percentDragged), threshold));

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
          // `animatedIndex` is updated here to track index changes as an animated value
          // this means it can have intermediate values (e.g 1.23) which is an easier value
          // for other components (e.g Pagination) to consume
          set(
            animatedIndex,
            divide(add(clampedDragValue, dragStart), max(dimension, 1), -1)
          ),
          set(translationValue, add(clampedDragValue, dragStart)),
        ],

        // on release or index change, the following runs:

        // if the position has changed then alert the active onChange callback
        // its better to use it in this block rather than Animated.onChange,
        // as it seems to fire mid block and start other blocks, causing the potential
        // for a loop of updates to activeIndex on rapid index changes that the component
        // can't resolve

        // note that the onChange callback only needs to be updated if a user was swiping,
        // otherwise it must have come from a controlled prop, in which case that
        // component already knows the activeIndex
        // this prevents another potential rerender from an incorrect increment / decrement
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
          translationValue,
        ]
      ),
    ])
  );

  // compute the minimum and maximum distance from the active screen window
  // these are min-maxed in <Page /> to enable control of their positioning

  // inverse used here to make the mental math a little less complex
  // since screens are positioned starting from 0 to totalDimension
  // and translation values are 0 to -totalDimension
  const inverseTranslate = memoize(multiply(translation, -1));

  // the max distance a screen can have from the active window should be
  // the max number of possible screens that the pager will render (numberOfScreens)
  // hence that is the default value when undefined
  const clampPrevValue =
    clamp.prev !== undefined ? clamp.prev : numberOfScreens;
  const clampNextValue =
    clamp.next !== undefined ? clamp.next : numberOfScreens;

  // determine how far offset previous / next screens can possibly be
  // this will clamp them on either side of the active window if a value
  // is specified
  const clampPrev = memoize(
    sub(inverseTranslate, multiply(dimension, clampPrevValue))
  );

  const clampNext = memoize(
    add(inverseTranslate, multiply(dimension, clampNextValue))
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

  // `totalDimension` on the container view is required for android layouts to work properly
  // otherwise translations move the panHandler off of the screen
  // set the total width of the container view to the sum width of all the screens
  const totalDimension = memoize(multiply(dimension, numberOfScreens));

  return (
    <Animated.View style={style || { flex: 1 }} onLayout={handleLayout}>
      {width === 0 ? null : (
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
              {adjacentChildren.map((child: any, i) => {
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
                    dimension={dimension}
                    translation={translation}
                    targetDimension={targetDimension}
                    translateValue={translateValue}
                    clampPrev={clampPrev}
                    clampNext={clampNext}
                    pageInterpolation={pageInterpolation}
                  >
                    <IndexProvider index={index}>
                      <FocusProvider focused={index === activeIndex}>
                        {child}
                      </FocusProvider>
                    </IndexProvider>
                  </Page>
                );
              })}
            </Animated.View>
          </Animated.View>
        </PanGestureHandler>
      )}
    </Animated.View>
  );
}

interface iPage {
  index: number;
  dimension: Animated.Value<number>;
  translation: Animated.Node<number>;
  targetDimension: 'width' | 'height';
  translateValue: 'translateX' | 'translateY';
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
  // compute the absolute position of the page based on index and dimension
  // this means that it's not relative to any other child, which is good because
  // it doesn't rely on a mechanism like flex, which requires all children to be present
  // to properly position pages
  const position = memoize(multiply(index, dimension));

  const defaultStyle = memoize({
    // map to height / width value depending on vertical / horizontal configuration
    [targetDimension]: dimension,
    // min-max the position based on clamp values
    // this means the <Page /> will have a container that is always positioned
    // in the same place, but the inner view can be translated within these bounds
    transform: [{ [translateValue]: min(max(position, clampPrev), clampNext) }],
  });

  // compute the relative offset value to the current translation (__not__ index) so
  // that <Page /> can use interpolation values that are in sync with drag gestures
  const offset = memoize(divide(add(translation, position), max(dimension, 1)));

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
    zIndex = -index;
  }

  // prevent initial style interpolations from bleeding through by delaying the view
  // appearance until it has first laid out, otherwise there are some flashes of transformation
  // as the page enters the view
  const [initialized, setInitialized] = useState(false);
  function handleLayout() {
    setInitialized(true);
  }

  return (
    <Animated.View
      onLayout={handleLayout}
      style={{
        ...StyleSheet.absoluteFillObject,
        ...defaultStyle,
        opacity: initialized ? 1 : 0,
        zIndex: zIndex,
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, otherStyles]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const Page = memo(_Page);

type iPagerContext = [
  number,
  (nextIndex: number) => void,
  Animated.Value<number>,
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

  const animatedValue = memoize(new Value(0));
  const animatedIndex = memoize(new Value(activeIndex));

  return (
    <PagerContext.Provider
      value={
        [activeIndex, onChange, animatedValue, animatedIndex] as iPagerContext
      }
    >
      {typeof children === 'function'
        ? children({ activeIndex, onChange })
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
  return pager[3];
}

function useAnimatedOffset(index: number) {
  const pager = usePager();
  const animatedIndex = pager[3];
  const offset = memoize(sub(index, animatedIndex));

  return offset;
}

export {
  Pager,
  PagerProvider,
  PagerContext,
  usePager,
  useFocus,
  useAnimatedOffset,
  useOnFocus,
  useIndex,
  useAnimatedIndex,
};
