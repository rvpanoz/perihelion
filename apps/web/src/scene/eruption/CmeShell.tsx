import type { Cme } from '@perihelion/data';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { timeStore } from '../../time/timeStore';
import { FRAME_PRIORITY } from '../framePriorities';
import { IGNORE_RAYCAST, useDisposal } from '../swarm/swarmLayer';
import { cmeCone } from '../../eruptions/cmeGeometry';
import {
  createCmeShellGeometry,
  createCmeShellMaterial,
  createCmeShellUniforms,
  writeCmeShellUniforms,
} from './cmeShellMesh';
import { CME_SHELL_LOOK } from './cmeShellLook';
import { createShellSeeds, mulberry32 } from './cmeShellSeeds';
import { cmeAxisEcliptic, cmeShellMotion, cmeShellState } from './cmeShellTiming';

const SHELL_RANDOM_SEED = 20_261_002;

/**
 * One particle layout for every CME; the selected CME sets the cone (axis and width, fixed) and the clock moves the
 * front. The front's distance is float64 on the CPU (`cmeFrontDistanceAu`); the shader only spreads the particles.
 */
export function CmeShell({ cme }: { cme: Cme }) {
  const geometry = useMemo(
    () =>
      createCmeShellGeometry(
        createShellSeeds(CME_SHELL_LOOK.particleCount, mulberry32(SHELL_RANDOM_SEED)),
      ),
    [],
  );
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const motion = useMemo(() => cmeShellMotion(cme), [cme]);
  const uniforms = useMemo(
    () =>
      createCmeShellUniforms(
        { axisEcliptic: cmeAxisEcliptic(cme), halfAngleRad: cmeCone(cme.analysis).halfAngleRad },
        pixelRatio,
      ),
    [cme, pixelRatio],
  );
  const material = useMemo(() => createCmeShellMaterial(uniforms), [uniforms]);
  useDisposal(geometry);
  useDisposal(material);
  useFrame(() => {
    writeCmeShellUniforms(uniforms, cmeShellState(motion, timeStore.state.jdTdb));
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <points
      name="cme-shell"
      geometry={geometry}
      material={material}
      frustumCulled={false}
      raycast={IGNORE_RAYCAST}
    />
  );
}
