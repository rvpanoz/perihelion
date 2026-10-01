import { describe, expect, it } from 'vitest';
import cmeShellFragmentShader from './cmeShell.frag?raw';
import cmeShellVertexShader from './cmeShell.vert?raw';
import { createCmeShellGeometry, createCmeShellUniforms } from './cmeShellMesh';
import { SHELL_SEED_SIZE } from './cmeShellSeeds';

const CONE = { axisEcliptic: [0, -1, 0] as const, halfAngleRad: 0.5 };

describe('createCmeShellUniforms', () => {
  it('gives every uniform the shaders declare', () => {
    const uniforms = createCmeShellUniforms(
      { axisEcliptic: [...CONE.axisEcliptic], halfAngleRad: CONE.halfAngleRad },
      2,
    );
    const declared = [
      ...`${cmeShellVertexShader}\n${cmeShellFragmentShader}`.matchAll(/^uniform \w+ (\w+);/gm),
    ].map((match) => match[1]);
    expect(declared.toSorted()).toEqual(Object.keys(uniforms).toSorted());
  });

  it('puts the axis, in scene axes, in the basis z column', () => {
    // Ecliptic −y is scene +z (sceneFrame.ts).
    const { elements } = createCmeShellUniforms(
      { axisEcliptic: [...CONE.axisEcliptic], halfAngleRad: CONE.halfAngleRad },
      1,
    ).coneBasis.value;
    expect([elements[6], elements[7], elements[8]]).toEqual([0, 0, 1]);
  });
});

describe('createCmeShellGeometry', () => {
  it('draws one point per seed', () => {
    const geometry = createCmeShellGeometry(new Float32Array(5 * SHELL_SEED_SIZE));
    expect(geometry.getAttribute('position').count).toBe(5);
    expect(geometry.getAttribute('shellSeed').itemSize).toBe(SHELL_SEED_SIZE);
  });
});
