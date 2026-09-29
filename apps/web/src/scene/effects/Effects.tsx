import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';
import { BLOOM_SETTINGS, TONE_MAPPING_MODE } from './effectsConfig';

/** Half-float buffers keep colours above 1 until tone mapping, so the bloom threshold can see them. */
export function Effects() {
  return (
    <EffectComposer frameBufferType={HalfFloatType}>
      <Bloom {...BLOOM_SETTINGS} />
      <ToneMapping mode={TONE_MAPPING_MODE} />
    </EffectComposer>
  );
}
