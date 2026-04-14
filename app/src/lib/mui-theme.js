import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4b607d',
      dark: '#1f2937',
      light: '#8097b5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#d97745',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4efe7',
      paper: '#fffaf2',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
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
          background: 'linear-gradient(135deg, #4b607d 0%, #2f435f 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(79, 70, 61, 0.14)',
          boxShadow: '0 10px 28px rgba(31, 41, 55, 0.08)',
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
