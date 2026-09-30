import type { NeoCatalog } from '@perihelion/data';
import { CameraRigUpdater } from './camera/CameraRigUpdater';
import { SolarSystem } from './bodies/SolarSystem';
import { SimulationClock } from './SimulationClock';
import { Swarm } from './swarm/Swarm';

const AMBIENT_LIGHT_INTENSITY = 0.03;

/** The swarm mounts once its catalog arrives; until then, or without data, the scene runs as before. */
export function SceneContents({ neoCatalog }: { neoCatalog: NeoCatalog | undefined }) {
  return (
    <>
      <SimulationClock />
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <SolarSystem />
      {neoCatalog && <Swarm catalog={neoCatalog} />}
      <CameraRigUpdater />
    </>
  );
}
