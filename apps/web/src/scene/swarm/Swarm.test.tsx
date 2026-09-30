import { planetStateAt } from '@perihelion/orbit';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { type IUniform, Points, ShaderMaterial } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { timeStore } from '../../time/timeStore';
import { DEFAULT_FLIGHT_SECONDS, cameraRig } from '../camera/cameraRig';
import { SceneContents } from '../SceneContents';
import { sceneAxesFromEcliptic, setSceneOrigin } from '../sceneFrame';
import { Swarm } from './Swarm';
import { J2000_JD_TDB, THREE_NEO_CATALOG, expectCloseTo } from './swarmTestSupport';

const FRAME_SECONDS = 1 / 60;

type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

function swarmPoints(renderer: TestRenderer): Points {
  const { instance } = renderer.scene.find((node) => node.props.name === 'swarm');
  if (!(instance instanceof Points)) throw new Error('The swarm is not a Points object');
  return instance;
}

function swarmUniforms(points: Points): Record<string, IUniform> {
  if (!(points.material instanceof ShaderMaterial))
    throw new Error('The swarm has no ShaderMaterial');
  return points.material.uniforms;
}

describe('Swarm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setSceneOrigin([0, 0, 0]);
  });

  it('draws one point per NEO', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Swarm catalog={THREE_NEO_CATALOG} />);
    expect(swarmPoints(renderer).geometry.getAttribute('position').count).toBe(3);
    await renderer.unmount();
  });

  it('puts the Sun where the focused body sees it, in the same frame', async () => {
    timeStore.setPlaying(false);
    timeStore.scrubTo(J2000_JD_TDB);
    const flightStartMs = performance.now();
    cameraRig.flyTo({ focus: 'earthMoonBarycenter' });
    // The rig times flights by the wall clock; jump it to the end so the next frame lands on Earth.
    vi.spyOn(performance, 'now').mockReturnValue(flightStartMs + DEFAULT_FLIGHT_SECONDS * 1000);
    const renderer = await ReactThreeTestRenderer.create(
      <SceneContents neoCatalog={THREE_NEO_CATALOG} />,
    );
    await renderer.advanceFrames(1, FRAME_SECONDS);
    const [x, y, z] = planetStateAt('earthMoonBarycenter', J2000_JD_TDB).positionAu;
    const uniforms = swarmUniforms(swarmPoints(renderer));
    expectCloseTo(
      uniforms.sunSceneOffsetAu?.value.toArray(),
      sceneAxesFromEcliptic([-x, -y, -z]),
      12,
    );
    expect(uniforms.elapsedDays?.value).toBe(0);
    await renderer.unmount();
  });
});
