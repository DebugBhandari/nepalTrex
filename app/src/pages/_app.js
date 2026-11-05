import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SessionProvider, useSession } from 'next-auth/react';
import { Badge, Box, CssBaseline, ThemeProvider, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import AppIconButton from '../components/AppIconButton';
import { createAppTheme } from '../lib/mui-theme';
import './styles.css';
import 'leaflet/dist/leaflet.css';

function FloatingChatNotifications() {
  const { status } = useSession();
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    if (status !== 'authenticated') { setUnreadChats(0); return undefined; }
    let active = true;
    const loadUnreadChats = async () => {
      try {
        const response = await fetch('/api/chats');
        const data = await response.json();
        if (active && response.ok) setUnreadChats(Number(data.unreadCount || 0));
      } catch { /* Chat badge is non-critical. */ }
    };
    loadUnreadChats();
    window.addEventListener('nepaltrex:chat-read', loadUnreadChats);
    const interval = window.setInterval(loadUnreadChats, 5000);
    return () => { active = false; window.removeEventListener('nepaltrex:chat-read', loadUnreadChats); window.clearInterval(interval); };
  }, [status]);

  if (status !== 'authenticated') return null;
  return <Tooltip title={unreadChats ? `${unreadChats} unread chat message${unreadChats === 1 ? '' : 's'}` : 'Chats'}><AppIconButton component={Link} href="/chats" aria-label={`Chats${unreadChats ? ` (${unreadChats} unread)` : ''}`} sx={{ boxShadow: '0 8px 20px rgba(43, 35, 30, 0.22)' }}><Badge badgeContent={unreadChats} color="primary" max={99}><ChatRoundedIcon /></Badge></AppIconButton></Tooltip>;
}

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
        <title>NepalTrex | Trek routes and stays in Nepal</title>
      </Head>
      <main className="app">
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SessionProvider session={session}>
            <Component {...pageProps} />
            <Box sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1400, display: 'flex', gap: 1 }}>
              <FloatingChatNotifications />
              <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                <AppIconButton
                  onClick={() => setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  sx={{ boxShadow: '0 8px 20px rgba(43, 35, 30, 0.22)' }}
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
