import { useId } from 'react';

export function NepalTrexLogo({ className = '', width = 300 }) {
  const height = width * 0.45;
  const id = useId().replace(/[:]/g, '');
  const maskId = `text-mask-${id}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 135"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="NepalTrex"
    >
      <defs>
        <mask id={maskId}>
          <rect width="300" height="135" fill="white" />
          <text
            x="150"
            y="88"
            fontFamily="Arial, sans-serif"
            fontSize="44"
            fontWeight="900"
            fill="black"
            textAnchor="middle"
          >
            NepalTrex
          </text>
        </mask>
      </defs>

      <g id="himalayan-mountains" mask={`url(#${maskId})`}>
        <path d="M0 110 L40 50 L80 110 Z" fill="#7B92B8" opacity="0.5" />
        <path d="M60 110 L100 40 L140 110 Z" fill="#8FA3C4" opacity="0.4" />
        <path d="M160 110 L200 45 L240 110 Z" fill="#7B92B8" opacity="0.5" />
        <path d="M220 110 L260 55 L300 110 Z" fill="#8FA3C4" opacity="0.4" />

        <path d="M20 110 L70 25 L120 110 Z" fill="#5B7FA8" opacity="0.7" />
        <path d="M100 110 L150 20 L200 110 Z" fill="#4A6FA5" opacity="0.8" />
        <path d="M180 110 L230 30 L280 110 Z" fill="#6B8AB0" opacity="0.6" />

        <path d="M50 110 L95 15 L140 110 Z" fill="#003893" />
        <path d="M55 110 L95 23 L135 110 Z" fill="#DC143C" />

        <circle cx="95" cy="55" r="8" fill="#FFFFFF" />
        <circle cx="97.5" cy="55" r="7" fill="#DC143C" />

        <path d="M160 110 L205 15 L250 110 Z" fill="#003893" />
        <path d="M165 110 L205 23 L245 110 Z" fill="#DC143C" />

        <g id="sun">
          <circle cx="205" cy="55" r="8" fill="#FFFFFF" />
          <path
            d="M205 45 L205 41 M205 69 L205 65 M215 55 L219 55 M191 55 L195 55"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M210.5 49.5 L213.5 46.5 M199.5 60.5 L196.5 63.5 M210.5 60.5 L213.5 63.5 M199.5 49.5 L196.5 46.5"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}

export default NepalTrexLogo;