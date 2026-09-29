import { PLANETS } from '@perihelion/orbit';
import { Body } from './Body';
import { BODY_IDS } from './bodyCatalog';
import { BodyPositionsUpdater } from './BodyPositionsUpdater';
import { OrbitLine } from './OrbitLine';

export function SolarSystem() {
  return (
    <>
      <BodyPositionsUpdater />
      {BODY_IDS.map((body) => (
        <Body key={body} body={body} />
      ))}
      {PLANETS.map((planet) => (
        <OrbitLine key={planet} planet={planet} />
      ))}
    </>
  );
}
