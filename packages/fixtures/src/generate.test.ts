import { describe, expect, it } from 'vitest';
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
} from './fixtureSpec';
import { type HorizonsClient, generateAsteroidFixtures, generatePlanetFixtures } from './generate';
import { HorizonsError } from './horizonsResponse';

const VECTOR_HEADER = 'JDTDB, Calendar Date (TDB), X, Y, Z, VX, VY, VZ,';
const ELEMENTS_HEADER = 'JDTDB, Calendar Date (TDB), EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR,';

function table(header: string, rows: readonly string[]): string {
  return [header, '*****', '$$SOE', ...rows, '$$EOE'].join('\n');
}

function requestedJds(params: URLSearchParams): number[] {
  return (params.get('TLIST') ?? '').split(' ').map((jd) => Number(jd.replaceAll("'", '')));
}

function fakeResult(params: URLSearchParams): string {
  const jds = requestedJds(params);
  if (params.get('EPHEM_TYPE') === 'ELEMENTS') {
    return table(ELEMENTS_HEADER, [
      `${jds[0]}, A.D., 0.2, 1.1, 10, 300, 170, 2461100, 0.5, 300, 280, 1.4, 1.7, 700,`,
    ]);
  }
  return table(
    VECTOR_HEADER,
    jds.map((jd) => `${jd}, A.D., 1.0E+00, 2.0E+00, 3.0E+00, 4.0E-03, 5.0E-03, 6.0E-03,`),
  );
}

function recordingClient(answer: (params: URLSearchParams) => string = fakeResult) {
  const commands: string[] = [];
  const client: HorizonsClient = {
    async fetchResultText(params) {
      commands.push(params.get('COMMAND') ?? '');
      return answer(params);
    },
  };
  return { client, commands };
}

describe('generatePlanetFixtures', () => {
  it('queries each planet barycentre and keeps a state for every sample date', async () => {
    const { client, commands } = recordingClient();
    const fixtures = await generatePlanetFixtures(client);
    expect(commands).toEqual(["'1'", "'2'", "'3'", "'4'", "'5'", "'6'", "'7'", "'8'"]);
    for (const name of PLANET_NAMES) {
      expect(fixtures.planets[name].states.map((state) => state.jdTdb)).toEqual(
        PLANET_SAMPLE_JD_TDB,
      );
    }
    expect(fixtures.source.settings.CENTER).toBe("'500@10'");
  });

  it('rejects a response that is missing a requested date', async () => {
    const dropLast = (params: URLSearchParams) => {
      const jds = requestedJds(params).slice(0, -1);
      return table(
        VECTOR_HEADER,
        jds.map((jd) => `${jd}, A.D., 1, 2, 3, 4, 5, 6,`),
      );
    };
    await expect(generatePlanetFixtures(recordingClient(dropLast).client)).rejects.toThrow(
      /Requested JDs/,
    );
  });

  it('rejects when Horizons answers without an ephemeris table', async () => {
    const noMatch = () => '\nNo matches found.\n';
    await expect(generatePlanetFixtures(recordingClient(noMatch).client)).rejects.toThrow(
      HorizonsError,
    );
  });
});

describe('generateAsteroidFixtures', () => {
  it('keeps elements at the epoch and states at every offset for each asteroid', async () => {
    const fixtures = await generateAsteroidFixtures(recordingClient().client);
    expect(fixtures.epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
    for (const name of ASTEROID_NAMES) {
      expect(fixtures.asteroids[name].elements.epochJdTdb).toBe(ASTEROID_EPOCH_JD_TDB);
      expect(fixtures.asteroids[name].states.map((state) => state.jdTdb)).toEqual(
        ASTEROID_SAMPLE_JD_TDB,
      );
    }
  });

  it('rejects elements returned for a different epoch', async () => {
    const wrongEpoch = (params: URLSearchParams) =>
      params.get('EPHEM_TYPE') === 'ELEMENTS'
        ? table(ELEMENTS_HEADER, [
            '2460000.5, A.D., 0.2, 1.1, 10, 300, 170, 2461100, 0.5, 300, 280, 1.4, 1.7, 700,',
          ])
        : fakeResult(params);
    await expect(generateAsteroidFixtures(recordingClient(wrongEpoch).client)).rejects.toThrow(
      /epoch/,
    );
  });
});
