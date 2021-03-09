<p align="center">
  <h1>React Native Awesome Gallery</h1>
  <h3>Photos gallery powered by Reanimated v2 and react-native-gesture-handler</h3>
  <img width="200" height="400" src="./example.gif" alt="Example usage of gallery">
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
    images={images}
    onIndexChange={(newIndex) => {
      console.log(newIndex);
    }}
  />
);
```

## Props

| Prop             | Description                                                                                                                                                                     | Type                                                                                                  | Default     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------- |
| images           | Array of urls to render                                                                                                                                                         | `string[]`                                                                                            | `undefined` |
| renderImage?     | Callback func which can be used to render custom image component, e.g `FastImage`. NOTE: You have to call `setImageDimensions({width, height})` parameter after image is loaded | `(renderImageInfo: {uri: string, index: number, setImageDimensions: Function}) => React.ReactElement` | `undefined` |
| initialIndex?    | The initial image index                                                                                                                                                         | `number`                                                                                              | `0`         |
| onIndexChange?   | Is called when index of active image is changed                                                                                                                                 | `(newIndex: number) => void`                                                                          | `undefined` |
| numToRender?     | Amount of images rendered in gallery simultaneously                                                                                                                             | `number`                                                                                              | `5`         |
| emptySpaceWidth? | Width of empty space between images                                                                                                                                             | `number`                                                                                              | `30`        |
| doubleTapScale?  | Image scale when double tap is fired                                                                                                                                            | `number`                                                                                              | `3`         |
| maxScale         | Maximum scale user can set with gesture                                                                                                                                         | `number`                                                                                              | `6`         |
| style            | Style of container                                                                                                                                                              | `ViewStyle`                                                                                           | `undefined` |

## Events

| Prop           | Description                          | Type       |
| -------------- | ------------------------------------ | ---------- |
| onSwipeToClose | Fired when user swiped to top/bottom | `Function` |
| onTap          | Fired when user tap on image         | `Function` |
| onDoubleTap    | Fired when user double tap on image  | `Function` |
| onScaleStart   | Fired when pinch gesture starts      | `Function` |
| onPanStart     | Fired when pan gesture starts        | `Function` |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
