import Head from 'next/head';
import { getCsrfToken, getProviders, signIn } from 'next-auth/react';

export default function SignInPage({ csrfToken, providers, error }) {
  const hasGoogle = Boolean(providers?.google);

  return (
    <>
      <Head>
        <title>Sign in | NepalTrex</title>
      </Head>
      <div style={{ maxWidth: '460px', margin: '3rem auto', padding: '1.2rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>Sign in to NepalTrex</h1>
        {error ? (
          <p style={{ color: '#ffdfb3' }}>
            Authentication failed. Please check your username or password.
          </p>
        ) : null}

        <form method="post" action="/api/auth/callback/credentials">
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
          <label style={{ display: 'block', marginBottom: '0.8rem' }}>
            Username
            <input
              name="username"
              type="text"
              autoComplete="username"
              style={{ width: '100%', padding: '0.55rem', marginTop: '0.3rem' }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '0.8rem' }}>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              style={{ width: '100%', padding: '0.55rem', marginTop: '0.3rem' }}
            />
          </label>
          <button type="submit" style={{ width: '100%', padding: '0.6rem', cursor: 'pointer' }}>
            Sign in with Username
          </button>
        </form>

        {hasGoogle ? (
          <button
            type="button"
            style={{ width: '100%', marginTop: '0.8rem', padding: '0.6rem', cursor: 'pointer' }}
            onClick={() => signIn('google', { callbackUrl: '/' })}
          >
            Continue with Google
          </button>
        ) : (
          <p style={{ marginTop: '0.8rem', fontSize: '0.9rem', opacity: 0.9 }}>
            Google login is disabled until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
          </p>
        )}
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const providers = await getProviders();
  const csrfToken = await getCsrfToken(context);

  return {
    props: {
      providers: providers ?? {},
      csrfToken: csrfToken ?? null,
      error: context.query.error ?? null,
    },
  };
}
