// NepalTrex's vanilla cream, tea green, muted olive, faded copper, and ash brown palette.
export const palette = {
  vanillaCream: { 100: '#433A16', 200: '#87752D', 300: '#C3AB4A', 400: '#D9CA8E', 500: '#F0EAD2', 600: '#F3EEDA', 700: '#F6F2E3', 800: '#F9F6ED', 900: '#FCFBF6' },
  teaGreen: { 100: '#363D16', 200: '#6D792C', 300: '#A3B642', 400: '#C1CF7B', 500: '#DDE5B6', 600: '#E4EAC6', 700: '#EBF0D4', 800: '#F2F5E3', 900: '#F8FAF1' },
  mutedOlive: { 100: '#242B14', 200: '#495527', 300: '#6D803B', 400: '#92AA4E', 500: '#ADC178', 600: '#BDCD92', 700: '#CED9AD', 800: '#DEE6C9', 900: '#EFF2E4' },
  fadedCopper: { 100: '#231A13', 200: '#453427', 300: '#684E3A', 400: '#8A684E', 500: '#A98467', 600: '#BA9C84', 700: '#CBB4A3', 800: '#DCCDC2', 900: '#EEE6E0' },
  ashBrown: { 100: '#15120F', 200: '#2B231E', 300: '#40352E', 400: '#56473D', 500: '#6C584C', 600: '#927867', 700: '#AE998C', 800: '#C9BBB3', 900: '#E4DDD9' },
};

export const themeColors = {
  deepTeal: palette.ashBrown[400],
  midTeal: palette.fadedCopper[400],
  goldSun: palette.mutedOlive[500],
  snow: palette.vanillaCream[500],
  ink: palette.ashBrown[500],
  moss: palette.mutedOlive[300],
  card: palette.vanillaCream[900],
  primary: palette.mutedOlive[500],
  secondary: palette.fadedCopper[500],
  dark: palette.ashBrown[500],
  light: palette.vanillaCream[500],
  accent: palette.ashBrown[400],
  success: palette.mutedOlive[300],
  warning: palette.fadedCopper[500],
  error: palette.fadedCopper[300],
  info: palette.teaGreen[300],
};

// Gradients
export const gradients = {
  landing: 'radial-gradient(circle at 14% 8%, #ADC178 0%, transparent 34%), radial-gradient(circle at 88% -8%, #DDE5B6 0%, transparent 30%), linear-gradient(150deg, #6C584C 0%, #A98467 46%, #6D803B 100%)',
  authCard: `linear-gradient(135deg, ${themeColors.moss} 0%, ${themeColors.midTeal} 100%)`,
  heroSection: 'linear-gradient(135deg, rgba(108, 88, 76, 0.8), rgba(109, 128, 59, 0.58))',
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
