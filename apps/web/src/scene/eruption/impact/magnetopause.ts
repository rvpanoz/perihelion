import { BufferAttribute, BufferGeometry } from 'three';
import { IMPACT_LOOK } from './impactLook';

const ANGLE_STEPS = 48;
const AROUND_STEPS = 64;

/** Shue et al. (1998): the magnetopause's distance at angle θ from the Sun–Earth line, in units of the standoff r0. */
export function shueRadius(angleRad: number, alpha: number): number {
  return (2 / (1 + Math.cos(angleRad))) ** alpha;
}

/**
 * The magnetopause for r0 = 1, revolved about local +z (toward the Sun): the mesh is scaled by the standoff and
 * turned toward the Sun each frame. Indexed triangles, θ from the subsolar point to `magnetopauseMaxAngleRad`.
 */
export function createMagnetopauseGeometry(): BufferGeometry {
  const { magnetopauseMaxAngleRad, flaringAlpha } = IMPACT_LOOK;
  const positions: number[] = [];
  for (let angleStep = 0; angleStep <= ANGLE_STEPS; angleStep += 1) {
    const angleRad = (angleStep / ANGLE_STEPS) * magnetopauseMaxAngleRad;
    const radius = shueRadius(angleRad, flaringAlpha);
    for (let aroundStep = 0; aroundStep <= AROUND_STEPS; aroundStep += 1) {
      const aroundRad = (aroundStep / AROUND_STEPS) * 2 * Math.PI;
      const sideways = radius * Math.sin(angleRad);
      positions.push(
        sideways * Math.cos(aroundRad),
        sideways * Math.sin(aroundRad),
        radius * Math.cos(angleRad),
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(gridIndices());
  geometry.computeVertexNormals();
  return geometry;
}

function gridIndices(): number[] {
  const rowLength = AROUND_STEPS + 1;
  const indices: number[] = [];
  for (let angleStep = 0; angleStep < ANGLE_STEPS; angleStep += 1) {
    for (let aroundStep = 0; aroundStep < AROUND_STEPS; aroundStep += 1) {
      const corner = angleStep * rowLength + aroundStep;
      indices.push(
        corner,
        corner + rowLength,
        corner + 1,
        corner + 1,
        corner + rowLength,
        corner + rowLength + 1,
      );
    }
  }
  return indices;
}
