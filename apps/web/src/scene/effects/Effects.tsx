import { Bloom, EffectComposer, FXAA, SMAA, ToneMapping } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';
import { antialiasingFromUrl, multisamplingFor } from '../../dev/devAntialiasing';
import { useQualityTier } from '../../quality/qualityStore';
import { BLOOM_SETTINGS, TONE_MAPPING_MODE } from './effectsConfig';

/** Read once per load; production builds drop it, and with it the passes it would have mounted. */
const DEV_ANTIALIASING = import.meta.env.DEV
  ? antialiasingFromUrl(window.location.search)
  : undefined;

/**
 * Half-float buffers keep colours above 1 until tone mapping, so the bloom threshold can see them. An
 * antialiasing pass belongs after tone mapping: it judges edges by the colours that reach the screen.
 */
export function Effects() {
  const tier = useQualityTier();
  return (
    <EffectComposer
      frameBufferType={HalfFloatType}
      multisampling={multisamplingFor(tier, DEV_ANTIALIASING)}
    >
      <Bloom {...BLOOM_SETTINGS} resolutionScale={tier.bloomResolutionScale} />
      <ToneMapping mode={TONE_MAPPING_MODE} />
      {DEV_ANTIALIASING === 'fxaa' && <FXAA />}
      {DEV_ANTIALIASING === 'smaa' && <SMAA />}
    </EffectComposer>
  );
}
