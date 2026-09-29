import { PLANETS, julianDateFromCalendar, planetStateAt } from '@perihelion/orbit';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { timeStore } from '../../time/timeStore';
import { sceneAxesFromEcliptic, setSceneOrigin } from '../sceneFrame';
import { SolarSystem } from './SolarSystem';

const SCRUBBED_DATES_TDB = [
  julianDateFromCalendar({ year: 1850, month: 6, day: 1, hour: 0, minute: 0, second: 0 }),
  julianDateFromCalendar({ year: 2003, month: 8, day: 27, hour: 9, minute: 51, second: 0 }),
  julianDateFromCalendar({ year: 2049, month: 12, day: 31, hour: 0, minute: 0, second: 0 }),
];

async function renderAt(jdTdb: number) {
  timeStore.setPlaying(false);
  timeStore.scrubTo(jdTdb);
  const renderer = await ReactThreeTestRenderer.create(<SolarSystem />);
  await renderer.advanceFrames(1, 1 / 60);
  const bodyGroup = (name: string): Object3D =>
    renderer.scene.find((node) => node.props.name === `body-${name}`).instance;
  return { renderer, bodyGroup };
}

describe('SolarSystem', () => {
  afterEach(() => setSceneOrigin([0, 0, 0]));

  it.each(SCRUBBED_DATES_TDB)(
    'draws every planet where the engine puts it (JD %d)',
    async (jdTdb) => {
      const { renderer, bodyGroup } = await renderAt(jdTdb);
      for (const planet of PLANETS) {
        const expected = sceneAxesFromEcliptic(planetStateAt(planet, jdTdb).positionAu);
        expect(bodyGroup(planet).position.toArray()).toEqual(expected);
      }
      await renderer.unmount();
    },
  );

  it('draws the focused body at exactly the scene origin', async () => {
    const jdTdb = SCRUBBED_DATES_TDB[1] ?? 0;
    setSceneOrigin(planetStateAt('earthMoonBarycenter', jdTdb).positionAu);
    const { renderer, bodyGroup } = await renderAt(jdTdb);
    expect(bodyGroup('earthMoonBarycenter').position.length()).toBe(0);
    await renderer.unmount();
  });
});
