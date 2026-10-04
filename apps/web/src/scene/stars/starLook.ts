/**
 * The starfield's look. Where each star is drawn is real — the Yale Bright Star Catalogue's J2000 positions — but
 * how big and how bright it is drawn is illustrative: a display cannot span the 1,500:1 range between Sirius and a
 * sixth-magnitude star, so size and brightness fall along a straight line over the magnitude range, as the swarm's
 * do over absolute magnitude.
 */
export const STAR_LOOK = {
  /**
   * The shell the stars sit on, inside the camera's 1,000 AU far plane. The group follows the camera, so the sky
   * never moves with it: only turning the camera turns the stars.
   */
  radiusAu: 900,
  /** Visual magnitude at the bright and faint ends of the drawn range; the file holds nothing fainter than 6.5. */
  magnitudeRange: { brightest: -1.5, faintest: 6.5 },
  /** Point size in CSS pixels at those ends. */
  pointSizePx: { brightest: 3.2, faintest: 1.1 },
  /** Brightness at those ends. The brightest stops at 1 so no star reaches bloom's threshold (`BLOOM_SETTINGS`). */
  brightness: { brightest: 1, faintest: 0.22 },
  /** B−V colour index at the blue and red ends of the ramp; 0 is an A0 star, white by definition. */
  colorIndexRange: { blue: -0.3, red: 1.6 },
  blueColor: [0.72, 0.8, 1],
  neutralColor: [1, 0.98, 0.95],
  redColor: [1, 0.76, 0.56],
} as const;
