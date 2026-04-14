import Head from 'next/head';
import { getCsrfToken, getProviders, signIn } from 'next-auth/react';

export default function SignInPage({ csrfToken, providers, error }) {
  const hasGoogle = Boolean(providers?.google);

  return (
    <>
      <Head>
        <title>Sign in | NepalTrex</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          input:focus {
            border-color: #667eea !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
          }

          button[type="submit"]:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5) !important;
          }

          button[type="submit"]:active {
            transform: translateY(0);
          }

          button[type="button"]:hover {
            border-color: #667eea;
            background: #f7fafc;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
          }

          button[type="button"]:active {
            transform: translateY(0);
          }

          .divider-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 1px;
            background: #e2e8f0;
            top: 50%;
            transform: translateY(-50%);
          }

          .divider-text {
            position: relative;
            z-index: 1;
            background: white;
          }
        `}</style>
      </Head>
      
      <div style={styles.container}>
        <div style={styles.card}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Welcome Back</h1>
            <p style={styles.subtitle}>Sign in to explore Nepal's trekking adventures</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={styles.errorAlert}>
              <p style={styles.errorText}>
                ⚠️ Authentication failed. Please check your credentials.
              </p>
            </div>
          )}

          {/* Credentials Form */}
          <form method="post" action="/api/auth/callback/credentials" style={styles.form}>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
            
            <div style={styles.formGroup}>
              <label htmlFor="username" style={styles.label}>Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="password" style={styles.label}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                style={styles.input}
                required
              />
            </div>

            <button type="submit" style={styles.primaryButton}>
              Sign in with Username
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: '#e2e8f0' }}></div>
            <span style={{ position: 'relative', zIndex: 1, background: 'white', padding: '0 12px', fontSize: '14px', fontWeight: '600', color: '#cbd5e0', flex: 1, textAlign: 'center' }}>
              OR
            </span>
          </div>

          {/* Google OAuth */}
          {hasGoogle ? (
            <button
              type="button"
              style={styles.googleButton}
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              <svg style={styles.googleIcon} viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          ) : (
            <p style={styles.disabledText}>
              Google login is disabled. Please configure OAuth credentials.
            </p>
          )}

          {/* Footer */}
          <p style={styles.footer}>
            © 2026 NepalTrex. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '40px',
    animation: 'slideUp 0.6s ease-out',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    lineHeight: '1.5',
  },
  errorAlert: {
    background: '#fed7d7',
    border: '1px solid #fc8181',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  errorText: {
    fontSize: '14px',
    color: '#c53030',
    margin: 0,
  },
  form: {
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
    letterSpacing: '0.3px',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    fontSize: '14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryButton: {
    width: '100%',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '0.3px',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    marginBottom: '16px',
  },
  googleButton: {
    width: '100%',
    padding: '12px 16px',
    background: 'white',
    color: '#1a202c',
    fontSize: '15px',
    fontWeight: '600',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    letterSpacing: '0.3px',
    marginBottom: '20px',
  },
  googleIcon: {
    width: '20px',
    height: '20px',
    color: '#4285F4',
  },
  disabledText: {
    fontSize: '14px',
    color: '#718096',
    textAlign: 'center',
    padding: '12px 16px',
    background: '#f7fafc',
    borderRadius: '8px',
    marginBottom: '20px',
    margin: 0,
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#a0aec0',
    marginTop: '24px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
};

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
