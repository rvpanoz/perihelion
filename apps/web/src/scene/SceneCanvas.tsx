import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import { DevProbes } from '../dev/DevProbes';
import { devPixelRatioFromUrl } from '../dev/devPixelRatio';
import { QualityGovernor } from '../quality/QualityGovernor';
import { useQualityTier } from '../quality/qualityStore';
import { pixelRatioFor } from '../quality/qualityTiers';
import { CAMERA_SETTINGS, RENDERER_PARAMETERS, SCENE_BACKGROUND } from './canvasConfig';
import { earthDayMap } from './bodies/earth/earthDayMap';
import { CameraControls } from './camera/CameraControls';
import { Effects } from './effects/Effects';
import { OpeningDirector } from './opening/OpeningDirector';
import { SceneContents } from './SceneContents';
import type { SwarmProps } from './swarm/Swarm';

/**
 * Read once per load. It stands in for the device's ratio, so the tier still caps it and proxy runs show the tiers
 * apart; production builds drop it.
 */
const DEV_PIXEL_RATIO = import.meta.env.DEV
  ? devPixelRatioFromUrl(window.location.search)
  : undefined;

export interface SceneCanvasProps {
  swarm: SwarmProps | undefined;
  /** The catalog is no longer loading, so the opening's reveal has its swarm, or plays over the planets without. */
  openingCanStart: boolean;
}

/**
 * `CameraControls` mounts after `SceneContents` so the rig's updater runs before drei's controls each frame. The
 * director and the Earth map's load live here rather than in `SceneContents` because they need the browser, which
 * the scene tests don't have.
 */
export function SceneCanvas({ swarm, openingCanStart }: SceneCanvasProps) {
  useEffect(() => earthDayMap.load(), []);
  const pixelRatio = pixelRatioFor(useQualityTier(), DEV_PIXEL_RATIO ?? window.devicePixelRatio);
  return (
    <Canvas flat dpr={pixelRatio} gl={RENDERER_PARAMETERS} camera={CAMERA_SETTINGS}>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <OpeningDirector canStart={openingCanStart} />
      <SceneContents swarm={swarm} />
      <CameraControls />
      <Effects />
      <QualityGovernor />
      <Stats className="fps-meter" />
      {import.meta.env.DEV && <DevProbes />}
    </Canvas>
  );
}
