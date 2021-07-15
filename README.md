[![npm version](https://badge.fury.io/js/react-native-awesome-gallery.svg)](https://badge.fury.io/js/react-native-awesome-gallery)
[![Rate on Openbase](https://badges.openbase.com/js/rating/react-native-awesome-gallery.svg)](https://openbase.com/js/react-native-awesome-gallery?utm_source=embedded&utm_medium=badge&utm_campaign=rate-badge)

<p align="center">
  <h1 align="center">React Native Awesome Gallery</h1>
  <h3 align="center">Photos gallery powered by Reanimated v2 and react-native-gesture-handler</h3>
</p>

<p align="center">
  <img width="200" height="400" src="example-0.0.3.gif" alt="Example usage of gallery">
</p>

## Installation

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
| maxScale?                        | Maximum scale user can set with gesture                                                                                                                                         | `number`                                                                                         | `6`                                                                    |
| disableTransitionOnScaledImage?  | Disables transition to next/previous image when scale > 1                                                                                                                       | `boolean`                                                                                        | `false`                                                                |
| hideAdjacentImagesOnScaledImage? | Hides next and previous images when scale > 1                                                                                                                                   | `boolean`                                                                                        | `false`                                                                |
| disableVerticalSwipe?            | Disables vertical swipe when scale == 1                                                                                                                                         | `boolean`                                                                                        | `false`                                                                |
| loop?                            | Allows user to swipe infinitely. Works when `data.length > 1`                                                                                                                   | `boolean`                                                                                        | `false`                                                                |
| onScaleChange?                   | Is called when scale is changed                                                                                                                                                 | `(scale: number) => void`                                                                        | `undefined`                                                            |
| onScaleChangeRange?              | Shows range of scale in which `onScaleChange` is called                                                                                                                         | `{start: number, end: number}`                                                                   | `undefined`                                                            |
| containerDimensions?             | Dimensions object for the View that wraps gallery.                                                                                                                              | `{width: number, height: number}`                                                                | value returned from `useWindowDimensions()` hook.                      |
| style?                           | Style of container                                                                                                                                                              | `ViewStyle`                                                                                      | `undefined`                                                            |

## Events

| Prop           | Description                          | Type       |
| -------------- | ------------------------------------ | ---------- |
| onSwipeToClose | Fired when user swiped to top/bottom | `Function` |
| onTap          | Fired when user tap on image         | `Function` |
| onDoubleTap    | Fired when user double tap on image  | `Function` |
| onScaleStart   | Fired when pinch gesture starts      | `Function` |
| onPanStart     | Fired when pan gesture starts        | `Function` |

## Methods

```js
import Gallery, { GalleryRef } from 'react-native-awesome-gallery';

// ...

const ref = useRef<GalleryRef>(null);
```

| Prop     | Description       | Type                         |
| -------- | ----------------- | ---------------------------- |
| setIndex | Sets active index | `(newIndex: number) => void` |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
