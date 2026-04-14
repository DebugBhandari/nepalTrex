// NepalTrex Theme Colors & Design System
export const themeColors = {
  // Primary Colors (from landing page)
  deepTeal: '#0f2b2d',
  midTeal: '#173b3f',
  goldSun: '#f0b429',
  snow: '#f8f4eb',
  ink: '#102023',
  moss: '#1e6f5c',
  card: '#fffdf8',

  // Semantic Colors
  primary: '#f0b429', // Golden Sun - primary CTA
  secondary: '#1e6f5c', // Moss green - secondary
  dark: '#0f2b2d', // Deep Teal - dark backgrounds
  light: '#f8f4eb', // Snow - light text
  accent: '#173b3f', // Mid Teal - accents

  // Functional Colors
  success: '#1e6f5c', // Using moss green
  warning: '#f0b429', // Using golden sun
  error: '#d97706', // Warning orange
  info: '#0ea5e9', // Cyan for info
};

// Gradients
export const gradients = {
  landing: 'radial-gradient(circle at 15% 10%, #27595f 0%, transparent 35%), radial-gradient(circle at 80% -10%, #5f3f1f 0%, transparent 30%), linear-gradient(150deg, #0f2b2d 0%, #173b3f 45%, #08292d 100%)',
  authCard: `linear-gradient(135deg, ${themeColors.moss} 0%, ${themeColors.midTeal} 100%)`,
  heroSection: 'linear-gradient(135deg, rgba(5, 24, 28, 0.74), rgba(30, 111, 92, 0.5))',
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
  gradients,
  typography,
  spacing,
  borderRadius,
};
