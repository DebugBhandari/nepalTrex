import { alpha, createTheme } from '@mui/material/styles';
import { themeColors } from './theme';

export function createAppTheme(mode = 'light') {
  const isDark = mode === 'dark';
  const palette = isDark
    ? { primary: '#48CAE4', primaryDeep: '#0096C7', secondary: '#90E0EF', bg: '#03045E', paper: '#023E8A', raised: '#0077B6', text: '#CAF0F8', textMuted: '#ADE8F4', border: 'rgba(144, 224, 239, 0.24)' }
    : { primary: '#0077B6', primaryDeep: '#023E8A', secondary: '#0096C7', bg: '#CAF0F8', paper: '#FFFFFF', raised: '#ADE8F4', text: '#03045E', textMuted: '#023E8A', border: 'rgba(2, 62, 138, 0.18)' };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
        dark: palette.primaryDeep,
        light: '#90E0EF',
        contrastText: '#ffffff',
      },
      secondary: {
        main: palette.secondary,
        dark: '#0077B6',
        light: '#48CAE4',
        contrastText: '#03045E',
      },
      background: {
        default: palette.bg,
        paper: palette.paper,
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
      h1: {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        letterSpacing: '-0.045em',
        lineHeight: 1.04,
      },
      h2: {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        letterSpacing: '-0.04em',
        lineHeight: 1.1,
      },
      h3: {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        letterSpacing: '-0.035em',
      },
      h4: {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        letterSpacing: '-0.025em',
      },
      h5: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 700,
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.01em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.bg,
            color: palette.text,
          },
          '::selection': {
            backgroundColor: alpha(palette.primary, 0.24),
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 9,
            paddingInline: 18,
            minHeight: 40,
          },
          containedPrimary: {
            background: themeColors.accent,
            color: '#ffffff',
            boxShadow: `0 8px 18px ${alpha(themeColors.accent, isDark ? 0.32 : 0.24)}`,
            '&:hover': {
              background: themeColors.deepTeal,
              boxShadow: `0 11px 22px ${alpha(themeColors.accent, isDark ? 0.4 : 0.32)}`,
            },
          },
          outlined: {
            borderColor: palette.border,
            color: palette.text,
            '&:hover': {
              borderColor: palette.primary,
              backgroundColor: alpha(palette.primary, 0.06),
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: alpha(palette.bg, 0.88),
            color: palette.text,
            borderBottom: `1px solid ${palette.border}`,
            backdropFilter: 'blur(18px)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: palette.paper,
            color: palette.text,
            border: `1px solid ${palette.border}`,
            boxShadow: isDark ? '0 12px 30px rgba(0, 4, 94, 0.28)' : '0 10px 28px rgba(2, 62, 138, 0.1)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: palette.paper,
            border: `1px solid ${palette.border}`,
            boxShadow: isDark ? '0 15px 36px rgba(0, 4, 94, 0.34)' : '0 14px 34px rgba(2, 62, 138, 0.12)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 7,
            borderColor: palette.border,
            fontWeight: 650,
            backgroundColor: alpha(palette.primary, 0.07),
          },
          colorDefault: {
            color: palette.text,
          },
          outlined: {
            backgroundColor: 'transparent',
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
            borderRadius: 8,
            backgroundColor: alpha(palette.raised, 0.76),
            transition: 'background-color 160ms ease, box-shadow 160ms ease',
            '&:hover': {
              backgroundColor: palette.paper,
            },
            '&.Mui-focused': {
              backgroundColor: palette.paper,
              boxShadow: `0 0 0 3px ${alpha(palette.primary, 0.14)}`,
            },
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
      MuiMenu: {
        styleOverrides: {
          paper: { borderRadius: 10, marginTop: 8, minWidth: 180 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { borderRadius: 6, margin: '3px 6px', minHeight: 40 },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: 3, backgroundColor: palette.primary },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 700, minHeight: 48 },
        },
      },
    },
  });
}
