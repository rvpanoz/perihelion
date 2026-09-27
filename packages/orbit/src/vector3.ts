/** Minimal 3-vector helpers on plain tuples, so tuple indexing stays typed as `number`. */

export type Vector3 = [number, number, number];

export function dot(first: Readonly<Vector3>, second: Readonly<Vector3>): number {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
}

export function cross(first: Readonly<Vector3>, second: Readonly<Vector3>): Vector3 {
  return [
    first[1] * second[2] - first[2] * second[1],
    first[2] * second[0] - first[0] * second[2],
    first[0] * second[1] - first[1] * second[0],
  ];
}

export function norm(vector: Readonly<Vector3>): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}
