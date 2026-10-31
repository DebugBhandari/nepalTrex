import { useTheme } from '@mui/material/styles';

export function NepalTrexLogo({ className = '', width = 300 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const height = width * 0.45;
  const colors = isDark
    ? {
      far: '#7ED9E7',
      farAlt: '#BFECF3',
      mid: '#3EC5DA',
      midDeep: '#2199AB',
      flagBlue: '#003893',
      flagRed: '#DC143C',
      cutout: '#00111D',
    }
    : {
      far: '#7ED9E7',
      farAlt: '#BFECF3',
      mid: '#3EC5DA',
      midDeep: '#15616D',
      flagBlue: '#003893',
      flagRed: '#DC143C',
      cutout: '#FFECD1',
    };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 135"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Mask for negative space text */}
        <mask id="text-mask">
          <rect width="300" height="135" fill="white" />
          <text x="150" y="105" fontFamily="Arial, sans-serif" fontSize="52" fontWeight="900" fill="black" textAnchor="middle">
            NepalTrex
          </text>
        </mask>
      </defs>

      {/* Himalayan Mountain Range with mask applied */}
      <g id="himalayan-mountains" mask="url(#text-mask)">
        {/* Background Mountains - Lighter shades */}
        <path d="M0 110 L40 50 L80 110 Z" fill={colors.far} opacity="0.5" />
        <path d="M60 110 L100 40 L140 110 Z" fill={colors.farAlt} opacity="0.4" />
        <path d="M160 110 L200 45 L240 110 Z" fill={colors.far} opacity="0.5" />
        <path d="M220 110 L260 55 L300 110 Z" fill={colors.farAlt} opacity="0.4" />

        {/* Middle Layer Mountains */}
        <path d="M20 110 L70 25 L120 110 Z" fill={colors.mid} opacity="0.7" />
        <path d="M100 110 L150 20 L200 110 Z" fill={colors.midDeep} opacity="0.8" />
        <path d="M180 110 L230 30 L280 110 Z" fill={colors.mid} opacity="0.6" />

        {/* Main Flag Mountains - Foreground */}
        {/* LEFT: Moon Mountain (Upper Triangle) */}
        <path d="M50 110 L95 15 L140 110 Z" fill="none" stroke={colors.flagBlue} strokeWidth="9" strokeLinejoin="round" />
        <path d="M56 109 L95 27 L134 109 Z" fill="none" stroke={colors.flagRed} strokeWidth="5" strokeLinejoin="round" />

        {/* White Moon Crescent */}
        <circle cx="95" cy="55" r="8" fill="#FFECD1" />
        <circle cx="97.5" cy="55" r="7" fill={colors.cutout} />

        {/* RIGHT: Sun Mountain (Lower Triangle) */}
        <path d="M160 110 L205 15 L250 110 Z" fill="none" stroke={colors.flagBlue} strokeWidth="9" strokeLinejoin="round" />
        <path d="M166 109 L205 27 L244 109 Z" fill="none" stroke={colors.flagRed} strokeWidth="5" strokeLinejoin="round" />

        {/* White Sun */}
        <g id="sun">
          <circle cx="205" cy="55" r="8" fill="#FFECD1" />
          <path d="M205 45 L205 41 M205 69 L205 65 M215 55 L219 55 M191 55 L195 55" stroke="#FFECD1" strokeWidth="2" strokeLinecap="round" />
          <path d="M210.5 49.5 L213.5 46.5 M199.5 60.5 L196.5 63.5 M210.5 60.5 L213.5 63.5 M199.5 49.5 L196.5 46.5" stroke="#FFECD1" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

export default NepalTrexLogo;