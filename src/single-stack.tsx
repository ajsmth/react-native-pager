import React, { Children, useEffect, useContext, useState } from 'react';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { LayoutChangeEvent, StyleSheet, ViewStyle } from 'react-native';
import { mapConfigToStyle, memoize, runSpring } from './util';
import { iPageInterpolation, SpringConfig, PagerContext } from './pager';

// SingleStack... can't think of a better name for this as of yet, it's likely to change...

// this component manages the translation of two container views
// and translates them in and out of the active scope based on provided
// rootIndex and activeIndex values

// the root view always stays in the center, as non-root views should only appear on
// top of the root view -- this component is mainly for navigation structures where
// there are multiple different, branched pathways to go to from a root view
// but the child views aren't related to eachother and so should appear to operate independently

// the two containers with non-root views also manage their children views, springing the active
// view in and out of the window. this likely will only provide a layer of consistency,
// in the wild these situations should rarely occur, as those kinds of transitions indicate
// the two views are somehow related, and a different navigation component should probably
// be used

const {
  event,
  block,
  Value,
  divide,
  cond,
  eq,
  add,
  Clock,
  set,
  neq,
  sub,
  call,
  max,
  min,
  greaterThan,
  abs,
  multiply,
  // @ts-ignore
  debug,
  lessThan,
  floor,
  and,
  greaterOrEq,
  lessOrEq,
  ceil,
  diff,
} = Animated;

interface iSingleStack {
  children: React.ReactNode[];
  activeIndex?: number;
  onChange?: (nextIndex: number) => void;
  rootIndex: number;
  style?: ViewStyle;
  rootInterpolation?: iPageInterpolation;
  pageInterpolation?: iPageInterpolation;
  springConfig?: Partial<SpringConfig>;
  threshold?: number;
  type?: 'vertical' | 'horizontal';
}

function SingleStack({
  children,
  activeIndex: parentActiveIndex,
  onChange: parentOnChange,
  rootIndex,
  style,
  rootInterpolation,
  pageInterpolation,
  springConfig,
  threshold = 0.2,
  type = 'horizontal',
}: iSingleStack) {
  const context = useContext(PagerContext);
  const [_activeIndex, _onChange] = useState(parentActiveIndex || 0);
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

  const width = memoize(new Value(0));
  const height = memoize(new Value(0));

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    width.setValue(layout.width);
    height.setValue(layout.height);
  }

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

  const dimension = type === 'vertical' ? height : width;
  const translateValue = type === 'vertical' ? 'translateY' : 'translateX';
  const dragValue = type === 'vertical' ? dragY : dragX;

  const animatedIndex = memoize(new Value(activeIndex));

  // memoize the animated index and next position to prevent extra rerenders
  // in child components, using an integer prop that changes rapidly causes rerenders that
  // can be prevented with no loss to the state of the component by updating Animated.Values here
  useEffect(() => {
    // nextPosition should always be a value between -1 and 1
    const offset = activeIndex - rootIndex;
    const nextOffset = Math.max(Math.min(offset, 1), -1);

    nextPosition.setValue(nextOffset);
    animatedIndex.setValue(activeIndex);
  }, [activeIndex]);

  const initialOffset = activeIndex - rootIndex;
  const initialPosition = memoize(Math.max(Math.min(initialOffset, 1), -1));

  // position is the drag + active value ranging from -1 to 1
  // every child container and view computes its offset from this value

  // tracking and updating a single position is necessary to get smooth springing between indices
  // otherwise there is a bit of a jank when updating an activeIndex value
  // as there will always be a slight frame delay between states
  // e.g passing a dragEnd value to a child view on drag end and runSpring in that view always means
  // there will be a slight jank, can't quite figure out a better way to achieve smooth transitions
  // without tracking and sharing one value with all views
  // it's likely there is a slight jank still, just not so noticeable
  const position = memoize(new Value(initialPosition));
  const nextPosition = memoize(new Value(initialPosition));

  const clock = memoize(new Clock());

  const swiping = memoize(new Value(0));
  const dragStart = memoize(new Value(0));
  const percentageDragged = memoize(new Value(0));
  const roundedPosition = memoize(
    cond(lessThan(position, 0), floor(position), ceil(position))
  );

  const animatedOffset = memoize(
    block([
      cond(
        eq(gestureState, State.ACTIVE),
        [
          cond(swiping, 0, [set(dragStart, position)]),

          set(swiping, 1),

          set(
            percentageDragged,
            divide(abs(add(dragValue, dragStart)), max(dimension, 1))
          ),

          set(
            nextPosition,
            cond(greaterThan(percentageDragged, threshold), [0], [nextPosition])
          ),

          set(position, sub(dragStart, divide(dragValue, dimension))),
        ],
        [
          cond(neq(roundedPosition, nextPosition), [
            cond(swiping, call([], ([]) => onChange(rootIndex))),
          ]),

          set(swiping, 0),
          set(percentageDragged, 0),

          runSpring(clock, position, nextPosition, springConfig),
        ]
      ),

      position,
    ])
  );

  const interpolatedStyle = memoize(
    mapConfigToStyle(animatedOffset, rootInterpolation)
  );

  // these are used to compute the offset of the two containers
  // e.g offset = -width or offset = width
  const leftPosition = memoize(new Value(-1));
  const rightPosition = memoize(new Value(1));

  // this crazy computation clamps the value of container translate offsets (-1 -> 0)
  // between a given range -> either -1 to 0 or 0 to 1
  const clampLeft = memoize(min(max(sub(leftPosition, animatedOffset), -1), 0));
  const clampRight = memoize(
    max(min(sub(rightPosition, animatedOffset), 1), 0)
  );

  // divide the children up into container views
  const childrenLeft = children.slice(0, rootIndex);
  const childrenRight = children.slice(rootIndex + 1);
  const childCenter = children[rootIndex];

  const numberOfScreens = Children.count(children);

  return (
    <Animated.View style={style || { flex: 1 }} onLayout={handleLayout}>
      <PanGestureHandler
        enabled={activeIndex !== rootIndex}
        onGestureEvent={handleGesture}
        onHandlerStateChange={handleStateChange}
      >
        <Animated.View style={{ flex: 1 }}>
          <Animated.View style={[StyleSheet.absoluteFillObject]}>
            <PageContainer
              dimension={dimension}
              offset={clampLeft}
              pageInterpolation={pageInterpolation}
              activeIndex={animatedIndex}
              minIndex={0}
              position={leftPosition}
              swiping={swiping}
              springConfig={springConfig}
              translateValue={translateValue}
              range={[0, rootIndex - 1]}
            >
              {childrenLeft}
            </PageContainer>

            <Animated.View
              style={[StyleSheet.absoluteFillObject, interpolatedStyle]}
            >
              {childCenter}
            </Animated.View>

            <PageContainer
              dimension={dimension}
              offset={clampRight}
              pageInterpolation={pageInterpolation}
              activeIndex={animatedIndex}
              minIndex={rootIndex + 1}
              position={rightPosition}
              swiping={swiping}
              springConfig={springConfig}
              translateValue={translateValue}
              range={[rootIndex + 1, numberOfScreens]}
            >
              {childrenRight}
            </PageContainer>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

interface iPageContainer {
  children: React.ReactNode;
  dimension: Animated.Node<number>;
  offset: Animated.Node<number>;
  activeIndex: Animated.Node<number>;
  pageInterpolation?: iPageInterpolation;
  minIndex: number;
  position: number;
  range: [number, number];
  swiping: Animated.Node<number>;
  springConfig?: Partial<SpringConfig>;
  translateValue: 'translateX' | 'translateY';
}

function PageContainer({
  children,
  dimension,
  offset,
  pageInterpolation,
  activeIndex,
  minIndex,
  position,
  swiping,
  range,
  springConfig,
  translateValue,
}: iPageContainer) {
  const translation = memoize(multiply(dimension, offset));
  const interpolatedStyle = memoize(
    mapConfigToStyle(offset, pageInterpolation)
  );

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 2 },
        { transform: [{ [translateValue]: translation }] as any },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, interpolatedStyle]}>
        <Animated.View
          style={{
            flex: 1,
          }}
        >
          {Children.map(children, (child: any, index: number) => (
            <Page
              index={minIndex + index}
              activeIndex={activeIndex}
              parentOffset={position}
              dimension={dimension}
              swiping={swiping}
              range={range}
              springConfig={springConfig}
              translateValue={translateValue}
            >
              {child}
            </Page>
          ))}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

interface iPage {
  children: React.ReactNode;
  dimension: Animated.Node<number>;
  index: number;
  parentOffset: number;
  activeIndex: Animated.Node<number>;
  range: [number, number];
  swiping: Animated.Node<number>;
  springConfig?: Partial<SpringConfig>;
  translateValue: 'translateX' | 'translateY';
}

function Page({
  children,
  dimension,
  parentOffset,
  activeIndex,
  index,
  swiping,
  range,
  springConfig,
  translateValue,
}: iPage) {
  const clock = memoize(new Clock());
  const position = memoize(new Value(0));
  const zIndex = memoize(new Value(0));

  const offset = memoize(multiply(dimension, parentOffset));

  const isActive = memoize(eq(activeIndex, index));
  // if dragging value or active value is within range of this container
  const containerIsActive = memoize(
    and(greaterOrEq(activeIndex, range[0]), lessOrEq(activeIndex, range[1]))
  );

  // these updates are primarily to keep continuity in the UI for child views
  // it will keep the last rendered view on top as it translates off screen,
  // and set all views to be collapsed into the container view with no offsets
  // when the container becomes inactive
  const nextPosition = memoize(
    block([
      // set initial position
      cond(greaterThan(diff(dimension), 0), [
        set(position, cond(isActive, 0, offset)),
      ]),

      cond(
        swiping,
        cond(
          isActive,
          [set(position, 0)],
          [set(zIndex, 0), set(position, offset)]
        )
      ),

      // if the view is active (e.g it matches activeIndex), center it back in
      // the container
      cond(
        isActive,
        [set(zIndex, 1), 0],
        [set(zIndex, 0), cond(containerIsActive, offset, set(position, 0))]
      ),
    ])
  );

  const translation = memoize(
    runSpring(clock, position, nextPosition, springConfig)
  );

  return (
    <Animated.View
      style={{
        ...StyleSheet.absoluteFillObject,
        zIndex: zIndex as any,
        transform: [{ [translateValue]: translation }] as any,
      }}
    >
      {children}
    </Animated.View>
  );
}

export { SingleStack };
