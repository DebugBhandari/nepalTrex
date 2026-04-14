import { createTheme } from '@mui/material/styles';

export function createAppTheme(mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#7fa1c8' : '#4b607d',
        dark: '#1f2937',
        light: '#a6bdd9',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#d97745',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0f172a' : '#ffffff',
        paper: isDark ? '#111827' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e5e7eb' : '#1f2937',
        secondary: isDark ? '#9ca3af' : '#6b7280',
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily: '"Space Grotesk", "Segoe UI", Arial, sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: 16,
          },
          containedPrimary: {
            background: isDark
              ? 'linear-gradient(135deg, #6f8fb4 0%, #3f5878 100%)'
              : 'linear-gradient(135deg, #4b607d 0%, #2f435f 100%)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: isDark ? '1px solid rgba(148, 163, 184, 0.24)' : '1px solid rgba(79, 70, 61, 0.14)',
            boxShadow: isDark ? '0 10px 28px rgba(2, 6, 23, 0.42)' : '0 10px 28px rgba(31, 41, 55, 0.08)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
    },
  });
}
