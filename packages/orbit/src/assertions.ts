/** Shared argument checks. Internal: not re-exported from the package index. */

export function assertPositiveSemiMajorAxis(semiMajorAxisAu: number): void {
  if (!(semiMajorAxisAu > 0)) {
    throw new RangeError(`Semi-major axis must be positive, got ${semiMajorAxisAu} AU.`);
  }
}
