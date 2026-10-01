import { ApproachScene } from './approach/ApproachScene';
import { CameraRigUpdater } from './camera/CameraRigUpdater';
import { SolarSystem } from './bodies/SolarSystem';
import { CmeScene } from './eruption/CmeScene';
import { SimulationClock } from './SimulationClock';
import { Swarm, type SwarmProps } from './swarm/Swarm';

const AMBIENT_LIGHT_INTENSITY = 0.03;

/** The swarm mounts once its catalog arrives; until then, or without data, the scene runs as before. */
export function SceneContents({ swarm }: { swarm: SwarmProps | undefined }) {
  return (
    <>
      <SimulationClock />
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <SolarSystem />
      <ApproachScene />
      <CmeScene />
      {swarm && <Swarm {...swarm} />}
      <CameraRigUpdater />
    </>
  );
}
