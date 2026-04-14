import Head from 'next/head';
import Link from 'next/link';
import { getCsrfToken, getProviders, signIn } from 'next-auth/react';
import { BabyTrexLogo } from '../../components/BabyTrexLogo';
import { themeColors } from '../../lib/theme';

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
            background: linear-gradient(135deg, ${themeColors.deepTeal} 0%, ${themeColors.midTeal} 45%, #08292d 100%);
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

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }

          input:focus {
            border-color: ${themeColors.moss} !important;
            box-shadow: 0 0 0 3px rgba(30, 111, 92, 0.1) !important;
          }

          button[type="submit"]:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(30, 111, 92, 0.5) !important;
          }

          button[type="submit"]:active {
            transform: translateY(0);
          }

          button[type="button"]:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(240, 180, 41, 0.4);
          }

          button[type="button"]:active {
            transform: translateY(0);
          }

          a:hover {
            color: ${themeColors.moss};
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
          {/* Logo */}
          <div style={styles.logoContainer}>
            <div style={styles.logoCircle}>
              <BabyTrexLogo size={40} color={themeColors.goldSun} />
            </div>
          </div>

          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Welcome Back</h1>
            <p style={styles.subtitle}>Continue your trekking journey</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={styles.errorAlert}>
              <p style={styles.errorText}>
                ⚠️ Authentication failed. Please check your credentials.
              </p>
            </div>
          )}

          {/* Google OAuth - Prominent */}
          {hasGoogle ? (
            <button
              type="button"
              style={styles.googleButton}
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          ) : (
            <p style={styles.disabledText}>
              Google login is disabled. Please configure OAuth credentials.
            </p>
          )}

          {/* Divider */}
          <div style={styles.dividerContainer}>
            <div style={styles.dividerLine}></div>
            <span style={styles.dividerText}>OR</span>
            <div style={styles.dividerLine}></div>
          </div>

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
                placeholder="admin"
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
                placeholder="••••••••"
                style={styles.input}
                required
              />
            </div>

            <button type="submit" style={styles.primaryButton}>
              Sign In
            </button>
          </form>

          {/* Sign Up Link */}
          <div style={styles.signupPrompt}>
            <span style={{ color: '#718096' }}>Don't have an account? </span>
            <Link href="/auth/signup" style={styles.signupLink}>
              Sign up
            </Link>
          </div>

          {/* Footer */}
          <p style={styles.footer}>
            © 2026 NepalTrex. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
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
    background: `linear-gradient(135deg, ${themeColors.deepTeal} 0%, ${themeColors.midTeal} 45%, #08292d 100%)`,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: themeColors.card,
    borderRadius: '16px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    padding: '40px',
    animation: 'slideUp 0.6s ease-out',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  logoCircle: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${themeColors.moss} 0%, ${themeColors.midTeal} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 8px 20px rgba(30, 111, 92, 0.3)`,
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: themeColors.ink,
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#666',
    lineHeight: '1.6',
    fontWeight: '500',
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
  googleButton: {
    width: '100%',
    padding: '14px 16px',
    background: 'white',
    color: themeColors.ink,
    fontSize: '15px',
    fontWeight: '700',
    border: `2px solid ${themeColors.goldSun}`,
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    letterSpacing: '0.3px',
    marginBottom: '24px',
    boxShadow: `0 2px 8px rgba(240, 180, 41, 0.15)`,
  },
  dividerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '28px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#ddd',
  },
  dividerText: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '1px',
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
    fontWeight: '700',
    color: themeColors.ink,
    marginBottom: '8px',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    fontSize: '12px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: `1.5px solid #ddd`,
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryButton: {
    width: '100%',
    padding: '14px 16px',
    background: `linear-gradient(135deg, ${themeColors.moss} 0%, ${themeColors.midTeal} 100%)`,
    color: themeColors.snow,
    fontSize: '15px',
    fontWeight: '700',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '0.3px',
    boxShadow: `0 4px 15px rgba(30, 111, 92, 0.3)`,
  },
  disabledText: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    padding: '12px 16px',
    background: '#f0f0f0',
    borderRadius: '8px',
    marginBottom: '20px',
    margin: 0,
  },
  signupPrompt: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  signupLink: {
    color: themeColors.moss,
    fontWeight: '700',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
    marginTop: '24px',
    borderTop: '1px solid #ddd',
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
