import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e6f5c',
      dark: '#173b3f',
      light: '#4b9c8a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f0b429',
      contrastText: '#102023',
    },
    background: {
      default: '#f4f7f6',
      paper: '#ffffff',
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
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e5e7eb',
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
