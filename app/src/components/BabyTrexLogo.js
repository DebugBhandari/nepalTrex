/**
 * Baby T-Rex Trekking Logo
 * A cute baby dinosaur character trekking in the Himalayas
 */
export function BabyTrexLogo({ size = 48, color = '#0f2b2d' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Mountains in background */}
      <path
        d="M 20 180 L 60 100 L 100 150 L 150 60 L 200 180"
        fill={color}
        opacity="0.1"
      />

      {/* Snow cap on mountain */}
      <path
        d="M 60 100 L 80 120 L 40 120 Z"
        fill="#f8f4eb"
      />

      {/* Baby T-Rex Body - Rounded and cute */}
      <ellipse cx="100" cy="140" rx="35" ry="30" fill={color} />

      {/* Baby T-Rex Head - Round and friendly */}
      <circle cx="100" cy="90" r="28" fill={color} />

      {/* Cute snout */}
      <ellipse cx="120" cy="92" rx="12" ry="10" fill={color} />

      {/* Eyes - Large and friendly */}
      <circle cx="95" cy="82" r="5" fill="#f0b429" />
      <circle cx="95" cy="82" r="3" fill="#102023" />
      <circle cx="110" cy="82" r="5" fill="#f0b429" />
      <circle cx="110" cy="82" r="3" fill="#102023" />

      {/* Eye shine - cute sparkle */}
      <circle cx="96" cy="80" r="1.5" fill="#f8f4eb" opacity="0.8" />
      <circle cx="111" cy="80" r="1.5" fill="#f8f4eb" opacity="0.8" />

      {/* Mouth - cute smile */}
      <path
        d="M 100 100 Q 105 105 112 103"
        stroke="#f0b429"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Tiny T-Rex arms */}
      <ellipse cx="80" cy="130" rx="8" ry="18" fill={color} />
      <ellipse cx="120" cy="130" rx="8" ry="18" fill={color} />

      {/* Hand with backpack straps */}
      <circle cx="78" cy="148" r="5" fill={color} />
      <circle cx="122" cy="148" r="5" fill={color} />

      {/* Backpack straps (crossing) */}
      <line x1="95" y1="105" x2="78" y2="148" stroke="#1e6f5c" strokeWidth="3" />
      <line x1="105" y1="105" x2="122" y2="148" stroke="#1e6f5c" strokeWidth="3" />

      {/* Backpack - cute hiking backpack */}
      <rect x="85" y="110" width="30" height="28" rx="4" fill="#1e6f5c" />
      
      {/* Backpack pocket */}
      <rect x="90" y="115" width="20" height="15" rx="2" fill="#173b3f" opacity="0.7" />

      {/* Tail - curved and playful */}
      <path
        d="M 130 145 Q 155 140 160 120"
        stroke={color}
        strokeWidth="16"
        fill="none"
        strokeLinecap="round"
      />

      {/* Tail spikes - cute ridges */}
      <ellipse cx="140" cy="132" rx="8" ry="4" fill={color} />
      <ellipse cx="150" cy="125" rx="6" ry="3" fill={color} />

      {/* Legs */}
      <ellipse cx="85" cy="170" rx="10" ry="20" fill={color} />
      <ellipse cx="115" cy="170" rx="10" ry="20" fill={color} />

      {/* Feet - with hiking boots */}
      <ellipse cx="85" cy="192" rx="12" ry="8" fill="#f0b429" />
      <ellipse cx="115" cy="192" rx="12" ry="8" fill="#f0b429" />

      {/* Boot details */}
      <ellipse cx="85" cy="192" rx="10" ry="6" fill="#0f2b2d" opacity="0.3" />
      <ellipse cx="115" cy="192" rx="10" ry="6" fill="#0f2b2d" opacity="0.3" />

      {/* Hiking poles - one in each hand */}
      <line x1="76" y1="150" x2="72" y2="200" stroke="#f0b429" strokeWidth="2" />
      <line x1="124" y1="150" x2="128" y2="200" stroke="#f0b429" strokeWidth="2" />

      {/* Pole handles - small circles */}
      <circle cx="76" cy="149" r="2" fill="#f8f4eb" />
      <circle cx="124" cy="149" r="2" fill="#f8f4eb" />

      {/* Pole tips */}
      <circle cx="72" cy="201" r="2" fill="#f0b429" />
      <circle cx="128" cy="201" r="2" fill="#f0b429" />

      {/* Mountain flag on pole - tiny Nepal flag vibes */}
      <rect x="69" y="160" width="4" height="6" fill="#f0b429" />
      <polygon points="73,160 77,162 73,164" fill="#1e6f5c" />

      {/* Snow accumulation on head - playful */}
      <ellipse cx="100" cy="60" rx="8" ry="6" fill="#f8f4eb" />
      <circle cx="95" cy="58" r="3" fill="#f8f4eb" />
      <circle cx="105" cy="57" r="2.5" fill="#f8f4eb" />
    </svg>
  );
}

// Text + Icon Logo variant
export function BabyTrexLogoWithText({ size = 48, color = '#0f2b2d' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <BabyTrexLogo size={size} color={color} />
      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color }}>NepalTrex</span>
    </div>
  );
}

export default BabyTrexLogo;
