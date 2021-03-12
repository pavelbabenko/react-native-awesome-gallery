import React, { useCallback, useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  withDecay,
  useAnimatedReaction,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import {
  GestureEvent,
  PanGestureHandler,
  PanGestureHandlerEventPayload,
  PinchGestureHandler,
  PinchGestureHandlerEventPayload,
  TapGestureHandler,
  TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { useVector } from 'react-native-redash';
import { clamp, withDecaySpring, withRubberBandClamp } from './utils';

const DOUBLE_TAP_SCALE = 3;
const MAX_SCALE = 6;
const SPACE_BETWEEN_IMAGES = 40;

const useRefs = () => {
  const pan = useRef();
  const tap = useRef();
  const doubleTap = useRef();
  const pinch = useRef<PinchGestureHandler>();

  return {
    pan,
    tap,
    doubleTap,
    pinch,
  };
};

type Dimensions = {
  height: number;
  width: number;
};

export const snapPoint = (
  value: number,
  velocity: number,
  points: ReadonlyArray<number>
): number => {
  'worklet';
  const point = value + 0.25 * velocity;
  const deltas = points.map((p) => Math.abs(point - p));
  const minDelta = Math.min.apply(null, deltas);
  return points.filter((p) => Math.abs(point - p) === minDelta)[0];
};

export type RenderItemInfo<T> = {
  index: number;
  item: T;
  setImageDimensions: (imageDimensions: Dimensions) => void;
};

const defaultRenderImage = ({
  item,
  setImageDimensions,
}: RenderItemInfo<any>) => {
  return (
    <Image
      onLoad={(e) => {
        const { height: h, width: w } = e.nativeEvent.source;
        setImageDimensions({ height: h, width: w });
      }}
      source={{ uri: item }}
      resizeMode="contain"
      style={StyleSheet.absoluteFillObject}
    />
  );
};

type EventsCallbacks = {
  onSwipeToClose?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onScaleStart?: () => void;
  onPanStart?: () => void;
};

type RenderItem<T> = (
  imageInfo: RenderItemInfo<T>
) => React.ReactElement | null;

type Props<T> = EventsCallbacks & {
  item: T;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  translateX: Animated.SharedValue<number>;
  currentProgress: Animated.SharedValue<number>;
  currentIndex: Animated.SharedValue<number>;
  renderItem: RenderItem<T>;
  width: number;
  height: number;
  length: number;

  emptySpaceWidth: number;
  doubleTapScale: number;
  maxScale: number;
};

const ResizableImage = React.memo(
  <T extends any>({
    item,
    translateX,
    index,
    isFirst,
    isLast,
    currentProgress,
    currentIndex,
    renderItem,
    width,
    height,
    onSwipeToClose,
    onTap,
    onDoubleTap,
    onPanStart,
    onScaleStart,
    emptySpaceWidth,
    doubleTapScale,
    maxScale,
    length,
  }: Props<T>) => {
    const CENTER = {
      x: width / 2,
      y: height / 2,
    };

    const { pinch, tap, doubleTap, pan } = useRefs();

    const pinchActive = useSharedValue(false);

    const panActive = useSharedValue(false);

    const offset = useVector(0, 0);

    const scale = useSharedValue(1);

    const translation = useVector(0, 0);

    const origin = useVector(0, 0);

    const adjustedFocal = useVector(0, 0);

    const layout = useVector(width, 0);

    const isActive = useDerivedValue(() => currentIndex.value === index);

    const setAdjustedFocal = ({
      focalX,
      focalY,
    }: Record<'focalX' | 'focalY', number>) => {
      'worklet';

      adjustedFocal.x.value = focalX - (CENTER.x + offset.x.value);
      adjustedFocal.y.value = focalY - (CENTER.y + offset.y.value);
    };

    const resetValues = (animated = true) => {
      'worklet';

      scale.value = animated ? withTiming(1) : 1;
      offset.x.value = animated ? withTiming(0) : 0;
      offset.y.value = animated ? withTiming(0) : 0;
      translation.x.value = animated ? withTiming(0) : 0;
      translation.y.value = animated ? withTiming(0) : 0;
    };

    const getEdgeX = () => {
      'worklet';
      const newWidth = scale.value * layout.x.value;

      const point = (newWidth - width) / 2;

      return [-point, point];
    };

    const clampY = (value: number, newScale: number) => {
      'worklet';
      const newHeight = newScale * layout.y.value;
      const point = (newHeight - height) / 2;

      if (newHeight < height) {
        return 0;
      }
      return clamp(value, -point, point);
    };

    const getEdgeY = () => {
      'worklet';

      const newHeight = scale.value * layout.y.value;

      const point = (newHeight - height) / 2;

      return [-point, point];
    };

    const onStart = () => {
      'worklet';

      offset.x.value = offset.x.value + translation.x.value;
      offset.y.value = offset.y.value + translation.y.value;

      translation.x.value = 0;
      translation.y.value = 0;
    };

    const getPosition = (i?: number) => {
      'worklet';

      return (
        -(width + emptySpaceWidth) * (typeof i !== 'undefined' ? i : index)
      );
    };

    const gestureHandler = useAnimatedGestureHandler<
      GestureEvent<PinchGestureHandlerEventPayload>,
      {
        scaleOffset: number;
      }
    >(
      {
        onStart: ({ focalX, focalY }, ctx) => {
          if (!isActive.value) return;
          if (panActive.value) return;

          pinchActive.value = true;

          if (onScaleStart) {
            runOnJS(onScaleStart)();
          }

          onStart();

          ctx.scaleOffset = scale.value;

          setAdjustedFocal({ focalX, focalY });

          origin.x.value = adjustedFocal.x.value;
          origin.y.value = adjustedFocal.y.value;
        },
        onActive: ({ scale: s, focalX, focalY, numberOfPointers }, ctx) => {
          if (!isActive.value) return;
          if (numberOfPointers !== 2) return;
          if (panActive.value) return;

          let nextScale = s * ctx.scaleOffset;

          if (nextScale < 1) {
            const diff = 1 - nextScale;
            nextScale = nextScale + diff / 2;
          } else if (nextScale > maxScale) {
            nextScale = maxScale;
          }

          scale.value = nextScale;

          setAdjustedFocal({ focalX, focalY });

          translation.x.value =
            adjustedFocal.x.value +
            ((-1 * nextScale) / ctx.scaleOffset) * origin.x.value;
          translation.y.value =
            adjustedFocal.y.value +
            ((-1 * nextScale) / ctx.scaleOffset) * origin.y.value;
        },
        onEnd: () => {
          if (!isActive.value) return;

          pinchActive.value = false;

          if (scale.value < 1) {
            resetValues();
          } else {
            const newWidth = scale.value * layout.x.value;
            const newHeight = scale.value * layout.y.value;

            const diffX =
              translation.x.value + offset.x.value - (newWidth - width) / 2;

            if (diffX > 0) {
              translation.x.value = withTiming(translation.x.value - diffX);
            }

            if (newWidth + diffX < width) {
              translation.x.value = withTiming(
                translation.x.value + width - (newWidth + diffX)
              );
            }

            const diffY =
              translation.y.value + offset.y.value - (newHeight - height) / 2;

            if (newHeight < height && diffY !== height - diffY - newHeight) {
              const moveTo = diffY - (height - newHeight) / 2;

              translation.y.value = withTiming(translation.y.value - moveTo);
            } else {
              if (newHeight > height) {
                const edgeY = getEdgeY();
                const nextTranslation = offset.y.value + translation.y.value;
                if (nextTranslation > edgeY[1]) {
                  translation.y.value = withTiming(translation.y.value - diffY);
                } else if (nextTranslation < edgeY[0]) {
                  translation.y.value = withTiming(
                    translation.y.value - (diffY + newHeight - height)
                  );
                }
              }
            }
          }
        },
      },
      [layout.x, layout.y]
    );

    const singleTapHandler = useAnimatedGestureHandler<
      GestureEvent<TapGestureHandlerEventPayload>
    >({
      onActive: () => {
        if (onTap) {
          runOnJS(onTap)();
        }
      },
    });

    const doubleTapHandler = useAnimatedGestureHandler<
      GestureEvent<TapGestureHandlerEventPayload>
    >({
      onActive: ({ x, y, numberOfPointers }) => {
        if (!isActive.value) return;
        if (numberOfPointers !== 1) return;

        if (onDoubleTap) {
          runOnJS(onDoubleTap)();
        }

        if (scale.value === 1) {
          scale.value = withTiming(doubleTapScale);

          setAdjustedFocal({ focalX: x, focalY: y });

          offset.x.value = withTiming(
            adjustedFocal.x.value + -1 * doubleTapScale * adjustedFocal.x.value
          );
          offset.y.value = withTiming(
            clampY(
              adjustedFocal.y.value +
                -1 * doubleTapScale * adjustedFocal.y.value,
              doubleTapScale
            )
          );
        } else {
          resetValues();
        }
      },
    });

    const onPanEnd = (velocityX: number) => {
      'worklet';

      if (Math.abs(translateX.value - getPosition()) > 0) {
        const snapTo = snapPoint(
          translateX.value,
          velocityX,
          [index - 1, index, index + 1]
            .filter((_, y) => (isFirst ? y !== 0 : isLast ? y !== 2 : true))
            .map((i) => getPosition(i))
        );

        if (Math.abs(snapTo - translateX.value) <= width) {
          translateX.value = withSpring(snapTo, {
            damping: 800,
            mass: 1,
            stiffness: 250,
            restDisplacementThreshold: 0.02,
            restSpeedThreshold: 4,
          });
        } else {
          translateX.value = getPosition();
        }
      }
    };

    const panHandler = useAnimatedGestureHandler<
      GestureEvent<PanGestureHandlerEventPayload>,
      {
        scaleOffset: number;
        initialTranslateX: number;
        isVertical: boolean;
        shouldClose: boolean;
      }
    >(
      {
        onStart: ({ velocityY, velocityX }, ctx) => {
          if (!isActive.value) return;
          if (pinchActive.value) return;

          panActive.value = true;

          if (onPanStart) {
            runOnJS(onPanStart)();
          }

          onStart();
          ctx.isVertical = Math.abs(velocityY) > Math.abs(velocityX);
          ctx.initialTranslateX = translateX.value;
        },
        onActive: ({ translationX, translationY, velocityY }, ctx) => {
          if (!isActive.value) return;
          if (pinchActive.value) return;

          const x = getEdgeX();

          if (!ctx.isVertical || scale.value > 1) {
            const clampedX = clamp(
              translationX,
              x[0] - offset.x.value,
              x[1] - offset.x.value
            );

            translateX.value = -withRubberBandClamp(
              (ctx.initialTranslateX + translationX - clampedX) * -1,
              0.55,
              width,
              [0, width * length]
            );
            translation.x.value = clampedX;
          }

          const newHeight = scale.value * layout.y.value;

          const edgeY = getEdgeY();

          if (newHeight > height) {
            translation.y.value = withRubberBandClamp(
              translationY,
              0.55,
              newHeight,
              [edgeY[0] - offset.y.value, edgeY[1] - offset.y.value]
            );
          } else if (
            !(scale.value === 1 && translateX.value !== getPosition())
          ) {
            translation.y.value = translationY;
          }

          if (ctx.isVertical && newHeight < height) {
            ctx.shouldClose = Math.abs(translationY + velocityY * 0.2) > 220;
          }
        },
        onEnd: ({ velocityX, velocityY }, ctx) => {
          if (!isActive.value) return;

          panActive.value = false;

          const newWidth = scale.value * layout.x.value;
          const newHeight = scale.value * layout.y.value;

          onPanEnd(velocityX);

          if (translateX.value === getPosition()) {
            offset.x.value = withDecaySpring({
              velocity: velocityX,
              clamp: [
                -(newWidth - width) / 2 - translation.x.value,
                (newWidth - width) / 2 - translation.x.value,
              ],
            });
          }

          if (onSwipeToClose && ctx.shouldClose) {
            offset.y.value = withDecay({
              velocity: velocityY,
            });
            runOnJS(onSwipeToClose)();
            return;
          }

          if (newHeight > height) {
            offset.y.value = withDecaySpring({
              velocity: velocityY,
              clamp: [
                -(newHeight - height) / 2 - translation.y.value,
                (newHeight - height) / 2 - translation.y.value,
              ],
            });
          } else {
            const diffY =
              translation.y.value + offset.y.value - (newHeight - height) / 2;

            if (newHeight < height && diffY !== height - diffY - newHeight) {
              const moveTo = diffY - (height - newHeight) / 2;

              translation.y.value = withTiming(translation.y.value - moveTo);
            }
          }
        },
        onFail: ({ velocityX }) => {
          onPanEnd(velocityX);
        },
        onCancel: ({ velocityX }) => {
          onPanEnd(velocityX);
        },
      },
      [layout.x, layout.y]
    );

    useAnimatedReaction(
      () => {
        if (
          Math.abs(currentProgress.value - index) < 0.2 &&
          currentIndex.value !== index
        ) {
          currentIndex.value = index;
        }
        return {
          progress: currentProgress.value,
          currentScale: scale.value,
        };
      },
      ({ progress, currentScale }) => {
        if (Math.abs(progress - index) === 2 && currentScale > 1) {
          resetValues(false);
        }
      }
    );

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: offset.x.value + translation.x.value },
          { translateY: offset.y.value + translation.y.value },
          { scale: scale.value },
        ],
      };
    });

    const setImageDimensions: RenderItemInfo<T>['setImageDimensions'] = ({
      width: w,
      height: h,
    }) => {
      layout.y.value = (h * width) / w;
    };

    const itemProps: RenderItemInfo<T> = {
      item,
      index,
      setImageDimensions,
    };

    return (
      <PanGestureHandler ref={pan} onGestureEvent={panHandler} minDist={10}>
        <Animated.View style={[{ width, height }]}>
          <PinchGestureHandler
            ref={pinch}
            simultaneousHandlers={[pan]}
            onGestureEvent={gestureHandler}
          >
            <Animated.View style={{ width, height }}>
              <TapGestureHandler
                ref={doubleTap}
                onGestureEvent={singleTapHandler}
                simultaneousHandlers={[pan, pinch]}
                waitFor={tap}
              >
                <Animated.View style={[{ width, height }, animatedStyle]}>
                  <TapGestureHandler
                    ref={tap}
                    onGestureEvent={doubleTapHandler}
                    numberOfTaps={2}
                  >
                    <Animated.View style={{ width, height }}>
                      {renderItem(itemProps)}
                    </Animated.View>
                  </TapGestureHandler>
                </Animated.View>
              </TapGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    );
  }
);

type GalleryProps<T> = EventsCallbacks & {
  data: T[];

  renderItem?: RenderItem<T>;
  keyExtractor?: (item: T, index: number) => string | number;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  numToRender?: number;
  emptySpaceWidth?: number;
  doubleTapScale?: number;
  maxScale?: number;
  style?: ViewStyle;
};

const Gallery = <T extends any>({
  data,
  renderItem = defaultRenderImage,
  initialIndex = 0,
  numToRender = 5,
  emptySpaceWidth = SPACE_BETWEEN_IMAGES,
  doubleTapScale = DOUBLE_TAP_SCALE,
  maxScale = MAX_SCALE,
  onIndexChange,
  style,
  keyExtractor,
  ...eventsCallbacks
}: GalleryProps<T>) => {
  const dimensions = useWindowDimensions();

  const [index, setIndex] = useState(initialIndex);

  const translateX = useSharedValue(
    initialIndex * -(dimensions.width + emptySpaceWidth)
  );

  const currentIndex = useSharedValue(initialIndex);

  const currentProgress = useDerivedValue(
    () => Math.abs(-translateX.value) / (dimensions.width + emptySpaceWidth),
    [translateX.value]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const changeIndex = useCallback(
    (newIndex) => {
      onIndexChange?.(newIndex);
      setIndex(newIndex);
    },
    [onIndexChange, setIndex]
  );

  useAnimatedReaction(
    () => currentIndex.value,
    (newIndex) => {
      if (newIndex !== initialIndex) {
        runOnJS(changeIndex)(newIndex);
      }
    }
  );

  return (
    <View style={[{ flex: 1, backgroundColor: 'black' }, style]}>
      <Animated.View style={[{ flex: 1, flexDirection: 'row' }, animatedStyle]}>
        {data.map((item: any, i) => {
          const isFirst = i === 0;

          return (
            <View
              key={
                keyExtractor
                  ? keyExtractor(item, i)
                  : item.id || item.key || item._id || item
              }
              style={[
                dimensions,
                isFirst ? {} : { marginLeft: emptySpaceWidth },
              ]}
            >
              {Math.abs(i - index) > (numToRender - 1) / 2 ? null : (
                // @ts-ignore
                <ResizableImage
                  {...{
                    translateX,
                    item,
                    currentProgress,
                    currentIndex,
                    index: i,
                    isFirst,
                    isLast: i === data.length - 1,
                    length: data.length,
                    renderItem,
                    emptySpaceWidth,
                    doubleTapScale,
                    maxScale,
                    ...eventsCallbacks,
                    ...dimensions,
                  }}
                />
              )}
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
};

export default Gallery;
