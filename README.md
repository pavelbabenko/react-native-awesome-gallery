[![npm version](https://badge.fury.io/js/react-native-awesome-gallery.svg)](https://badge.fury.io/js/react-native-awesome-gallery)

<div style="text-align: center;">
  <h1 align="center">React Native Awesome Gallery</h1>
  <h3 align="center">Photos gallery powered by Reanimated v2 and react-native-gesture-handler</h3>
</div>

<table style='width:100%;'>
  <tr>
    <td><h4 align='center'>Basic usage</h4></td>
     <td><h4 align='center'>With toolbar</h4></td>
     <td><h4 align='center'>Loop</h4></td>
  </tr>
  <tr>
    <td><img width="240" height="480" src="example-basic.gif" alt="Gallery basic usage"></td>
    <td><img width="240" height="480" src="example-toolbar.gif" alt="Gallery with toolbar"></td>
    <td><img width="240" height="480" src="example-loop.gif" alt="Gallery loop"></td>
  </tr>
 </table>

## Supported features

- Zoom to scale
- Double tap to scale
- Native iOS feeling (rubber effect, decay animation on pan gesture)
- RTL support
- Fully customizable
- Both orientations (portrait + landscape)
- Infinite list
- Supports both iOS and Android.

## Installation

> **_Note:_** Starting from v0.3.0 using Gesture Handler v2 is required

First you have to follow installation instructions of [Reanimated v2](https://docs.swmansion.com/react-native-reanimated/) and [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/)

```sh
yarn add react-native-awesome-gallery
```

Expo is supported since SDK 40. More information [here](https://docs.expo.io/versions/latest/sdk/reanimated/)

## Usage

Check out an [example folder](./example) for example with Shared transition + `FastImage`

```js
import Gallery from 'react-native-awesome-gallery';

// ...

const images = ['https://image1', 'https://image2'];

return (
  <Gallery
    data={images}
    onIndexChange={(newIndex) => {
      console.log(newIndex);
    }}
  />
);
```

## Props

| Prop                             | Description                                                                                                                                                                     | Type                                                                                             | Default                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| data                             | Array of items to render                                                                                                                                                        | `T[]`                                                                                            | `undefined`                                                            |
| renderItem?                      | Callback func which can be used to render custom image component, e.g `FastImage`. NOTE: You have to call `setImageDimensions({width, height})` parameter after image is loaded | `(renderItemInfo: {item: T, index: number, setImageDimensions: Function}) => React.ReactElement` | `undefined`                                                            |
| keyExtractor?                    | Callback func which provides unique keys for items                                                                                                                              | `(item: T, index: number) => string or number`                                                   | Takes `id` or `key` or `_id` from `Item`, otherwise puts `Item` as key |
| initialIndex?                    | The initial image index                                                                                                                                                         | `number`                                                                                         | `0`                                                                    |
| onIndexChange?                   | Is called when index of active item is changed                                                                                                                                  | `(newIndex: number) => void`                                                                     | `undefined`                                                            |
| numToRender?                     | Amount of items rendered in gallery simultaneously                                                                                                                              | `number`                                                                                         | `5`                                                                    |
| emptySpaceWidth?                 | Width of empty space between items                                                                                                                                              | `number`                                                                                         | `30`                                                                   |
| doubleTapScale?                  | Image scale when double tap is fired                                                                                                                                            | `number`                                                                                         | `3`                                                                    |
| doubleTapInterval?               | Time in milliseconds between single and double tap events                                                                                                                       | `number`                                                                                         | `500`                                                                  |
| maxScale?                        | Maximum scale user can set with gesture                                                                                                                                         | `number`                                                                                         | `6`                                                                    |
| pinchEnabled?                    | Is pinch gesture enabled                                                                                                                                                        | `boolean`                                                                                        | `true`                                                                 |
| disableTransitionOnScaledImage?  | Disables transition to next/previous image when scale > 1                                                                                                                       | `boolean`                                                                                        | `false`                                                                |
| hideAdjacentImagesOnScaledImage? | Hides next and previous images when scale > 1                                                                                                                                   | `boolean`                                                                                        | `false`                                                                |
| disableVerticalSwipe?            | Disables vertical swipe when scale == 1                                                                                                                                         | `boolean`                                                                                        | `false`                                                                |
| disableSwipeUp?                  | Disables swipe up when scale == 1                                                                                                                                               | `boolean`                                                                                        | `false`                                                                |
| loop?                            | Allows user to swipe infinitely. Works when `data.length > 1`                                                                                                                   | `boolean`                                                                                        | `false`                                                                |
| onScaleChange?                   | Is called when scale is changed                                                                                                                                                 | `(scale: number) => void`                                                                        | `undefined`                                                            |
| onScaleChangeRange?              | Shows range of scale in which `onScaleChange` is called                                                                                                                         | `{start: number, end: number}`                                                                   | `undefined`                                                            |
| containerDimensions?             | Dimensions object for the View that wraps gallery.                                                                                                                              | `{width: number, height: number}`                                                                | value returned from `useWindowDimensions()` hook.                      |
| style?                           | Style of container                                                                                                                                                              | `ViewStyle`                                                                                      | `undefined`                                                            |

## Events

| Prop                      | Description                                                                                                                    | Type       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| onSwipeToClose            | Fired when user swiped to top/bottom                                                                                           | `Function` |
| onTap                     | Fired when user tap on image                                                                                                   | `Function` |
| onDoubleTap               | Fired when user double tap on image                                                                                            | `Function` |
| onLongPress               | Fired when long press is detected                                                                                              | `Function` |
| onScaleStart              | Fired when pinch gesture starts                                                                                                | `Function` |
| onScaleEnd(scale: number) | Fired when pinch gesture ends. Use case: add haptic feedback when user finished gesture with `scale > maxScale` or `scale < 1` | `Function` |
| onPanStart                | Fired when pan gesture starts                                                                                                  | `Function` |

## Methods

```js
import Gallery, { GalleryRef } from 'react-native-awesome-gallery';

// ...

const ref = useRef<GalleryRef>(null);
```

| Prop     | Description               | Type                           |
| -------- | ------------------------- | ------------------------------ |
| setIndex | Sets active index         | `(newIndex: number) => void`   |
| reset    | Resets scale, translation | `(animated?: boolean) => void` |

## Supporting

If you want to support the library, you can buy me a coffee.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/pavelbabenko)

## License

MIT
