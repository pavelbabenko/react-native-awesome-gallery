import React, {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Image,
  Platform,
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
  cancelAnimation,
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

const isAndroid = Platform.OS === 'android';

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
  currentIndex: Animated.SharedValue<number>;
  renderItem: RenderItem<T>;
  width: number;
  height: number;
  length: number;

  emptySpaceWidth: number;
  doubleTapScale: number;
  maxScale: number;
  disableTransitionOnScaledImage: boolean;
};

const ResizableImage = React.memo(
  <T extends any>({
    item,
    translateX,
    index,
    isFirst,
    isLast,
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
    disableTransitionOnScaledImage,
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

      if (point < 0) {
        return [-0, 0];
      }

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

      cancelAnimation(translateX);

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

    const getIndexFromPosition = (position: number) => {
      'worklet';

      return Math.round(position / -(width + emptySpaceWidth));
    };

    const gestureHandler = useAnimatedGestureHandler<
      GestureEvent<PinchGestureHandlerEventPayload>,
      {
        scaleOffset: number;
        androidPinchActivated: boolean;
      }
    >(
      {
        onStart: ({ focalX, focalY }, ctx) => {
          if (!isActive.value) return;
          if (panActive.value && !isAndroid) return;

          pinchActive.value = true;

          if (onScaleStart) {
            runOnJS(onScaleStart)();
          }

          if (isAndroid) {
            ctx.androidPinchActivated = false;
          }

          onStart();

          ctx.scaleOffset = scale.value;

          setAdjustedFocal({ focalX, focalY });

          origin.x.value = adjustedFocal.x.value;
          origin.y.value = adjustedFocal.y.value;
        },
        onActive: ({ scale: s, focalX, focalY, numberOfPointers }, ctx) => {
          if (!isActive.value) return;
          if (numberOfPointers !== 2 && !isAndroid) return;
          if (panActive.value && !isAndroid) return;

          if (!ctx.androidPinchActivated && isAndroid) {
            setAdjustedFocal({ focalX, focalY });

            origin.x.value = adjustedFocal.x.value;
            origin.y.value = adjustedFocal.y.value;

            ctx.androidPinchActivated = true;
          }

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

            if (offset.x.value <= width) {
              translation.x.value = withTiming(0);
            } else {
              if (diffX > 0) {
                translation.x.value = withTiming(translation.x.value - diffX);
              }

              if (newWidth + diffX < width) {
                translation.x.value = withTiming(
                  translation.x.value + width - (newWidth + diffX)
                );
              }
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
          if (pinchActive.value && !isAndroid) return;

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
          if (pinchActive.value && !isAndroid) return;

          const x = getEdgeX();

          if (!ctx.isVertical || scale.value > 1) {
            const clampedX = clamp(
              translationX,
              x[0] - offset.x.value,
              x[1] - offset.x.value
            );

            translateX.value = withRubberBandClamp(
              ctx.initialTranslateX + translationX - clampedX,
              0.55,
              width,
              disableTransitionOnScaledImage && scale.value > 1
                ? [getPosition(index), getPosition(index + 1)]
                : [getPosition(length - 1), 0]
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

          if (ctx.isVertical && newHeight <= height) {
            ctx.shouldClose = Math.abs(translationY + velocityY * 0.2) > 220;
          }
        },
        onFinish: ({ velocityX, velocityY }, ctx) => {
          if (!isActive.value) return;

          panActive.value = false;

          const newHeight = scale.value * layout.y.value;

          const edgeX = getEdgeX();

          if (
            Math.abs(translateX.value - getPosition()) > 0 &&
            edgeX.some((x) => x === translation.x.value + offset.x.value)
          ) {
            let snapPoints = [index - 1, index, index + 1]
              .filter((_, y) => {
                if (y === 0) {
                  return !isFirst;
                }
                if (y === 2) {
                  return !isLast;
                }
                return true;
              })
              .map((i) => getPosition(i));

            if (disableTransitionOnScaledImage && scale.value > 1) {
              snapPoints = [getPosition(index)];
            }

            const snapTo = snapPoint(translateX.value, velocityX, snapPoints);

            const nextIndex = getIndexFromPosition(snapTo);

            if (currentIndex.value !== nextIndex) {
              currentIndex.value = nextIndex;
            }

            translateX.value = withSpring(snapTo, {
              damping: 800,
              mass: 1,
              stiffness: 250,
              restDisplacementThreshold: 0.02,
              restSpeedThreshold: 4,
            });
          } else {
            const newWidth = scale.value * layout.x.value;

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

            if (newHeight <= height && diffY !== height - diffY - newHeight) {
              const moveTo = diffY - (height - newHeight) / 2;

              translation.y.value = withTiming(translation.y.value - moveTo);
            }
          }
        },
      },
      [layout.x, layout.y]
    );

    useAnimatedReaction(
      () => {
        return {
          i: currentIndex.value,
          currentScale: scale.value,
        };
      },
      ({ i, currentScale }) => {
        if (Math.abs(i - index) === 2 && currentScale > 1) {
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
      const imageHeight = Math.min((h * width) / w, height);
      layout.y.value = imageHeight;
      if (imageHeight === height) {
        layout.x.value = (w * height) / h;
      }
    };

    const itemProps: RenderItemInfo<T> = {
      item,
      index,
      setImageDimensions,
    };

    return (
      <PanGestureHandler
        ref={pan}
        onGestureEvent={panHandler}
        minDist={10}
        minPointers={1}
        maxPointers={1}
      >
        <Animated.View style={[{ width, height }]}>
          <PinchGestureHandler
            ref={pinch}
            simultaneousHandlers={[pan]}
            onGestureEvent={gestureHandler}
            minPointers={2}
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

export type GalleryRef = { setPage: (index: number) => void };

export type GalleryReactRef = React.Ref<GalleryRef>;

type GalleryProps<T> = EventsCallbacks & {
  ref?: GalleryReactRef;
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
  containerDimensions?: { width: number; height: number };
  disableTransitionOnScaledImage?: boolean;
};

const GalleryComponent = <T extends any>(
  {
    data,
    renderItem = defaultRenderImage,
    initialIndex = 0,
    numToRender = 5,
    emptySpaceWidth = SPACE_BETWEEN_IMAGES,
    doubleTapScale = DOUBLE_TAP_SCALE,
    maxScale = MAX_SCALE,
    disableTransitionOnScaledImage = false,
    onIndexChange,
    style,
    keyExtractor,
    containerDimensions,
    ...eventsCallbacks
  }: GalleryProps<T>,
  ref: GalleryReactRef
) => {
  const windowDimensions = useWindowDimensions();
  const dimensions = containerDimensions || windowDimensions;

  const [index, setIndex] = useState(initialIndex);

  const translateX = useSharedValue(
    initialIndex * -(dimensions.width + emptySpaceWidth)
  );

  const currentIndex = useSharedValue(initialIndex);

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

  useImperativeHandle(ref, () => ({
    setPage(selectedIndex: number) {
      setIndex(selectedIndex);
      currentIndex.value = selectedIndex;
      translateX.value = selectedIndex * -(dimensions.width + emptySpaceWidth);
    },
  }));

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
                    currentIndex,
                    index: i,
                    isFirst,
                    isLast: i === data.length - 1,
                    length: data.length,
                    renderItem,
                    emptySpaceWidth,
                    doubleTapScale,
                    maxScale,
                    disableTransitionOnScaledImage,
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

const Gallery = React.forwardRef(GalleryComponent) as <T extends any>(
  p: GalleryProps<T> & { ref?: GalleryReactRef }
) => React.ReactElement;

export default Gallery;
