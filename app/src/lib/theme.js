// NepalTrex brand palette. Numeric stops are provided for consistent UI states.
export const palette = {
  inkBlack: { DEFAULT: '#001524', 100: '#000407', 200: '#00080E', 300: '#000C15', 400: '#00111D', 500: '#001524', 600: '#004C83', 700: '#0083E1', 800: '#41B0FF', 900: '#A0D7FF' },
  stormyTeal: { DEFAULT: '#15616D', 100: '#041315', 200: '#08262B', 300: '#0C3940', 400: '#104C56', 500: '#15616D', 600: '#2199AB', 700: '#3EC5DA', 800: '#7ED9E7', 900: '#BFECF3' },
  papayaWhip: { DEFAULT: '#FFECD1', 100: '#5D3600', 200: '#BA6C00', 300: '#FF9F17', 400: '#FFC574', 500: '#FFECD1', 600: '#FFF0DA', 700: '#FFF4E3', 800: '#FFF7ED', 900: '#FFFBF6' },
  vividTangerine: { DEFAULT: '#FF7D00', 100: '#331900', 200: '#663100', 300: '#994A00', 400: '#CC6300', 500: '#FF7D00', 600: '#FF9633', 700: '#FFB066', 800: '#FFCA99', 900: '#FFE5CC' },
  brandy: { DEFAULT: '#78290F', 100: '#180803', 200: '#2F1006', 300: '#471809', 400: '#5E200C', 500: '#78290F', 600: '#B93F17', 700: '#E66235', 800: '#EE9679', 900: '#F7CBBC' },
};

export const themeColors = {
  deepTeal: palette.inkBlack.DEFAULT,
  midTeal: palette.stormyTeal.DEFAULT,
  goldSun: palette.vividTangerine.DEFAULT,
  snow: palette.papayaWhip.DEFAULT,
  ink: palette.inkBlack.DEFAULT,
  moss: palette.stormyTeal.DEFAULT,
  card: palette.papayaWhip[900],
  primary: palette.stormyTeal.DEFAULT,
  secondary: palette.vividTangerine.DEFAULT,
  dark: palette.inkBlack.DEFAULT,
  light: palette.papayaWhip.DEFAULT,
  accent: palette.vividTangerine.DEFAULT,
  success: palette.stormyTeal[600],
  warning: palette.vividTangerine.DEFAULT,
  error: palette.brandy.DEFAULT,
  info: palette.inkBlack[700],
};

// Gradients
export const gradients = {
  landing: `radial-gradient(circle at 14% 8%, ${palette.stormyTeal[700]} 0%, transparent 34%), radial-gradient(circle at 88% -8%, ${palette.papayaWhip[400]} 0%, transparent 30%), linear-gradient(150deg, ${palette.inkBlack.DEFAULT} 0%, ${palette.stormyTeal.DEFAULT} 46%, ${palette.vividTangerine.DEFAULT} 100%)`,
  authCard: `linear-gradient(135deg, ${themeColors.moss} 0%, ${themeColors.accent} 100%)`,
  heroSection: 'linear-gradient(135deg, rgba(0, 21, 36, 0.84), rgba(21, 97, 109, 0.7))',
};

// Typography Scales
export const typography = {
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
};

// Spacing System
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

// Border Radius
export const borderRadius = {
  sm: '0.375rem',
  base: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  full: '9999px',
};

export default {
  themeColors,
  palette,
  gradients,
  typography,
  spacing,
  borderRadius,
};
