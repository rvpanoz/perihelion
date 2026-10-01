import type { Vector3 } from '@perihelion/orbit';
import { asteroidPositionAu } from '../approach/asteroidPosition';
import type { BodyId } from '../bodies/bodyCatalog';
import { bodyPositions } from '../bodies/bodyPositions';

/** Anything the camera can centre on: a body, or the selected approach's asteroid. */
export type FocusId = BodyId | 'asteroid';
export type FocusPositions = Readonly<Record<FocusId, Readonly<Vector3>>>;

/** The spread copies references, so this reads the very arrays the updaters write each frame. */
export const focusPositions: FocusPositions = { ...bodyPositions, asteroid: asteroidPositionAu };
