import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import './styles.css';
function CustomApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <>
      <Head>
        <title>Welcome to web!</title>
      </Head>
      <main className="app">
        <SessionProvider session={session}>
          <Component {...pageProps} />
        </SessionProvider>
      </main>
    </>
  );
}
export default CustomApp;
