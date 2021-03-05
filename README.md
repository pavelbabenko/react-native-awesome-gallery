# react-native-awesome-gallery

Awesome gallery with Reanimated v2

<p align="center">
  <img width="200" height="400" src="./example.gif" alt="Example usage of gallery">
</p>

## Installation

```sh
npm install react-native-awesome-gallery
```

## Usage

```js
import Gallery from "react-native-awesome-gallery";

// ...

const images = ['https://image1', 'https://image2']

<Gallery
  images={images}
  onIndexChange={(newIndex) => {
    console.log(newIndex);
  }}
/>
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
