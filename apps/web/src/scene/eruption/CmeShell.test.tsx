import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { BufferGeometry, Points } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { qualityStore } from '../../quality/qualityStore';
import { QUALITY_TIERS } from '../../quality/qualityTiers';
import { cmeRow } from '../../test/cmeRow';
import { CmeShell } from './CmeShell';

describe('CmeShell', () => {
  afterEach(() => qualityStore.setTierName('high'));

  it('draws the particle count of the tier on screen and rebuilds when it changes', async () => {
    const renderer = await ReactThreeTestRenderer.create(<CmeShell cme={cmeRow()} />);
    const particleCount = () => {
      const shell = renderer.scene.find((node) => node.props.name === 'cme-shell');
      return (shell.instance as Points<BufferGeometry>).geometry.getAttribute('position').count;
    };
    expect(particleCount()).toBe(QUALITY_TIERS.high.cmeParticleCount);
    await ReactThreeTestRenderer.act(async () => qualityStore.setTierName('low'));
    expect(particleCount()).toBe(QUALITY_TIERS.low.cmeParticleCount);
    await renderer.unmount();
  });
});
