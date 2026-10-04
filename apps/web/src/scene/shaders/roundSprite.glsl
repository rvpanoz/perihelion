// The soft round sprite every gl.POINTS layer draws: alpha holds at 1 inside `core` of the radius and falls to 0
// at the edge. `core` 0 falls off from the centre (the swarm's look); a higher core is a solid disc with a soft rim.

float roundSpriteAlpha(vec2 pointCoord, float core) {
  float fromCentre = length(pointCoord - 0.5) * 2.0;
  return 1.0 - smoothstep(core, 1.0, fromCentre);
}
