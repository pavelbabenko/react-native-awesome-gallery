type Size = { width: number; height: number };

/**
 * calculates the size of the image, how it would stretch to the borders of the container,
 * while maintaining its proportions (Image -> resizeMode="contain")
 */
export const resizeImage = (
  { width: imgWidth, height: imgHeight }: Size, // original image size
  { width, height }: Size // target image size
): Size => {
  const rw = imgWidth / width;
  const rh = imgHeight / height;

  if (rw > rh) {
    return {
      width: width,
      height: imgHeight / rw,
    };
  } else {
    return {
      width: imgWidth / rh,
      height: height,
    };
  }
};
