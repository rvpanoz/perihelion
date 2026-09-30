import { planetStateAt } from '@perihelion/orbit';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { type IUniform, InstancedBufferGeometry, Line, Points, ShaderMaterial } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { timeStore } from '../../time/timeStore';
import { DEFAULT_FLIGHT_SECONDS, cameraRig } from '../camera/cameraRig';
import { SceneContents } from '../SceneContents';
import { sceneAxesFromEcliptic, setSceneOrigin } from '../sceneFrame';
import { Swarm } from './Swarm';
import { SWARM_TRAIL_VERTEX_COUNT } from './swarmMesh';
import { J2000_JD_TDB, THREE_NEO_CATALOG, expectCloseTo } from './swarmTestSupport';

const FRAME_SECONDS = 1 / 60;
const FLIGHT_START_MS = 1_000_000;

type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

function swarmPoints(renderer: TestRenderer): Points {
  const { instance } = renderer.scene.find((node) => node.props.name === 'swarm');
  if (!(instance instanceof Points)) throw new Error('The swarm is not a Points object');
  return instance;
}

function swarmTrails(renderer: TestRenderer): Line[] {
  return renderer.scene
    .findAll((node) => node.props.name === 'swarmTrails')
    .map(({ instance }) => {
      if (!(instance instanceof Line)) throw new Error('The swarm trails are not a Line object');
      return instance;
    });
}

function swarmUniforms(layer: Points | Line): Record<string, IUniform> {
  if (!(layer.material instanceof ShaderMaterial))
    throw new Error('The swarm has no ShaderMaterial');
  return layer.material.uniforms;
}

describe('Swarm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setSceneOrigin([0, 0, 0]);
  });

  it('draws one point per NEO', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Swarm catalog={THREE_NEO_CATALOG} showTrails />,
    );
    expect(swarmPoints(renderer).geometry.getAttribute('position').count).toBe(3);
    await renderer.unmount();
  });

  it('draws one trail strip per NEO, sharing the points’ uniforms', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Swarm catalog={THREE_NEO_CATALOG} showTrails />,
    );
    const [trails] = swarmTrails(renderer);
    if (!(trails?.geometry instanceof InstancedBufferGeometry))
      throw new Error('The trails are not instanced');
    expect(trails.geometry.getAttribute('position').count).toBe(SWARM_TRAIL_VERTEX_COUNT);
    expect(trails.geometry.instanceCount).toBe(3);
    expect(swarmUniforms(trails)).toBe(swarmUniforms(swarmPoints(renderer)));
    await renderer.unmount();
  });

  it('draws no trails when they are off', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Swarm catalog={THREE_NEO_CATALOG} showTrails={false} />,
    );
    expect(swarmTrails(renderer)).toHaveLength(0);
    expect(swarmPoints(renderer)).toBeDefined();
    await renderer.unmount();
  });

  it('puts the Sun where the focused body sees it, in the same frame', async () => {
    timeStore.setPlaying(false);
    timeStore.scrubTo(J2000_JD_TDB);
    // The rig times flights by the wall clock. Pin it before `flyTo` so the flight starts at a known time, then
    // jump it to the flight's end so the next frame lands exactly on Earth.
    const clock = vi.spyOn(performance, 'now').mockReturnValue(FLIGHT_START_MS);
    cameraRig.flyTo({ focus: 'earthMoonBarycenter' });
    clock.mockReturnValue(FLIGHT_START_MS + DEFAULT_FLIGHT_SECONDS * 1000);
    const renderer = await ReactThreeTestRenderer.create(
      <SceneContents swarm={{ catalog: THREE_NEO_CATALOG, showTrails: true }} />,
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
