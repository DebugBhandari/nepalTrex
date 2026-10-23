import { alpha, createTheme } from '@mui/material/styles';

export function createAppTheme(mode = 'light') {
  const isDark = mode === 'dark';
  const palette = isDark
    ? { primary: '#9bc9af', primaryDeep: '#477d67', secondary: '#a9c8d8', bg: '#10211c', paper: '#172d26', raised: '#1d3830', text: '#f4f6ed', textMuted: '#b9c7bd', border: 'rgba(225, 237, 227, 0.14)' }
    : { primary: '#246b52', primaryDeep: '#164535', secondary: '#3c7185', bg: '#f5f4ee', paper: '#ffffff', raised: '#fbfaf5', text: '#17251f', textMuted: '#61716a', border: 'rgba(23, 37, 31, 0.12)' };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
        dark: palette.primaryDeep,
        light: '#c9e3d4',
        contrastText: '#ffffff',
      },
      secondary: {
        main: palette.secondary,
        dark: '#285668',
        light: '#cfe4ee',
        contrastText: '#ffffff',
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
      borderRadius: 16,
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
            borderRadius: 999,
            paddingInline: 18,
            minHeight: 40,
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryDeep} 100%)`,
            color: '#ffffff',
            boxShadow: `0 8px 18px ${alpha(palette.primaryDeep, isDark ? 0.24 : 0.2)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryDeep} 72%)`,
              boxShadow: `0 11px 22px ${alpha(palette.primaryDeep, isDark ? 0.32 : 0.27)}`,
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
            boxShadow: isDark ? '0 12px 30px rgba(1, 11, 7, 0.2)' : '0 10px 28px rgba(32, 51, 42, 0.06)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            backgroundColor: palette.paper,
            border: `1px solid ${palette.border}`,
            boxShadow: isDark ? '0 15px 36px rgba(1, 11, 7, 0.26)' : '0 14px 34px rgba(32, 51, 42, 0.08)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
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
            borderRadius: 12,
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
          paper: { borderRadius: 16, marginTop: 8, minWidth: 180 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { borderRadius: 9, margin: '3px 6px', minHeight: 40 },
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
