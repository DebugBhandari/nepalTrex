import { createTheme } from '@mui/material/styles';

export function createAppTheme(mode = 'light') {
  const isDark = mode === 'dark';
  // Palette: #091413 (darkest) → #285A48 (dark) → #408A71 (mid) → #B0E4CC (lightest)
  // Dark mode reverts: lightest becomes text/surface, darkest becomes bg
  const lightPalette = {
    primary: '#408A71',
    secondary: '#285A48',
    bg: '#f4fcf8',
    bgAlt: '#ddf0e8',
    text: '#091413',
    textMuted: '#285A48',
    border: 'rgba(9, 20, 19, 0.16)',
  };
  const darkPalette = {
    primary: '#408A71',
    secondary: '#B0E4CC',
    bg: '#091413',
    bgAlt: '#285A48',
    text: '#B0E4CC',
    textMuted: '#408A71',
    border: 'rgba(176, 228, 204, 0.16)',
  };
  const palette = isDark ? darkPalette : lightPalette;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
        dark: '#285A48',
        light: '#B0E4CC',
        contrastText: '#ffffff',
      },
      secondary: {
        main: palette.secondary,
        dark: isDark ? '#408A71' : '#091413',
        light: isDark ? '#f4fcf8' : '#408A71',
        contrastText: isDark ? '#091413' : '#ffffff',
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
            background: `linear-gradient(135deg, ${palette.primary} 0%, #285A48 100%)`,
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
