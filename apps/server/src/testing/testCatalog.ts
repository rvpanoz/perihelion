import { type NeoCatalog, jplColumnarResponseSchema, toCloseApproaches } from '@perihelion/data';
import { RECORDED_CAD_WINDOW } from '@perihelion/fixtures/upstream';

/** The designations in the recorded CAD window, earliest approach first (CAD rows are sorted by time). */
export const RECORDED_CAD_DESIGNATIONS: readonly string[] = toCloseApproaches(
  jplColumnarResponseSchema.parse(RECORDED_CAD_WINDOW),
).map((approach) => approach.designation);

/** A catalog holding exactly these designations, each on the same Eros-like orbit. */
export function neoCatalogOf(designations: readonly string[]): NeoCatalog {
  const each = <T>(value: T): T[] => designations.map(() => value);
  return {
    count: designations.length,
    designation: [...designations],
    name: each(null),
    epochJdTdb: each(2461000.5),
    eccentricity: each(0.22283594),
    semiMajorAxisAu: each(1.458121),
    inclinationDeg: each(10.828467),
    longitudeOfAscendingNodeDeg: each(304.270103),
    argumentOfPerihelionDeg: each(178.929754),
    meanAnomalyDeg: each(310.554328),
    absoluteMagnitude: each(20),
    orbitClass: each('AMO' as const),
  };
}
