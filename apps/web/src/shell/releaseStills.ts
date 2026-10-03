export interface Still {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

/**
 * Frames from the release notes, re-encoded as WebP (≤ 200 KB each), shown when the scene cannot run and in the help
 * dialog. Sizes are given so nothing jumps as they load.
 */
export const RELEASE_STILLS: readonly Still[] = [
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
