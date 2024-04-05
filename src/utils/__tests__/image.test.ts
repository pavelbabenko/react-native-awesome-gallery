import { resizeImage } from '../image';

type Size = [number, number]; // [width, height]

describe('image', () => {
  /* eslint-disable */
  const testData: {
    container: Size;
    items: [Size, Size][] // [imageSize, expectingSize]
  }[] = [
    {
      container: [100, 100],
      items: [
        [[100, 100],  [100, 100]],
        [[50, 50],    [100, 100]],
        [[150, 150],  [100, 100]],

        [[100, 200],  [50, 100]],
        [[200, 100],  [100, 50]],

        [[25, 50],    [50, 100]],
        [[50, 25],    [100, 50]],

        [[25, 500],   [5, 100]],
        [[500, 25],   [100, 5]],
      ]
    },
    {
      container: [10, 100],
      items: [
        [[1, 1],        [10, 10]],
        [[1000, 1000],  [10, 10]],

        [[1, 2],        [10, 20]],
        [[2, 1],        [10, 5]],

        [[500, 1000],   [10, 20]],
        [[1000, 500],   [10, 5]],
      ]
    },
    {
      container: [100, 10],
      items: [
        [[1, 1],        [10, 10]],
        [[1000, 1000],  [10, 10]],

        [[2, 1],        [20, 10]],
        [[1, 2],        [5, 10]],

        [[1000, 500],   [20, 10]],
        [[500, 1000],   [5, 10]],
      ]
    }
  ];
  /* eslint-enable */

  describe('resizeImage', () => {
    testData.forEach(({ container, items }) => {
      const [containerWidth, containerHeight] = container;

      describe(`container ${containerWidth}x${containerHeight}`, () => {
        items.forEach(([image, expecting]) => {
          const [imageWidth, imageHeight] = image;
          const [expectedWidth, expectedHeight] = expecting;
          const toObj = (size: Size) => ({ width: size[0], height: size[1] });

          test(
            `image ${imageWidth}x${imageHeight} -> ` +
              `expected ${expectedWidth}x${expectedHeight}`,
            () => {
              const imgSize = toObj(image);
              const containerSize = toObj(container);
              const expectSize = toObj(expecting);
              expect(resizeImage(imgSize, containerSize)).toEqual(expectSize);
            }
          );
        });
      });
    });
  });
});
