import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Box, CssBaseline, ThemeProvider, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AppIconButton from '../components/AppIconButton';
import { createAppTheme } from '../lib/mui-theme';
import './styles.css';
import 'leaflet/dist/leaflet.css';

function CustomApp({ Component, pageProps: { session, ...pageProps } }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    const savedMode = window.localStorage.getItem('nepaltrex-color-mode');
    if (savedMode === 'light' || savedMode === 'dark') {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    document.body.dataset.theme = mode;
    window.localStorage.setItem('nepaltrex-color-mode', mode);
  }, [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <>
      <Head>
        <title>Welcome to web!</title>
      </Head>
      <main className="app">
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SessionProvider session={session}>
            <Component {...pageProps} />
            <Box sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1400 }}>
              <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                <AppIconButton
                  onClick={() => setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  sx={{ boxShadow: '0 8px 20px rgba(2, 12, 27, 0.2)' }}
                  aria-label="Toggle dark mode"
                >
                  {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </AppIconButton>
              </Tooltip>
            </Box>
          </SessionProvider>
        </ThemeProvider>
      </main>
    </>
  );
}

export default CustomApp;
