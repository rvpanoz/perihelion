import { PLANETS, type Vector3, createStateVector, planetStateAt } from '@perihelion/orbit';
import { BODY_IDS, type BodyId } from './bodyCatalog';

/** Heliocentric ecliptic J2000 positions in AU, float64, refreshed once per frame. */
export type BodyPositions = Record<BodyId, Vector3>;

export function createBodyPositions(): BodyPositions {
  return Object.fromEntries(BODY_IDS.map((body) => [body, [0, 0, 0]])) as BodyPositions;
}

const scratchState = createStateVector();

/** Heliocentric, so the Sun stays at [0, 0, 0]. Planets come from Standish Table 1 via the engine. */
export function updateBodyPositions(positions: BodyPositions, jdTdb: number): void {
  for (const planet of PLANETS) {
    const [x, y, z] = planetStateAt(planet, jdTdb, scratchState).positionAu;
    const target = positions[planet];
    target[0] = x;
    target[1] = y;
    target[2] = z;
  }
}

/** The app-wide table: written at `FRAME_PRIORITY.bodyPositions`, read by the camera rig and every body. */
export const bodyPositions = createBodyPositions();
