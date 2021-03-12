export const clamp = (value: number, min: number, max: number) => {
  'worklet';

  return Math.max(Math.min(value, max), min);
};

export const rubberBandClamp = (x: number, coeff: number, dim: number) => {
  'worklet';

  return (1.0 - 1.0 / ((x * coeff) / dim + 1.0)) * dim;
};

export const withRubberBandClamp = (
  x: number,
  coeff: number,
  dim: number,
  limits: [number, number]
) => {
  'worklet';
  let clampedX = clamp(x, limits[0], limits[1]);
  let diff = Math.abs(x - clampedX);
  let sign = clampedX > x ? -1 : 1;

  return clampedX + sign * rubberBandClamp(diff, coeff, dim);
};
