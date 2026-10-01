import { useId } from 'react';

/** The mockup's mark: the Sun's glow inside a tilted orbit, with one small body on it. */
export function Brand() {
  const glowId = useId();
  return (
    <div className="brand">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0" stopColor="#fff" />
            <stop offset=".45" stopColor="#ffd27a" />
            <stop offset="1" stopColor="#ff8a4c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx="17"
          cy="17"
          rx="15"
          ry="7.5"
          fill="none"
          stroke="#5ad1ff"
          strokeOpacity=".7"
          strokeWidth="1.2"
          transform="rotate(-22 17 17)"
        />
        <circle cx="13" cy="18" r="6" fill={`url(#${glowId})`} />
        <circle cx="30" cy="11.5" r="2.2" fill="#5ad1ff" />
      </svg>
      <div>
        <p className="brand-word">PERIHELION</p>
        <p className="brand-tagline">The live solar system · NASA / JPL data</p>
      </div>
    </div>
  );
}
