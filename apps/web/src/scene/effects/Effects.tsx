import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';
import { useQualityTier } from '../../quality/qualityStore';
import { BLOOM_SETTINGS, TONE_MAPPING_MODE } from './effectsConfig';

/** Half-float buffers keep colours above 1 until tone mapping, so the bloom threshold can see them. */
export function Effects() {
  const tier = useQualityTier();
  return (
    <EffectComposer frameBufferType={HalfFloatType} multisampling={tier.multisampling}>
      <Bloom {...BLOOM_SETTINGS} resolutionScale={tier.bloomResolutionScale} />
      <ToneMapping mode={TONE_MAPPING_MODE} />
    </EffectComposer>
  );
}
