import { describe, expect, it } from 'vitest';
import {
  ASTEROID_EPOCH_JD_TDB,
  ASTEROID_NAMES,
  ASTEROID_SAMPLE_JD_TDB,
  PLANET_NAMES,
  PLANET_SAMPLE_JD_TDB,
  SUN_SAMPLE_JD_TDB,
} from './fixtureSpec';
import {
  type HorizonsClient,
  generateAsteroidFixtures,
  generatePlanetFixtures,
  generateSunOrientationFixtures,
} from './generate';
import { HorizonsError } from './horizonsResponse';

const VECTOR_HEADER = 'JDTDB, Calendar Date (TDB), X, Y, Z, VX, VY, VZ,';
const OBSERVER_HEADER = 'Date_________JDTT, , , ObsSub-LON, ObsSub-LAT,';
const ELEMENTS_HEADER = 'JDTDB, Calendar Date (TDB), EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR,';
const PROVENANCE_HEADER = [
  'Ephemeris / API_USER Sun Sep 27 15:54:02 2026 Pasadena, USA      / Horizons',
  'Target body name: Test body (1)                   {source: JPL#1}',
  'Center body name: Sun (10)                        {source: DE441}',
  'Keplerian GM    : 2.9591220828411951E-04 au^3/d^2',
  'Small perturbers: Yes                             {source: SB441-N16}',
].join('\n');

function table(header: string, rows: readonly string[]): string {
  return [PROVENANCE_HEADER, header, '*****', '$$SOE', ...rows, '$$EOE'].join('\n');
}

function requestedJds(params: URLSearchParams): number[] {
  return (params.get('TLIST') ?? '').split(' ').map((jd) => Number(jd.replaceAll("'", '')));
}

function fakeResult(params: URLSearchParams): string {
  const jds = requestedJds(params);
  if (params.get('EPHEM_TYPE') === 'OBSERVER') {
    return table(
      OBSERVER_HEADER,
      jds.map((jd) => `${jd}, , , 120.5, -2.5,`),
    );
  }
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
    async fetchResponse(params) {
      commands.push(params.get('COMMAND') ?? '');
      return { resultText: answer(params), apiVersion: '1.2' };
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

  it('records the API version, ephemeris and Horizons timestamp of the run', async () => {
    const fixtures = await generatePlanetFixtures(recordingClient().client);
    expect(fixtures.source).toMatchObject({
      apiVersion: '1.2',
      generatedAt: 'Sun Sep 27 15:54:02 2026 Pasadena, USA',
    });
    expect(fixtures.ephemeris).toBe('DE441');
  });

  it('rejects a run whose responses come from different ephemerides', async () => {
    const lastOnDe440 = (params: URLSearchParams) =>
      params.get('COMMAND') === "'8'"
        ? fakeResult(params).replace('{source: DE441}', '{source: DE440}')
        : fakeResult(params);
    await expect(generatePlanetFixtures(recordingClient(lastOnDe440).client)).rejects.toThrow(
      /mixed ephemerides/,
    );
  });

  it('rejects a run that straddles a Horizons API version change', async () => {
    let calls = 0;
    const client: HorizonsClient = {
      async fetchResponse(params) {
        calls += 1;
        return { resultText: fakeResult(params), apiVersion: calls === 1 ? '1.2' : '1.3' };
      },
    };
    await expect(generatePlanetFixtures(client)).rejects.toThrow(/API version changed/);
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
      expect(fixtures.asteroids[name].provenance).toEqual({
        orbitSolution: 'JPL#1',
        ephemeris: 'DE441',
        perturbers: 'SB441-N16',
        keplerianGmAu3PerDay2: 2.9591220828411951e-4,
      });
    }
  });

  it('rejects states from a different orbit solution than the elements', async () => {
    const newerSolutionForStates = (params: URLSearchParams) =>
      params.get('EPHEM_TYPE') === 'VECTORS'
        ? fakeResult(params).replace('JPL#1', 'JPL#2')
        : fakeResult(params);
    await expect(
      generateAsteroidFixtures(recordingClient(newerSolutionForStates).client),
    ).rejects.toThrow(/orbit solution/);
  });

  it('keeps a spacecraft-derived trajectory, which has no perturber set', async () => {
    const bennuFromMissionTracking = (params: URLSearchParams) =>
      params.get('COMMAND') === "'101955;'"
        ? fakeResult(params)
            .replace(/\{source: (JPL#1|DE441)\}/g, '{source: ORX_merged_DE424}')
            .replace(/^Small perturbers:.*\n/m, '')
        : fakeResult(params);
    const { asteroids } = await generateAsteroidFixtures(
      recordingClient(bennuFromMissionTracking).client,
    );
    expect(asteroids.bennu.provenance).toEqual({
      orbitSolution: 'ORX_merged_DE424',
      ephemeris: 'ORX_merged_DE424',
      perturbers: null,
      keplerianGmAu3PerDay2: 2.9591220828411951e-4,
    });
    expect(asteroids.eros.provenance.ephemeris).toBe('DE441');
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

describe('generateSunOrientationFixtures', () => {
  it("asks for Earth's states, then the Sun seen from Earth, and joins them by date", async () => {
    const { client, commands } = recordingClient();
    const fixtures = await generateSunOrientationFixtures(client);
    expect(commands).toEqual(["'399'", "'10'"]);
    expect(fixtures.samples.map((sample) => sample.jdTdb)).toEqual(SUN_SAMPLE_JD_TDB);
    expect(fixtures.samples[0]).toEqual({
      jdTdb: SUN_SAMPLE_JD_TDB[0],
      earthPositionAu: [1, 2, 3],
      earthHeliographicLatitudeDeg: -2.5,
    });
    expect(fixtures.observerSettings).toMatchObject({ CENTER: "'500@399'", TIME_TYPE: 'TT' });
    expect(fixtures.ephemeris).toBe('DE441');
  });

  it('rejects an observer table that is missing a requested date', async () => {
    const dropLastObserverRow = (params: URLSearchParams) =>
      params.get('EPHEM_TYPE') === 'OBSERVER'
        ? table(
            OBSERVER_HEADER,
            requestedJds(params)
              .slice(0, -1)
              .map((jd) => `${jd}, , , 120.5, -2.5,`),
          )
        : fakeResult(params);
    await expect(
      generateSunOrientationFixtures(recordingClient(dropLastObserverRow).client),
    ).rejects.toThrow(/Requested JDs/);
  });

  it('rejects states and B0 from different ephemerides', async () => {
    const observerOnDe440 = (params: URLSearchParams) =>
      params.get('EPHEM_TYPE') === 'OBSERVER'
        ? fakeResult(params).replace('{source: DE441}', '{source: DE440}')
        : fakeResult(params);
    await expect(
      generateSunOrientationFixtures(recordingClient(observerOnDe440).client),
    ).rejects.toThrow(/mixed ephemerides/);
  });
});
