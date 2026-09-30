import { afterEach, describe, expect, it } from 'vitest';
import { sceneAxesFromEcliptic, setSceneOrigin } from '../sceneFrame';
import { SWARM_CLASS_COLORS } from './swarmLook';
import { createSwarmUniforms, writeSwarmUniforms } from './swarmUniforms';

describe('createSwarmUniforms', () => {
  it('passes one colour per orbit class to the shader', () => {
    expect(createSwarmUniforms(1).classColors.value).toHaveLength(SWARM_CLASS_COLORS.length);
  });
});

describe('writeSwarmUniforms', () => {
  afterEach(() => setSceneOrigin([0, 0, 0]));

  it('stores the elapsed days unrounded', () => {
    const uniforms = createSwarmUniforms(1);
    writeSwarmUniforms(uniforms, 2_461_313.75 - 2_461_313.5);
    expect(uniforms.elapsedDays.value).toBe(0.25);
    writeSwarmUniforms(uniforms, 1 / 3);
    expect(uniforms.elapsedDays.value).toBe(1 / 3);
  });

  it('puts the Sun at its scene offset from the current origin', () => {
    setSceneOrigin([1.2, -0.4, 0.05]);
    const uniforms = createSwarmUniforms(1);
    writeSwarmUniforms(uniforms, 0);
    const expected = sceneAxesFromEcliptic([-1.2, 0.4, -0.05]);
    expect(uniforms.sunSceneOffsetAu.value.toArray()).toEqual(expected);
  });

  it('writes into the same vector every frame', () => {
    const uniforms = createSwarmUniforms(1);
    const sunOffset = uniforms.sunSceneOffsetAu.value;
    writeSwarmUniforms(uniforms, 0);
    writeSwarmUniforms(uniforms, 1);
    expect(uniforms.sunSceneOffsetAu.value).toBe(sunOffset);
  });
});
