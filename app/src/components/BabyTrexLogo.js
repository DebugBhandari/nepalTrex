export function BabyTrexLogo({ size = 48, color = '#0f2b2d' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="NepalTrex logo"
    >
      <defs>
        <linearGradient id="ntx-bg" x1="12" y1="12" x2="108" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0b429" />
          <stop offset="1" stopColor="#c98e1f" />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="104" height="104" rx="26" fill="url(#ntx-bg)" />
      <rect x="8" y="8" width="104" height="104" rx="26" stroke="rgba(15,43,45,0.16)" strokeWidth="2" />

      <path d="M24 79 44 47 57 66 73 37 96 79" fill={color} fillOpacity="0.2" />
      <path d="M57 66 62 57 66 66Z" fill="#f8f4eb" fillOpacity="0.9" />

      <path
        d="M34 82c10-16 21-24 35-24 12 0 22 5 32 16"
        stroke={color}
        strokeOpacity="0.34"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M41 71c4-9 13-17 26-17 8 0 14 2 20 7l-6 4c-4-3-8-4-14-4-8 0-15 5-18 11h15l-8 6H35v-3c0-1 5-3 6-4Z"
        fill={color}
      />
      <circle cx="70" cy="59" r="2.5" fill="#f8f4eb" />
      <path d="M75 62c3 1 5 2 7 4" stroke="#f8f4eb" strokeOpacity="0.88" strokeWidth="2" strokeLinecap="round" />

      <path d="M34 88h52" stroke={color} strokeOpacity="0.42" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function BabyTrexLogoWithText({ size = 48, color = '#0f2b2d' }) {
  const textSize = Math.max(16, Math.round(size * 0.48));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <BabyTrexLogo size={size} color={color} />
      <span
        style={{
          fontSize: `${textSize}px`,
          fontWeight: 800,
          letterSpacing: '0.02em',
          lineHeight: 1,
          color,
          fontFamily: '"Trebuchet MS", "Avenir Next", "Segoe UI", sans-serif',
        }}
      >
        NepalTrex
      </span>
    </div>
  );
}

export default BabyTrexLogo;
