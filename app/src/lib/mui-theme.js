import { alpha, createTheme } from '@mui/material/styles';
import { palette as brandPalette, themeColors } from './theme';

export function createAppTheme(mode = 'light') {
  const isDark = mode === 'dark';
  const palette = isDark
    ? { primary: brandPalette.stormyTeal[600], primaryDeep: brandPalette.stormyTeal[400], secondary: brandPalette.vividTangerine[600], bg: brandPalette.inkBlack.DEFAULT, paper: brandPalette.inkBlack[400], raised: brandPalette.inkBlack[300], text: brandPalette.papayaWhip.DEFAULT, textMuted: brandPalette.stormyTeal[800], border: 'rgba(191, 236, 243, 0.24)' }
    : { primary: brandPalette.stormyTeal.DEFAULT, primaryDeep: brandPalette.stormyTeal[300], secondary: brandPalette.vividTangerine.DEFAULT, bg: brandPalette.papayaWhip.DEFAULT, paper: brandPalette.papayaWhip[900], raised: brandPalette.papayaWhip[700], text: brandPalette.inkBlack.DEFAULT, textMuted: brandPalette.inkBlack[600], border: 'rgba(0, 21, 36, 0.18)' };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
        dark: palette.primaryDeep,
        light: brandPalette.stormyTeal[700],
        contrastText: brandPalette.papayaWhip[900],
      },
      secondary: {
        main: palette.secondary,
        dark: brandPalette.vividTangerine[300],
        light: brandPalette.vividTangerine[700],
        contrastText: brandPalette.inkBlack.DEFAULT,
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
            color: themeColors.snow,
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
            boxShadow: isDark ? '0 12px 30px rgba(43, 35, 30, 0.34)' : '0 10px 28px rgba(108, 88, 76, 0.1)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: palette.paper,
            border: `1px solid ${palette.border}`,
            boxShadow: isDark ? '0 15px 36px rgba(43, 35, 30, 0.4)' : '0 14px 34px rgba(108, 88, 76, 0.12)',
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
          paper: {
            borderRadius: 10,
            marginTop: 8,
            minWidth: 180,
            backgroundColor: palette.paper,
            backgroundImage: `linear-gradient(145deg, ${alpha(palette.primary, isDark ? 0.16 : 0.08)}, transparent 58%)`,
            border: `1px solid ${palette.border}`,
            boxShadow: isDark ? '0 18px 38px rgba(0, 4, 7, 0.5)' : '0 18px 38px rgba(0, 21, 36, 0.18)',
            overflow: 'hidden',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            margin: '3px 6px',
            minHeight: 40,
            color: palette.text,
            transition: 'background-color 160ms ease, color 160ms ease, transform 160ms ease',
            '& .MuiSvgIcon-root': {
              color: palette.primary,
            },
            '&:hover': {
              backgroundColor: alpha(palette.primary, isDark ? 0.24 : 0.12),
              color: palette.primary,
              transform: 'translateX(2px)',
            },
            '&.Mui-selected, &.Mui-selected:hover': {
              backgroundColor: alpha(palette.primary, isDark ? 0.34 : 0.18),
              color: palette.primary,
            },
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: palette.paper,
            backgroundImage: `linear-gradient(145deg, ${alpha(palette.primary, isDark ? 0.16 : 0.08)}, transparent 58%)`,
            border: `1px solid ${palette.border}`,
            boxShadow: isDark ? '0 18px 38px rgba(0, 4, 7, 0.5)' : '0 18px 38px rgba(0, 21, 36, 0.18)',
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            '&.MuiButtonBase-root:hover': {
              backgroundColor: alpha(palette.primary, isDark ? 0.24 : 0.1),
            },
          },
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
