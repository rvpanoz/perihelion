import {
  CAD_MAX_DISTANCE_AU,
  DEFAULT_CLOSE_APPROACH_DAYS,
  DEFAULT_CME_DAYS,
} from '@perihelion/data';
import { KM_PER_AU } from '@perihelion/orbit';
import { KM_PER_LUNAR_DISTANCE } from '../approaches/approachFormat';
import { LIVE_DATA_SOURCES } from '../shell/dataSources';
import { RELEASE_STILLS, type Still } from '../shell/releaseStills';

export type HelpTabId = 'seeing' | 'shots' | 'real' | 'glossary' | 'credits';

/** A term and what it means: a glossary entry, a shot, a credited source. */
export interface HelpEntry {
  term: string;
  text: string;
  link?: string;
  still?: Still;
}

export interface HelpTab {
  id: HelpTabId;
  title: string;
  intro: readonly string[];
  entries: readonly HelpEntry[];
}

const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const CAD_CUT_LD = Math.round((CAD_MAX_DISTANCE_AU * KM_PER_AU) / KM_PER_LUNAR_DISTANCE);
const [SWARM_STILL, APPROACH_STILL, ERUPTION_STILL] = RELEASE_STILLS;

const SEEING: HelpTab = {
  id: 'seeing',
  title: "What you're seeing",
  intro: [
    'The Sun, the planets and every known near-Earth asteroid, moving on their real orbits. The dots in the swarm are asteroids, coloured by orbit class; the legend gives the colours and how many there are of each.',
    `On the left are the asteroids passing close to Earth within ${DEFAULT_CLOSE_APPROACH_DAYS} days either side of today, and the eruptions from the Sun (coronal mass ejections) of the last ${DEFAULT_CME_DAYS} days. Pick one to watch it.`,
    'The bar at the bottom runs the clock: play, pause, speed it up or scrub to another date. Drag to turn the camera, scroll or pinch to zoom, and use the buttons at the top to fly to a planet.',
    'The pill at the top right says whether the data is live, stale or from the snapshot bundled with the app.',
  ],
  entries: [],
};

const SHOTS: HelpTab = {
  id: 'shots',
  title: 'The three shots',
  intro: [],
  entries: [
    {
      term: 'The Swarm',
      text: 'Every near-Earth asteroid in JPL’s catalog on its real orbit. The opening pulls back from Earth to show it; any click, scroll or key press skips it.',
      still: SWARM_STILL,
    },
    {
      term: 'The Close Approach',
      text: 'Pick an asteroid from the list and the clock jumps to its pass while the camera follows it. The card shows JPL’s distance, speed, time and size, with a small Earth-centred close-up.',
      still: APPROACH_STILL,
    },
    {
      term: 'The Eruption',
      text: 'Pick a CME to watch it leave the Sun and travel outwards, with the speed, direction and width DONKI reports. When DONKI’s ENLIL model predicts an arrival at Earth, the shot shows it.',
      still: ERUPTION_STILL,
    },
  ],
};

const REAL: HelpTab = {
  id: 'real',
  title: 'Real vs illustrative',
  intro: [
    'Numbers shown as facts come from JPL or DONKI: the asteroid count, distances, speeds, times, sizes and CME arrivals.',
    'Positions are worked out by Perihelion’s own orbit engine from JPL’s orbits and the planets’ standard elements, and tested against JPL Horizons. They are close, not exact: the card’s figures are JPL’s own.',
    'An asteroid’s size is JPL’s measurement when there is one. Otherwise it is a range estimated from its brightness, marked “est.”.',
  ],
  entries: [
    {
      term: 'Illustrative',
      text: 'Sizes and brightness of the swarm’s dots, their colours and trails, the planets’ colours, the motion of the Sun’s surface, the markers drawn over Earth, the close-up, the CME’s particle shell (DONKI’s cone model made visible), the magnetosphere and the aurora.',
    },
  ],
};

const GLOSSARY: HelpTab = {
  id: 'glossary',
  title: 'Glossary',
  intro: [],
  entries: [
    {
      term: 'Near-Earth asteroid (NEA)',
      text: 'An asteroid whose closest point to the Sun (perihelion, q) is under 1.3 au.',
    },
    { term: 'Atira', text: 'Orbit entirely inside Earth’s: a < 1.0 au and Q < 0.983 au.' },
    {
      term: 'Aten',
      text: 'Crosses Earth’s orbit, smaller than Earth’s: a < 1.0 au and Q > 0.983 au.',
    },
    {
      term: 'Apollo',
      text: 'Crosses Earth’s orbit, larger than Earth’s: a > 1.0 au and q < 1.017 au.',
    },
    {
      term: 'Amor',
      text: 'Between Earth and Mars, never crossing Earth’s orbit: a > 1.0 au and 1.017 < q < 1.3 au.',
    },
    {
      term: 'a, q, Q',
      text: 'An orbit’s semi-major axis, its closest point to the Sun (perihelion) and its farthest (aphelion). Class bounds are CNEOS’s.',
    },
    {
      term: 'au',
      text: `Astronomical unit, about the Earth–Sun distance: ${GROUPED.format(KM_PER_AU)} km.`,
    },
    {
      term: 'LD',
      text: `Lunar distance, the Moon’s mean distance from Earth: ${GROUPED.format(KM_PER_LUNAR_DISTANCE)} km.`,
    },
    {
      term: 'Close approach',
      text: `An asteroid passing within ${CAD_MAX_DISTANCE_AU} au (about ${CAD_CUT_LD} LD) of Earth, as listed by JPL’s Close Approach Data.`,
    },
    {
      term: 'CME',
      text: 'Coronal mass ejection: a cloud of charged gas thrown out of the Sun’s corona.',
    },
    {
      term: 'ENLIL',
      text: 'WSA-ENLIL, a model of the solar wind that DONKI runs to forecast whether and when a CME reaches Earth.',
    },
    {
      term: 'Absolute magnitude (H)',
      text: 'How bright an asteroid would be at a standard distance; larger H means smaller.',
    },
  ],
};

const CREDITS: HelpTab = {
  id: 'credits',
  title: 'Credits',
  intro: [
    'The data, imagery and software Perihelion is built on. Live data reaches the app only through Perihelion’s own server, and none of these sources needs an API key.',
  ],
  entries: [
    ...LIVE_DATA_SOURCES.map(({ name, href, use }) => ({ term: name, text: use, link: href })),
    {
      term: 'JPL Small-Body Database API',
      text: 'orbits of approaching asteroids missing from the catalog',
      link: 'https://ssd-api.jpl.nasa.gov/doc/sbdb.html',
    },
    {
      term: 'WSA-ENLIL (via DONKI)',
      text: 'CME arrival forecasts',
      link: 'https://ccmc.gsfc.nasa.gov/models/ENLIL~2.9e/',
    },
    {
      term: 'JPL Horizons',
      text: 'ground-truth positions the orbit engine is tested against',
      link: 'https://ssd.jpl.nasa.gov/horizons/',
    },
    {
      term: 'JPL Approximate Positions of the Planets (Standish)',
      text: 'the planets’ orbital elements',
      link: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    },
    {
      term: 'NASA Blue Marble Next Generation',
      text: 'the Earth texture (NASA Earth Observatory, public domain)',
      link: 'https://earthobservatory.nasa.gov/features/BlueMarble',
    },
    {
      term: 'three.js, React Three Fiber, drei, postprocessing',
      text: 'the 3D rendering (MIT licence)',
      link: 'https://threejs.org/',
    },
    {
      term: 'GPL-3.0-or-later',
      text: 'Perihelion is free software under the GNU General Public License, version 3 or later. The source is on GitHub.',
      link: 'https://github.com/rvpanoz/perihelion',
    },
  ],
};

export const HELP_TABS: readonly HelpTab[] = [SEEING, SHOTS, REAL, GLOSSARY, CREDITS];
