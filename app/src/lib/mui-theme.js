import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1b7a64',
      dark: '#173b3f',
      light: '#5bb79e',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f0b429',
      contrastText: '#102023',
    },
    background: {
      default: '#edf5f3',
      paper: '#fefcf8',
    },
    text: {
      primary: '#102023',
      secondary: '#4b5563',
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
          background: 'linear-gradient(135deg, #1b7a64 0%, #173b3f 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(23, 59, 63, 0.12)',
          boxShadow: '0 10px 28px rgba(16, 32, 35, 0.08)',
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

export default theme;
