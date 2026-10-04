# Accuracy

Perihelion's orbit engine (`packages/orbit`) is a small two-body and mean-element model, not an ephemeris. This page
lists how far it is from JPL, and how that is checked. Values shown in the app as facts (distances, speeds, dates)
always come from JPL or DONKI, never from the engine; the engine places things on screen.

## How it is checked

- Ground truth comes from JPL Horizons and is committed as JSON in `packages/fixtures/data/`, together with its
  provenance (Horizons version, ephemeris, orbit solution). `npm run fixtures` regenerates it; tests never use the
  network.
- Most tolerances below are the worst error measured against that ground truth, times a margin of 1.25 for harmless
  numeric changes (solver iterations, operation order); a real bug moves the error far more than that. The rest are
  fixed bounds or exact, as their row says.
- Fixtures and tolerances are never edited to make a test pass. A pull request that changes a fixture or loosens a
  tolerance is blocked until the maintainer approves it.

## Tolerances

| Test                                    | Tolerance                    | Rationale                                                                                    |
| --------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Planets vs Horizons: Mercury            | 31.4″ / 2.91″ / 2,250 km     | Measured 25.1″ / 2.33″ / 1,800 km × 1.25; Standish nominal 15″ / 1″ / 1,000 km               |
| Planets vs Horizons: Venus              | 31.5″ / 1.88″ / 7,000 km     | Measured 25.2″ / 1.50″ / 5,600 km × 1.25; Standish nominal 20″ / 1″ / 4,000 km               |
| Planets vs Horizons: EM barycentre      | 24.6″ / 2.03″ / 8,875 km     | Measured 19.7″ / 1.62″ / 7,100 km × 1.25; Standish nominal 20″ / 8″ / 6,000 km               |
| Planets vs Horizons: Mars               | 73.5″ / 1.71″ / 30,125 km    | Measured 58.8″ / 1.37″ / 24,100 km × 1.25; Standish nominal 40″ / 2″ / 25,000 km             |
| Planets vs Horizons: Jupiter            | 568″ / 8.88″ / 711,125 km    | Measured 454.6″ / 7.10″ / 568,900 km × 1.25; Standish nominal 400″ / 10″ / 600,000 km        |
| Planets vs Horizons: Saturn             | 891″ / 28.7″ / 3,502,375 km  | Measured 712.7″ / 22.95″ / 2,801,900 km × 1.25; Standish nominal 600″ / 25″ / 1,500,000 km   |
| Planets vs Horizons: Uranus             | 127″ / 4.39″ / 1,676,875 km  | Measured 101.9″ / 3.51″ / 1,341,500 km × 1.25; Standish nominal 50″ / 2″ / 1,000,000 km      |
| Planets vs Horizons: Neptune            | 73.9″ / 2.09″ / 1,571,375 km | Measured 59.1″ / 1.67″ / 1,257,100 km × 1.25; Standish nominal 10″ / 1″ / 200,000 km         |
| Asteroids vs Horizons: Eros             | 7.06e-5 AU over ±120 d       | Measured 5.65e-5 AU × 1.25 (JPL#659)                                                         |
| Asteroids vs Horizons: Apophis          | 2.44e-5 AU over ±120 d       | Measured 1.95e-5 AU × 1.25 (JPL#220)                                                         |
| Asteroids vs Horizons: Bennu            | 4.31e-5 AU over ±120 d       | Measured 3.45e-5 AU × 1.25 (ORX_merged_DE424)                                                |
| Asteroids vs Horizons: Ryugu            | 2.95e-5 AU over ±120 d       | Measured 2.36e-5 AU × 1.25 (JPL#270)                                                         |
| Asteroids vs Horizons: Phaethon         | 6.15e-5 AU over ±120 d       | Measured 4.92e-5 AU × 1.25 (JPL#1003; e = 0.89, q = 0.14 AU)                                 |
| Asteroids vs Horizons: Aten             | 2.15e-5 AU over ±120 d       | Measured 1.72e-5 AU × 1.25 (JPL#149)                                                         |
| Asteroids vs Horizons: Atira            | 4.18e-5 AU over ±120 d       | Measured 3.34e-5 AU × 1.25 (JPL#225)                                                         |
| Asteroids vs Horizons: project target   | 1e-3 AU within ±60 d         | Project target; worst measured 1.42e-5 AU (Eros), ~70× inside                                |
| Asteroids: elements → state at epoch    | 1e-12 AU / 1e-12 AU/day      | Fixed bound (15 cm); measured ≤ 3e-15 AU / 6e-14 AU/day                                      |
| Asteroids: Horizons Keplerian GM vs k²  | 1e-11 relative               | Measured 5e-12                                                                               |
| Swarm float32 vs engine: within ±10 yr  | 1.71e-5 AU                   | Measured 1.37e-5 AU × 1.25 (2,006 NEOs, seed 20260930); 1 px ≈ 0.002 AU at the overview      |
| Swarm float32 vs engine: 1800 / 2050    | 4.73e-4 AU                   | Measured 3.78e-4 AU × 1.25 (2,006 NEOs, seed 20260930); 1 px ≈ 0.002 AU at the overview      |
| Close approach: engine vs CAD           | 15,700 km / 86 min           | Measured 12,509 km (2026 RN15) / 68.8 min (2026 SA8) × 1.25 over 19 recorded rows; absolute  |
| B0 vs Horizons: pole (Horizons Earth)   | 8.7e-7°                      | Measured 6.96e-7° (2026-07-01) × 1.25 over 12 monthly 2026 dates; Horizons prints 6 decimals |
| B0 vs Horizons: engine EMB end to end   | 7.3e-4°                      | Measured 5.84e-4° (2026-10-01) × 1.25 over 12 monthly 2026 dates                             |
| CME front vs DONKI: 21.5 R☉ at time21_5 | exact                        | Measured 0 over 77 recorded CMEs (2026-10-01); holds by construction                         |
| CME front vs DONKI: Earth at ENLIL time | exact                        | Measured 0 over the 13 CMEs with an ENLIL Earth arrival; mean transit speed meets both times |
| CME front vs DONKI: measured speed      | exact                        | Measured 0 over the 64 CMEs without an ENLIL Earth arrival                                   |
| Exit: drawn CME axis vs DONKI angle     | 5.6e-16 rad                  | Measured 4.4e-16 rad × 1.25 over 77 recorded CMEs (float64 rounding of one rotation)         |
| Exit: shell vs DONKI half-angle         | ≤ α; widest ≥ 0.9999895 α    | Measured: none outside (worst 1.4e-6 rad inside); widest ≥ 0.9999916 α, shortfall × 1.25     |
| Exit: drawn front vs DONKI/ENLIL times  | exact                        | Measured 0 at time21_5 (77) and at ENLIL's arrival (13), through the web's time conversion   |

Planet tolerances are heliocentric longitude / latitude / distance, the units of Standish's accuracy table
(<https://ssd.jpl.nasa.gov/planets/approx_pos.html>): the worst case over 27 dates (1 January of every decade
1800–2050, plus J2000) × 1.25 (`TOLERANCE_MARGIN` in `planets.golden.test.ts`).

Asteroid tolerances are the 3D heliocentric position error of two-body propagation from Horizons osculating elements at
JD 2461000.5 (2025-11-21), worst over 0, ±10, ±30, ±60 and ±120 days × 1.25 (`TOLERANCE_MARGIN` in
`asteroids.golden.test.ts`).

## Why the planets exceed Standish's published errors

Against DE441 (Sun-centred), the engine exceeds the page's _nominal_ 1800–2050 errors by 1.1–2.3×, and Neptune by
about 6×. Nothing points to an engine bug:

- All 96 Table 1 constants in `planets.ts` match JPL's page (numeric diff by script), and the formulae follow the page.
- The error oscillates around zero with no drift away from J2000: Saturn ±700″ over about 60 years (Jupiter–Saturn
  perturbations), Neptune ±50″ (about the Sun's Jupiter-driven wobble seen from 30 AU). That is periodic perturbation
  a mean-element fit cannot model.
- Measured from the solar-system barycentre instead, Neptune falls to about its published bound, while the inner
  planets get about 100× worse. The engine and fixtures stay heliocentric.

## Engine vs JPL's Close Approach Data

The close-approach tolerance (15,700 km / 86 min) is absolute: two-body motion leaves out Earth's pull, and the
Standish "Earth" is the Earth–Moon barycentre (up to 4,670 km from Earth's centre), so the error does not shrink with
distance. The engine only places the marker and the trail; the distance, speed and date on the card come from CAD.
