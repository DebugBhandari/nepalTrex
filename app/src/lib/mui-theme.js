import { createTheme } from '@mui/material/styles';

export function createAppTheme(mode = 'light') {
  const isDark = mode === 'dark';
  const lightPalette = {
    primary: '#0f766e',
    secondary: '#c2410c',
    bg: '#ffffff',
    bgAlt: '#f2fbf9',
    text: '#0b1f2a',
    textMuted: '#4b5b66',
    border: 'rgba(11, 31, 42, 0.16)',
  };
  const darkPalette = {
    primary: '#c2410c',
    secondary: '#0f766e',
    bg: '#0b1220',
    bgAlt: '#131e31',
    text: '#e8f0f7',
    textMuted: '#afc0d2',
    border: 'rgba(232, 240, 247, 0.24)',
  };
  const palette = isDark ? darkPalette : lightPalette;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
        dark: isDark ? '#9a3509' : '#0a5953',
        light: isDark ? '#dc6b3b' : '#1d968c',
        contrastText: '#ffffff',
      },
      secondary: {
        main: palette.secondary,
        dark: isDark ? '#0a5953' : '#9a3509',
        light: isDark ? '#1d968c' : '#dc6b3b',
        contrastText: '#ffffff',
      },
      background: {
        default: palette.bg,
        paper: palette.bgAlt,
      },
      text: {
        primary: palette.text,
        secondary: palette.textMuted,
      },
      divider: palette.border,
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
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.bg,
            color: palette.text,
          },
        },
      },
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
            background: `linear-gradient(135deg, ${palette.primary} 0%, ${isDark ? '#9a3509' : '#0a5953'} 100%)`,
            color: '#ffffff',
          },
          outlined: {
            borderColor: palette.border,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: palette.bgAlt,
            color: palette.text,
            borderBottom: `1px solid ${palette.border}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: palette.bgAlt,
            color: palette.text,
            border: `1px solid ${palette.border}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: palette.bgAlt,
            border: `1px solid ${palette.border}`,
            boxShadow: isDark ? '0 10px 28px rgba(2, 6, 23, 0.48)' : '0 10px 28px rgba(16, 52, 74, 0.1)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            color: palette.text,
            borderColor: palette.border,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: palette.border,
          },
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.primary,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.primary,
            },
          },
          input: {
            color: palette.text,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: palette.textMuted,
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            color: 'inherit',
          },
        },
      },
    },
  });
}
