import { Brand } from './Brand';

interface Still {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

/** Frames from the release notes, re-encoded as WebP (≤ 200 KB each); sizes are given so nothing jumps as they load. */
const STILLS: readonly Still[] = [
  {
    src: '/stills/swarm.webp',
    alt: 'Tens of thousands of asteroid trails swirling around the Sun, inside the orbits of the inner planets',
    caption: 'The Swarm: every known near-Earth asteroid on its real orbit',
    width: 1280,
    height: 605,
  },
  {
    src: '/stills/close-approach.webp',
    alt: 'An asteroid passing Earth, with the list of this week’s close approaches and a card of JPL’s figures',
    caption: 'The Close Approach: this week’s passes, with JPL’s distance, speed and size',
    width: 1280,
    height: 602,
  },
  {
    src: '/stills/eruption.webp',
    alt: 'A cone of glowing particles leaving the Sun: a coronal mass ejection',
    caption: 'The Eruption: a CME leaving the Sun, drawn from DONKI’s cone model',
    width: 990,
    height: 520,
  },
];

const SOURCES: readonly { name: string; href: string; use: string }[] = [
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

/** Shown instead of the app when the browser has no WebGL2: no canvas, so no WebGL context is ever created. */
export function NoWebGlNotice() {
  return (
    <main className="no-webgl">
      <Brand />
      <h1>Perihelion needs WebGL 2</h1>
      <p>
        Perihelion is a 3D solar system in the browser, driven by live NASA/JPL data: the known
        near-Earth asteroids on their real orbits, this week’s close approaches to Earth and recent
        eruptions from the Sun.
      </p>
      <p>
        This browser or device does not offer WebGL 2, which Perihelion needs to draw the scene.
        Turning on hardware acceleration in the browser’s settings, or opening the page in a current
        Chrome, Edge, Firefox or Safari, usually fixes it.
      </p>
      <StillGallery />
      <SourceList />
    </main>
  );
}

function StillGallery() {
  return (
    <section aria-label="What it looks like" className="no-webgl-stills">
      {STILLS.map(({ caption, ...image }) => (
        <figure key={image.src}>
          <img {...image} loading="lazy" decoding="async" />
          <figcaption>{caption}</figcaption>
        </figure>
      ))}
    </section>
  );
}

function SourceList() {
  return (
    <section aria-labelledby="no-webgl-sources">
      <h2 id="no-webgl-sources">Where the data comes from</h2>
      <ul>
        {SOURCES.map(({ name, href, use }) => (
          <li key={href}>
            <a href={href}>{name}</a>: {use}
          </li>
        ))}
      </ul>
    </section>
  );
}
