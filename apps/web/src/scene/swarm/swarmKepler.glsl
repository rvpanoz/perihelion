// The swarm's Kepler solver and orbit position, in float32. swarmKepler.ts mirrors it statement for statement
// and is what the tests check against the float64 engine: change both files together.

const float SWARM_PI = 3.14159265358979;
const float SWARM_TWO_PI = 6.28318530717959;
const int SWARM_NEWTON_STEPS = 6;
// A trail covers 1/24 of its NEO's own period, in 8 steps behind the head. Spacing by orbit fraction, not days,
// keeps trails the same shape at any time rate and still while paused.
const float SWARM_TRAIL_SAMPLES = 8.0;
const float SWARM_TRAIL_SPANS_PER_ORBIT = 24.0;

// One NEO's instanced attributes (built by swarmAttributes.ts).
struct SwarmOrbit {
  vec3 motion;           // eccentricity, mean anomaly at the reference epoch (rad), mean motion (rad/day)
  vec3 perihelionAxisAu; // towards perihelion × a, scene axes
  vec3 minorAxisAu;      // 90° ahead of perihelion × b, scene axes
};

// M from [0, 2π) to [−π, π), the range Mikkola's start is derived for.
float swarmCentredAnomaly(float meanAnomalyRad) {
  return meanAnomalyRad >= SWARM_PI ? meanAnomalyRad - SWARM_TWO_PI : meanAnomalyRad;
}

// Mikkola's cubic starting value (S. Mikkola, "A cubic approximation for Kepler's equation", Celestial
// Mechanics 40, 1987, 329–334): with s ≈ sin(E/3), sin E = 3s − 4s³ turns Kepler's equation into a cubic in s.
// The cube root's sign follows beta; the sign is never 0, so alpha / cubeRoot cannot divide by zero.
float swarmKeplerStart(float meanAnomalyRad, float eccentricity) {
  float denominator = 4.0 * eccentricity + 0.5;
  float alpha = (1.0 - eccentricity) / denominator;
  float beta = 0.5 * meanAnomalyRad / denominator;
  float direction = beta < 0.0 ? -1.0 : 1.0;
  float cubeRoot = direction * pow(abs(beta) + sqrt(beta * beta + alpha * alpha * alpha), 1.0 / 3.0);
  float sinThirdAnomaly = cubeRoot - alpha / cubeRoot;
  // Mikkola's fifth-order correction; s·s·s·s·s because pow() is undefined for a negative base.
  float corrected = sinThirdAnomaly - 0.078 * sinThirdAnomaly * sinThirdAnomaly * sinThirdAnomaly
    * sinThirdAnomaly * sinThirdAnomaly / (1.0 + eccentricity);
  return meanAnomalyRad + eccentricity * corrected * (3.0 - 4.0 * corrected * corrected);
}

// A fixed step count keeps every vertex on the same path (no divergent loops). The slope 1 − e·cos E is at
// least 0.01 because eccentricity is clamped to 0.99 when the attributes are built.
float swarmEccentricAnomaly(float meanAnomalyRad, float eccentricity) {
  float centredRad = swarmCentredAnomaly(meanAnomalyRad);
  float eccentricAnomalyRad = swarmKeplerStart(centredRad, eccentricity);
  for (int step = 0; step < SWARM_NEWTON_STEPS; step++) {
    float residualRad = eccentricAnomalyRad - eccentricity * sin(eccentricAnomalyRad) - centredRad;
    float slope = 1.0 - eccentricity * cos(eccentricAnomalyRad);
    eccentricAnomalyRad = eccentricAnomalyRad - residualRad / slope;
  }
  return eccentricAnomalyRad;
}

// Sun-centred position in scene axes (AU): a(cos E − e)·P + b·sin E·Q, with a·P and b·Q pre-scaled.
vec3 swarmHeliocentricPosition(SwarmOrbit orbit, float elapsedDays) {
  float eccentricity = orbit.motion.x;
  float advancedRad = orbit.motion.y + orbit.motion.z * elapsedDays;
  float meanAnomalyRad = mod(advancedRad, SWARM_TWO_PI);
  float eccentricAnomalyRad = swarmEccentricAnomaly(meanAnomalyRad, eccentricity);
  float alongMajor = cos(eccentricAnomalyRad) - eccentricity;
  float alongMinor = sin(eccentricAnomalyRad);
  return alongMajor * orbit.perihelionAxisAu + alongMinor * orbit.minorAxisAu;
}

// How many days behind the head a trail vertex sits: trailStep / 8 of a trail span, and the period is 2π / n.
float swarmTrailLagDays(float meanMotionRadPerDay, float trailStep) {
  float periodDays = SWARM_TWO_PI / meanMotionRadPerDay;
  return trailStep / SWARM_TRAIL_SAMPLES * periodDays / SWARM_TRAIL_SPANS_PER_ORBIT;
}
