/** The count is the one fact here, from the data; everything the eye reads as style is labelled illustrative. */
export function openingCaptionText(neoCount: number): string {
  const count = neoCount.toLocaleString('en-US');
  return `Orbits of ${count} near-Earth asteroids from JPL SBDB · Colours, sizes and trails are illustrative`;
}
