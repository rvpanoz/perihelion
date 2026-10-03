export interface DataSource {
  name: string;
  href: string;
  use: string;
}

/** The live sources the app shows data from; the help dialog's Credits add the rest. */
export const LIVE_DATA_SOURCES: readonly DataSource[] = [
  {
    name: 'JPL SBDB Query API',
    href: 'https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html',
    use: 'orbits of the near-Earth asteroids',
  },
  {
    name: 'JPL Close Approach Data API',
    href: 'https://ssd-api.jpl.nasa.gov/doc/cad.html',
    use: 'this week’s close approaches',
  },
  {
    name: 'NASA DONKI (CCMC)',
    href: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    use: 'coronal mass ejections',
  },
];
