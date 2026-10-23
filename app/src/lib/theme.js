// NepalTrex Theme Colors & Design System
export const themeColors = {
  // Coolors palette: https://coolors.co/03045e-023e8a-0077b6-0096c7-00b4d8-48cae4-90e0ef-ade8f4-caf0f8
  deepTeal: '#03045E',
  midTeal: '#023E8A',
  goldSun: '#00B4D8',
  snow: '#CAF0F8',
  ink: '#03045E',
  moss: '#0077B6',
  card: '#FFFFFF',

  // Semantic Colors
  primary: '#0077B6',
  secondary: '#0096C7',
  dark: '#03045E',
  light: '#CAF0F8',
  accent: '#023E8A',

  // Functional Colors
  success: '#0077B6',
  warning: '#00B4D8',
  error: '#023E8A',
  info: '#0096C7',
};

// Gradients
export const gradients = {
  landing: 'radial-gradient(circle at 14% 8%, #00B4D8 0%, transparent 34%), radial-gradient(circle at 88% -8%, #48CAE4 0%, transparent 30%), linear-gradient(150deg, #03045E 0%, #023E8A 46%, #0077B6 100%)',
  authCard: `linear-gradient(135deg, ${themeColors.moss} 0%, ${themeColors.midTeal} 100%)`,
  heroSection: 'linear-gradient(135deg, rgba(3, 4, 94, 0.8), rgba(0, 119, 182, 0.58))',
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
