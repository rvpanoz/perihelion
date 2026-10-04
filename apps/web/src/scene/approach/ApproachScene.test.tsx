import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { Points, ShaderMaterial } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { approachSelection } from '../../approaches/approachSelection';
import { closeApproachRow } from '../../test/closeApproachRow';
import { timeStore } from '../../time/timeStore';
import { BODY_APPEARANCE } from '../bodies/bodyCatalog';
import type { MarkerUniforms } from '../markers/markerMaterial';
import { bodyPositions, updateBodyPositions } from '../bodies/bodyPositions';
import { sceneAxesFromEcliptic } from '../sceneFrame';
import { ApproachScene } from './ApproachScene';

const EARTH_MARKER_NAME = 'approach-earth-marker';

async function renderAtApproach() {
  const approach = closeApproachRow();
  timeStore.setPlaying(false);
  timeStore.scrubTo(approach.approachJdTdb);
  // `BodyPositionsUpdater` is not mounted here, so the positions are set once for the frame.
  updateBodyPositions(bodyPositions, approach.approachJdTdb);
  approachSelection.select(approach);
  const renderer = await ReactThreeTestRenderer.create(<ApproachScene />);
  await renderer.advanceFrames(1, 1 / 60);
  const earthMarkers = () =>
    renderer.scene.findAll((node) => node.props.name === EARTH_MARKER_NAME);
  return { renderer, earthMarkers };
}

describe('ApproachScene', () => {
  afterEach(() => approachSelection.clear());

  it('marks Earth at the Earth–Moon barycentre, at a fixed pixel size, in Earth’s colour, over its disc', async () => {
    const { renderer, earthMarkers } = await renderAtApproach();
    const marker = earthMarkers()[0]?.instance as Points<never, ShaderMaterial>;
    expect(marker.position.toArray()).toEqual(
      sceneAxesFromEcliptic(bodyPositions.earthMoonBarycenter),
    );
    const { color, sizePx } = marker.material.uniforms as MarkerUniforms;
    expect(sizePx.value).toBe(8);
    // A dark (night-side) disc would otherwise hide the marker.
    expect(marker.material.depthTest).toBe(false);
    expect(marker.renderOrder).toBeGreaterThan(0);
    expect(`#${color.value.getHexString()}`).toBe(BODY_APPEARANCE.earthMoonBarycenter.color);
    await renderer.unmount();
  });

  it('has no Earth marker once the approach is cleared', async () => {
    const { renderer, earthMarkers } = await renderAtApproach();
    await ReactThreeTestRenderer.act(async () => approachSelection.clear());
    expect(earthMarkers()).toHaveLength(0);
    await renderer.unmount();
  });
});
