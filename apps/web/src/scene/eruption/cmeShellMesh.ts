import type { Vector3 as EngineVector3 } from '@perihelion/orbit';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type IUniform,
  Matrix3,
  ShaderMaterial,
  Vector3,
} from 'three';
import { bodyPositions } from '../bodies/bodyPositions';
import { sceneAxesFromEcliptic, writeSceneOffset } from '../sceneFrame';
import cmeShellFragmentShader from './cmeShell.frag?raw';
import cmeShellVertexShader from './cmeShell.vert?raw';
import { coneBasis } from './cmeShellGeometry';
import { CME_SHELL_LOOK } from './cmeShellLook';
import { SHELL_SEED_SIZE } from './cmeShellSeeds';
import type { CmeShellState } from './cmeShellTiming';

/** The uniforms cmeShell.vert and cmeShell.frag declare. */
export interface CmeShellUniforms extends Record<string, IUniform> {
  sunSceneOffsetAu: IUniform<Vector3>;
  coneBasis: IUniform<Matrix3>;
  cosHalfAngle: IUniform<number>;
  frontDistanceAu: IUniform<number>;
  sheathFraction: IUniform<number>;
  sheathBrightness: IUniform<number>;
  pointSizePx: IUniform<number>;
  pixelRatio: IUniform<number>;
  shellColor: IUniform<Color>;
  opacity: IUniform<number>;
}

export interface CmeShellCone {
  axisEcliptic: Readonly<EngineVector3>;
  halfAngleRad: number;
}

/** One vertex per particle; three.js takes the draw count from `position`, which the shader ignores. */
export function createCmeShellGeometry(seeds: Float32Array): BufferGeometry {
  const count = seeds.length / SHELL_SEED_SIZE;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('shellSeed', new BufferAttribute(seeds, SHELL_SEED_SIZE));
  return geometry;
}

/** The cone is fixed per CME, so its basis and width are set once; only distance and opacity move per frame. */
export function createCmeShellUniforms(cone: CmeShellCone, pixelRatio: number): CmeShellUniforms {
  const { x, y, z } = coneBasis(sceneAxesFromEcliptic(cone.axisEcliptic));
  const [red, green, blue] = CME_SHELL_LOOK.color;
  return {
    sunSceneOffsetAu: { value: new Vector3() },
    // Matrix3.set takes rows; the columns are the basis vectors.
    coneBasis: { value: new Matrix3().set(x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]) },
    cosHalfAngle: { value: Math.cos(cone.halfAngleRad) },
    frontDistanceAu: { value: 0 },
    sheathFraction: { value: CME_SHELL_LOOK.sheathFraction },
    sheathBrightness: { value: CME_SHELL_LOOK.sheathBrightness },
    pointSizePx: { value: CME_SHELL_LOOK.pointSizePx },
    pixelRatio: { value: pixelRatio },
    shellColor: { value: new Color(red, green, blue) },
    opacity: { value: 0 },
  };
}

/** Runs every frame after the camera rig has set the origin; nothing is allocated. */
export function writeCmeShellUniforms(uniforms: CmeShellUniforms, state: CmeShellState): void {
  writeSceneOffset(bodyPositions.sun, uniforms.sunSceneOffsetAu.value);
  uniforms.frontDistanceAu.value = state.frontDistanceAu;
  uniforms.opacity.value = state.opacity;
}

/** Depth-tested but not depth-writing, and additive, like the swarm. */
export function createCmeShellMaterial(uniforms: CmeShellUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: cmeShellVertexShader,
    fragmentShader: cmeShellFragmentShader,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
