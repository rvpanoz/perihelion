import { CameraRigUpdater } from './camera/CameraRigUpdater';
import { SolarSystem } from './bodies/SolarSystem';
import { SimulationClock } from './SimulationClock';

const AMBIENT_LIGHT_INTENSITY = 0.03;

export function SceneContents() {
  return (
    <>
      <SimulationClock />
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <SolarSystem />
      <CameraRigUpdater />
    </>
  );
}
