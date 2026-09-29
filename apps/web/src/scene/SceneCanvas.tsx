import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { CAMERA_SETTINGS, RENDERER_PARAMETERS, SCENE_BACKGROUND } from './canvasConfig';
import { SimulationClock } from './SimulationClock';

function PlaceholderSphere() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 64, 32]} />
      <meshStandardMaterial color="#4f7cff" roughness={0.6} />
    </mesh>
  );
}

export function SceneCanvas() {
  return (
    <Canvas gl={RENDERER_PARAMETERS} camera={CAMERA_SETTINGS}>
      <SimulationClock />
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <ambientLight intensity={0.05} />
      <directionalLight position={[5, 3, 5]} intensity={2.5} />
      <PlaceholderSphere />
      <Stats />
    </Canvas>
  );
}
