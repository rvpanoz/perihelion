const TWO_PI = 2 * Math.PI;

/** Wraps an angle into [0, 2π). */
export function normalizeAngleRad(angleRad: number): number {
  const remainderRad = angleRad % TWO_PI;
  const wrappedRad = remainderRad < 0 ? remainderRad + TWO_PI : remainderRad;
  // A tiny negative remainder plus 2π rounds up to exactly 2π, which is outside the range.
  return wrappedRad === TWO_PI ? 0 : wrappedRad;
}
