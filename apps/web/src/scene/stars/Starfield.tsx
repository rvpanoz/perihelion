import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Points } from 'three';
import { FRAME_PRIORITY } from '../framePriorities';
import { IGNORE_RAYCAST, useDisposal } from '../swarm/swarmLayer';
import { useStarCatalog } from './starCatalogStore';
import type { StarCatalog } from './starPacking';
import {
  createStarfieldGeometry,
  createStarfieldMaterial,
  createStarfieldUniforms,
} from './starfieldMesh';

/** Nothing is drawn until the catalog lands, so the scene renders in tests and on a failed fetch. */
export function Starfield() {
  const catalog = useStarCatalog();
  return catalog ? <StarPoints catalog={catalog} /> : null;
}

/**
 * The scene has a floating origin, so the field is kept centred on the camera: the stars stay 900 AU away however
 * far the camera travels, and only turning the camera turns the sky.
 */
function StarPoints({ catalog }: { catalog: StarCatalog }) {
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => createStarfieldGeometry(catalog), [catalog]);
  const material = useMemo(
    () => createStarfieldMaterial(createStarfieldUniforms(pixelRatio)),
    [pixelRatio],
  );
  useDisposal(geometry);
  useDisposal(material);
  const fieldRef = useRef<Points>(null);
  useFrame(({ camera }) => {
    fieldRef.current?.position.copy(camera.position);
  }, FRAME_PRIORITY.sceneObjects);
  return (
    <points
      ref={fieldRef}
      name="starfield"
      geometry={geometry}
      material={material}
      raycast={IGNORE_RAYCAST}
    />
  );
}
