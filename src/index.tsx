import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  I18nManager,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
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
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useVector } from 'react-native-redash';
import {
  clamp,
  withDecaySpring,
  withRubberBandClamp,
  resizeImage,
} from './utils';

const rtl = I18nManager.isRTL;

const DOUBLE_TAP_SCALE = 3;
const MAX_SCALE = 6;
const SPACE_BETWEEN_IMAGES = 40;

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
  onLongPress?: () => void;
  onScaleStart?: () => void;
  onScaleEnd?: (scale: number) => void;
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
  doubleTapInterval: number;
  doubleTapScale: number;
  maxScale: number;
  pinchEnabled: boolean;
  doubleTapEnabled: boolean;
  disableTransitionOnScaledImage: boolean;
  hideAdjacentImagesOnScaledImage: boolean;
  disableVerticalSwipe: boolean;
  disableSwipeUp?: boolean;
  loop: boolean;
  onScaleChange?: (scale: number) => void;
  onScaleChangeRange?: { start: number; end: number };

  setRef: (index: number, value: ItemRef) => void;
};

const springConfig = {
  damping: 800,
  mass: 1,
  stiffness: 250,
  restDisplacementThreshold: 0.02,
  restSpeedThreshold: 4,
};

type ItemRef = { reset: (animated: boolean) => void };

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
    onLongPress,
    onPanStart,
    onScaleStart,
    onScaleEnd,
    emptySpaceWidth,
    doubleTapScale,
    doubleTapInterval,
    maxScale,
    pinchEnabled,
    doubleTapEnabled,
    disableTransitionOnScaledImage,
    hideAdjacentImagesOnScaledImage,
    disableVerticalSwipe,
    disableSwipeUp,
    loop,
    length,
    onScaleChange,
    onScaleChangeRange,
    setRef,
  }: Props<T>) => {
    const CENTER = {
      x: width / 2,
      y: height / 2,
    };

    const offset = useVector(0, 0);

    const scale = useSharedValue(1);

    const translation = useVector(0, 0);

    const origin = useVector(0, 0);

    const adjustedFocal = useVector(0, 0);

    const originalLayout = useVector(width, 0);
    const layout = useVector(width, 0);

    const isActive = useDerivedValue(() => currentIndex.value === index, [
      currentIndex,
      index,
    ]);

    useAnimatedReaction(
      () => {
        return scale.value;
      },
      (scaleReaction) => {
        if (!onScaleChange) {
          return;
        }

        if (!onScaleChangeRange) {
          runOnJS(onScaleChange)(scaleReaction);
          return;
        }

        if (
          scaleReaction > onScaleChangeRange.start &&
          scaleReaction < onScaleChangeRange.end
        ) {
          runOnJS(onScaleChange)(scaleReaction);
        }
      }
    );

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

      if (point < 0 || isNaN(point)) {
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

    const clampX = (value: number, newScale: number) => {
      'worklet';
      const newWidth = newScale * layout.x.value;
      const point = (newWidth - width) / 2;

      if (newWidth < width) {
        return 0;
      }
      return clamp(value, -point, point);
    };

    const getEdgeY = () => {
      'worklet';

      const newHeight = scale.value * layout.y.value;

      const point = (newHeight - height) / 2;

      if (isNaN(point)) {
        return [-0, 0];
      }

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

    useAnimatedReaction(
      () => {
        return {
          i: currentIndex.value,
          translateX: translateX.value,
          currentScale: scale.value,
        };
      },
      ({ i, translateX: tx, currentScale }) => {
        const translateIndex = tx / -(width + emptySpaceWidth);
        if (loop) {
          let diff = Math.abs((translateIndex % 1) - 0.5);
          if (diff > 0.5) {
            diff = 1 - diff;
          }
          if (diff > 0.48 && Math.abs(i) !== index) {
            resetValues(false);
            return;
          }
        }
        if (Math.abs(i - index) === 2 && currentScale > 1) {
          resetValues(false);
        }
      }
    );

    useEffect(() => {
      setRef(index, {
        reset: (animated: boolean) => resetValues(animated),
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index]);

    const animatedStyle = useAnimatedStyle(() => {
      const isNextForLast =
        loop &&
        isFirst &&
        currentIndex.value === length - 1 &&
        translateX.value < getPosition(length - 1);
      const isPrevForFirst =
        loop &&
        isLast &&
        currentIndex.value === 0 &&
        translateX.value > getPosition(0);
      return {
        transform: [
          {
            translateX:
              offset.x.value +
              translation.x.value -
              (isNextForLast ? getPosition(length) : 0) +
              (isPrevForFirst ? getPosition(length) : 0),
          },
          { translateY: offset.y.value + translation.y.value },
          { scale: scale.value },
        ],
      };
    });

    const setImageDimensions: RenderItemInfo<T>['setImageDimensions'] = ({
      width: w,
      height: h,
    }) => {
      originalLayout.x.value = w;
      originalLayout.y.value = h;

      const imgLayout = resizeImage({ width: w, height: h }, { width, height });
      layout.x.value = imgLayout.width;
      layout.y.value = imgLayout.height;
    };

    useEffect(() => {
      if (originalLayout.x.value === 0 && originalLayout.y.value === 0) {
        return;
      }
      setImageDimensions({
        width: originalLayout.x.value,
        height: originalLayout.y.value,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);

    const itemProps: RenderItemInfo<T> = {
      item,
      index,
      setImageDimensions,
    };

    const scaleOffset = useSharedValue(1);

    const pinchGesture = Gesture.Pinch()
      .enabled(pinchEnabled)
      .onStart(({ focalX, focalY }) => {
        'worklet';
        if (!isActive.value) return;
        if (onScaleStart) {
          runOnJS(onScaleStart)();
        }

        onStart();

        scaleOffset.value = scale.value;

        setAdjustedFocal({ focalX, focalY });

        origin.x.value = adjustedFocal.x.value;
        origin.y.value = adjustedFocal.y.value;
      })
      .onUpdate(({ scale: s, focalX, focalY, numberOfPointers }) => {
        'worklet';
        if (!isActive.value) return;
        if (numberOfPointers !== 2) return;

        const nextScale = withRubberBandClamp(
          s * scaleOffset.value,
          0.55,
          maxScale,
          [1, maxScale]
        );

        scale.value = nextScale;

        setAdjustedFocal({ focalX, focalY });

        translation.x.value =
          adjustedFocal.x.value +
          ((-1 * nextScale) / scaleOffset.value) * origin.x.value;
        translation.y.value =
          adjustedFocal.y.value +
          ((-1 * nextScale) / scaleOffset.value) * origin.y.value;
      })
      .onEnd(() => {
        'worklet';
        if (!isActive.value) return;
        if (onScaleEnd) {
          runOnJS(onScaleEnd)(scale.value);
        }
        if (scale.value < 1) {
          resetValues();
        } else {
          const sc = Math.min(scale.value, maxScale);

          const newWidth = sc * layout.x.value;
          const newHeight = sc * layout.y.value;

          const nextTransX =
            scale.value > maxScale
              ? adjustedFocal.x.value +
                ((-1 * maxScale) / scaleOffset.value) * origin.x.value
              : translation.x.value;

          const nextTransY =
            scale.value > maxScale
              ? adjustedFocal.y.value +
                ((-1 * maxScale) / scaleOffset.value) * origin.y.value
              : translation.y.value;

          const diffX = nextTransX + offset.x.value - (newWidth - width) / 2;

          if (scale.value > maxScale) {
            scale.value = withTiming(maxScale);
          }

          if (newWidth <= width) {
            translation.x.value = withTiming(0);
          } else {
            let moved;
            if (diffX > 0) {
              translation.x.value = withTiming(nextTransX - diffX);
              moved = true;
            }

            if (newWidth + diffX < width) {
              translation.x.value = withTiming(
                nextTransX + width - (newWidth + diffX)
              );
              moved = true;
            }
            if (!moved) {
              translation.x.value = withTiming(nextTransX);
            }
          }

          const diffY = nextTransY + offset.y.value - (newHeight - height) / 2;

          if (newHeight <= height) {
            translation.y.value = withTiming(-offset.y.value);
          } else {
            let moved;
            if (diffY > 0) {
              translation.y.value = withTiming(nextTransY - diffY);
              moved = true;
            }

            if (newHeight + diffY < height) {
              translation.y.value = withTiming(
                nextTransY + height - (newHeight + diffY)
              );
              moved = true;
            }
            if (!moved) {
              translation.y.value = withTiming(nextTransY);
            }
          }
        }
      });

    const isVertical = useSharedValue(false);
    const initialTranslateX = useSharedValue(0);
    const shouldClose = useSharedValue(false);
    const isMoving = useVector(0);

    const panGesture = Gesture.Pan()
      .minDistance(10)
      .maxPointers(1)
      .onBegin(() => {
        'worklet';
        if (!isActive.value) return;
        const newWidth = scale.value * layout.x.value;
        const newHeight = scale.value * layout.y.value;
        if (
          isMoving.x.value &&
          offset.x.value < (newWidth - width) / 2 - translation.x.value &&
          offset.x.value > -(newWidth - width) / 2 - translation.x.value
        ) {
          cancelAnimation(offset.x);
        }

        if (
          isMoving.y.value &&
          offset.y.value < (newHeight - height) / 2 - translation.y.value &&
          offset.y.value > -(newHeight - height) / 2 - translation.y.value
        ) {
          cancelAnimation(offset.y);
        }
      })
      .onStart(({ velocityY, velocityX }) => {
        'worklet';
        if (!isActive.value) return;

        if (onPanStart) {
          runOnJS(onPanStart)();
        }

        onStart();
        isVertical.value = Math.abs(velocityY) > Math.abs(velocityX);
        initialTranslateX.value = translateX.value;
      })
      .onUpdate(({ translationX, translationY, velocityY }) => {
        'worklet';
        if (!isActive.value) return;
        if (disableVerticalSwipe && scale.value === 1 && isVertical.value)
          return;

        const x = getEdgeX();

        if (!isVertical.value || scale.value > 1) {
          const clampedX = clamp(
            translationX,
            x[0] - offset.x.value,
            x[1] - offset.x.value
          );

          const transX = rtl
            ? initialTranslateX.value - translationX + clampedX
            : initialTranslateX.value + translationX - clampedX;

          if (
            hideAdjacentImagesOnScaledImage &&
            disableTransitionOnScaledImage
          ) {
            const disabledTransition =
              disableTransitionOnScaledImage && scale.value > 1;

            const moveX = withRubberBandClamp(
              transX,
              0.55,
              width,
              disabledTransition
                ? [getPosition(index), getPosition(index + 1)]
                : [getPosition(length - 1), 0]
            );

            if (!disabledTransition) {
              translateX.value = moveX;
            }
            if (disabledTransition) {
              translation.x.value = rtl
                ? clampedX - moveX + translateX.value
                : clampedX + moveX - translateX.value;
            } else {
              translation.x.value = clampedX;
            }
          } else {
            if (loop) {
              translateX.value = transX;
            } else {
              translateX.value = withRubberBandClamp(
                transX,
                0.55,
                width,
                disableTransitionOnScaledImage && scale.value > 1
                  ? [getPosition(index), getPosition(index + 1)]
                  : [getPosition(length - 1), 0]
              );
            }
            translation.x.value = clampedX;
          }
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
          !(scale.value === 1 && translateX.value !== getPosition()) &&
          (!disableSwipeUp || translationY >= 0)
        ) {
          translation.y.value = translationY;
        }

        if (isVertical.value && newHeight <= height) {
          const destY = translationY + velocityY * 0.2;
          shouldClose.value = disableSwipeUp
            ? destY > 220
            : Math.abs(destY) > 220;
        }
      })
      .onEnd(({ velocityX, velocityY }) => {
        'worklet';
        if (!isActive.value) return;

        const newHeight = scale.value * layout.y.value;

        const edgeX = getEdgeX();

        if (
          Math.abs(translateX.value - getPosition()) >= 0 &&
          edgeX.some((x) => x === translation.x.value + offset.x.value)
        ) {
          let snapPoints = [index - 1, index, index + 1]
            .filter((_, y) => {
              if (loop) return true;

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

          let snapTo = snapPoint(
            translateX.value,
            rtl ? -velocityX : velocityX,
            snapPoints
          );

          const nextIndex = getIndexFromPosition(snapTo);

          if (currentIndex.value !== nextIndex) {
            if (loop) {
              if (nextIndex === length) {
                currentIndex.value = 0;
                translateX.value = translateX.value - getPosition(length);
                snapTo = 0;
              } else if (nextIndex === -1) {
                currentIndex.value = length - 1;
                translateX.value = translateX.value + getPosition(length);
                snapTo = getPosition(length - 1);
              } else {
                currentIndex.value = nextIndex;
              }
            } else {
              currentIndex.value = nextIndex;
            }
          }

          translateX.value = withSpring(snapTo, springConfig);
        } else {
          const newWidth = scale.value * layout.x.value;

          isMoving.x.value = 1;
          offset.x.value = withDecaySpring(
            {
              velocity: velocityX,
              clamp: [
                -(newWidth - width) / 2 - translation.x.value,
                (newWidth - width) / 2 - translation.x.value,
              ],
            },
            () => {
              'worklet';
              isMoving.x.value = 0;
            }
          );
        }

        if (onSwipeToClose && shouldClose.value) {
          offset.y.value = withDecay({
            velocity: velocityY,
          });
          runOnJS(onSwipeToClose)();
          return;
        }

        if (newHeight > height) {
          isMoving.y.value = 1;
          offset.y.value = withDecaySpring(
            {
              velocity: velocityY,
              clamp: [
                -(newHeight - height) / 2 - translation.y.value,
                (newHeight - height) / 2 - translation.y.value,
              ],
            },
            () => {
              'worklet';
              isMoving.y.value = 0;
            }
          );
        } else {
          const diffY =
            translation.y.value + offset.y.value - (newHeight - height) / 2;

          if (newHeight <= height && diffY !== height - diffY - newHeight) {
            const moveTo = diffY - (height - newHeight) / 2;

            translation.y.value = withTiming(translation.y.value - moveTo);
          }
        }
      });

    const interruptedScroll = useSharedValue(false);

    const tapGesture = Gesture.Tap()
      .enabled(!!onTap)
      .numberOfTaps(1)
      .maxDistance(10)
      .onBegin(() => {
        'worklet';
        if (isMoving.x.value || isMoving.y.value) {
          interruptedScroll.value = true;
        }
      })
      .onEnd(() => {
        'worklet';
        if (!isActive.value) return;
        if (onTap && !interruptedScroll.value) {
          runOnJS(onTap)();
        }
        interruptedScroll.value = false;
      });

    const doubleTapGesture = Gesture.Tap()
      .enabled(doubleTapEnabled)
      .numberOfTaps(2)
      .maxDelay(doubleTapInterval)
      .onEnd(({ x, y, numberOfPointers }) => {
        'worklet';
        if (!isActive.value) return;
        if (numberOfPointers !== 1) return;
        if (onTap && interruptedScroll.value) {
          interruptedScroll.value = false;
          if (onTap) {
            runOnJS(onTap)();
          }
          return;
        }
        if (onDoubleTap) {
          runOnJS(onDoubleTap)();
        }

        if (scale.value === 1) {
          scale.value = withTiming(doubleTapScale);

          setAdjustedFocal({ focalX: x, focalY: y });

          offset.x.value = withTiming(
            clampX(
              adjustedFocal.x.value +
                -1 * doubleTapScale * adjustedFocal.x.value,
              doubleTapScale
            )
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
      });

    const longPressGesture = Gesture.LongPress()
      .enabled(!!onLongPress)
      .maxDistance(10)
      .onStart(() => {
        'worklet';
        if (interruptedScroll.value) {
          interruptedScroll.value = false;
          return;
        }
        if (onLongPress) {
          runOnJS(onLongPress)();
        }
      });

    return (
      <GestureDetector
        gesture={Gesture.Race(
          Gesture.Simultaneous(
            longPressGesture,
            Gesture.Race(panGesture, pinchGesture)
          ),
          Gesture.Exclusive(doubleTapGesture, tapGesture)
        )}
      >
        <View style={{ width, height }}>
          <Animated.View style={[{ width, height }, animatedStyle]}>
            {renderItem(itemProps)}
          </Animated.View>
        </View>
      </GestureDetector>
    );
  }
);

export type GalleryRef = {
  setIndex: (newIndex: number, animated?: boolean) => void;
  reset: (animated?: boolean) => void;
};

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
  doubleTapInterval?: number;
  maxScale?: number;
  style?: ViewStyle;
  containerDimensions?: { width: number; height: number };
  pinchEnabled?: boolean;
  doubleTapEnabled?: boolean;
  disableTransitionOnScaledImage?: boolean;
  hideAdjacentImagesOnScaledImage?: boolean;
  disableVerticalSwipe?: boolean;
  disableSwipeUp?: boolean;
  loop?: boolean;
  onScaleChange?: (scale: number) => void;
  onScaleChangeRange?: { start: number; end: number };
};

const GalleryComponent = <T extends any>(
  {
    data,
    renderItem = defaultRenderImage,
    initialIndex = 0,
    numToRender = 5,
    emptySpaceWidth = SPACE_BETWEEN_IMAGES,
    doubleTapScale = DOUBLE_TAP_SCALE,
    doubleTapInterval = 500,
    maxScale = MAX_SCALE,
    pinchEnabled = true,
    doubleTapEnabled = true,
    disableTransitionOnScaledImage = false,
    hideAdjacentImagesOnScaledImage = false,
    onIndexChange,
    style,
    keyExtractor,
    containerDimensions,
    disableVerticalSwipe,
    disableSwipeUp = false,
    loop = false,
    onScaleChange,
    onScaleChangeRange,
    ...eventsCallbacks
  }: GalleryProps<T>,
  ref: GalleryReactRef
) => {
  const windowDimensions = useWindowDimensions();
  const dimensions = containerDimensions || windowDimensions;

  const isLoop = loop && data?.length > 1;

  const [index, setIndex] = useState(initialIndex);

  const refs = useRef<ItemRef[]>([]);

  const setRef = useCallback((itemIndex: number, value: ItemRef) => {
    refs.current[itemIndex] = value;
  }, []);

  const translateX = useSharedValue(
    initialIndex * -(dimensions.width + emptySpaceWidth)
  );

  const currentIndex = useSharedValue(initialIndex);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rtl ? -translateX.value : translateX.value }],
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
    (newIndex) => runOnJS(changeIndex)(newIndex),
    [currentIndex, changeIndex]
  );

  useEffect(() => {
    translateX.value = index * -(dimensions.width + emptySpaceWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions.width]);

  useImperativeHandle(ref, () => ({
    setIndex(newIndex: number, animated?: boolean) {
      refs.current?.[index].reset(false);
      setIndex(newIndex);
      currentIndex.value = newIndex;
      if (animated) {
        translateX.value = withSpring(
          newIndex * -(dimensions.width + emptySpaceWidth),
          springConfig
        );
      } else {
        translateX.value = newIndex * -(dimensions.width + emptySpaceWidth);
      }
    },
    reset(animated = false) {
      refs.current?.forEach((itemRef) => itemRef.reset(animated));
    },
  }));

  useEffect(() => {
    if (index >= data.length) {
      const newIndex = data.length - 1;
      setIndex(newIndex);
      currentIndex.value = newIndex;
      translateX.value = newIndex * -(dimensions.width + emptySpaceWidth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.length, dimensions.width]);

  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      <Animated.View style={[styles.rowContainer, animatedStyle]}>
        {data.map((item: any, i) => {
          const isFirst = i === 0;

          const outOfLoopRenderRange =
            !isLoop ||
            (Math.abs(i - index) < data.length - (numToRender - 1) / 2 &&
              Math.abs(i - index) > (numToRender - 1) / 2);

          const hidden =
            Math.abs(i - index) > (numToRender - 1) / 2 && outOfLoopRenderRange;

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
                index === i ? styles.activeItem : styles.inactiveItem,
              ]}
            >
              {hidden ? null : (
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
                    doubleTapInterval,
                    maxScale,
                    pinchEnabled,
                    doubleTapEnabled,
                    disableTransitionOnScaledImage,
                    hideAdjacentImagesOnScaledImage,
                    disableVerticalSwipe,
                    disableSwipeUp,
                    loop: isLoop,
                    onScaleChange,
                    onScaleChangeRange,
                    setRef,
                    ...eventsCallbacks,
                    ...dimensions,
                  }}
                />
              )}
            </View>
          );
        })}
      </Animated.View>
    </GestureHandlerRootView>
  );
};

const Gallery = React.forwardRef(GalleryComponent) as <T extends any>(
  p: GalleryProps<T> & { ref?: GalleryReactRef }
) => React.ReactElement;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  rowContainer: { flex: 1, flexDirection: 'row' },
  activeItem: { zIndex: 1 },
  inactiveItem: { zIndex: 0 },
});

export default Gallery;
