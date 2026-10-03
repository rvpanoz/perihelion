import { Brand } from './Brand';
import { LIVE_DATA_SOURCES } from './dataSources';
import { RELEASE_STILLS } from './releaseStills';

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
      {RELEASE_STILLS.map(({ caption, ...image }) => (
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
        {LIVE_DATA_SOURCES.map(({ name, href, use }) => (
          <li key={href}>
            <a href={href}>{name}</a>: {use}
          </li>
        ))}
      </ul>
    </section>
  );
}
