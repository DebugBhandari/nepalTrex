import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '../lib/mui-theme';
import './styles.css';

function CustomApp({ Component, pageProps: { session, ...pageProps } }) {
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
          </SessionProvider>
        </ThemeProvider>
      </main>
    </>
  );
}

export default CustomApp;
