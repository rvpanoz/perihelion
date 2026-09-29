import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { CAMERA_SETTINGS, RENDERER_PARAMETERS, SCENE_BACKGROUND } from './canvasConfig';
import { SolarSystem } from './bodies/SolarSystem';
import { SimulationClock } from './SimulationClock';

export function SceneCanvas() {
  return (
    <Canvas gl={RENDERER_PARAMETERS} camera={CAMERA_SETTINGS}>
      <SimulationClock />
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <ambientLight intensity={0.03} />
      <SolarSystem />
      <Stats />
    </Canvas>
  );
}
