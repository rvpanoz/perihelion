import { Color, type IUniform, Vector2, Vector3 } from 'three';
import { bodyPositions } from '../bodies/bodyPositions';
import { writeSceneOffset } from '../sceneFrame';
import { SWARM_CLASS_COLORS, SWARM_LOOK, SWARM_TRAIL_MAX_OPACITY } from './swarmLook';

/** The uniforms swarm.vert and swarmTrails.vert declare between them; both materials share one set. */
export interface SwarmUniforms extends Record<string, IUniform> {
  elapsedDays: IUniform<number>;
  sunSceneOffsetAu: IUniform<Vector3>;
  pixelRatio: IUniform<number>;
  absoluteMagnitudeRange: IUniform<Vector2>;
  pointSizePx: IUniform<Vector2>;
  brightness: IUniform<Vector2>;
  classColors: IUniform<Color[]>;
  trailMaxOpacity: IUniform<number>;
}

export function createSwarmUniforms(pixelRatio: number): SwarmUniforms {
  return {
    elapsedDays: { value: 0 },
    sunSceneOffsetAu: { value: new Vector3() },
    pixelRatio: { value: pixelRatio },
    absoluteMagnitudeRange: { value: rangeVector(SWARM_LOOK.absoluteMagnitudeRange) },
    pointSizePx: { value: rangeVector(SWARM_LOOK.pointSizePx) },
    brightness: { value: rangeVector(SWARM_LOOK.brightness) },
    classColors: { value: SWARM_CLASS_COLORS.map((hex) => new Color(hex)) },
    trailMaxOpacity: { value: SWARM_TRAIL_MAX_OPACITY },
  };
}

/**
 * Runs every frame at `FRAME_PRIORITY.sceneObjects`, after the camera rig has set the origin. The caller takes
 * `elapsedDays = jdTdb − referenceJdTdb` in float64, so no JD ever reaches float32. The Sun's offset goes
 * through `writeSceneOffset`, the one place that maps axes, into the existing vector: nothing is allocated.
 */
export function writeSwarmUniforms(uniforms: SwarmUniforms, elapsedDays: number): void {
  uniforms.elapsedDays.value = elapsedDays;
  writeSceneOffset(bodyPositions.sun, uniforms.sunSceneOffsetAu.value);
}

function rangeVector(range: { brightest: number; faintest: number }): Vector2 {
  return new Vector2(range.brightest, range.faintest);
}
