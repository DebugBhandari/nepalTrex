import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    return strength;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully! Redirecting to sign in...');
      setFormData({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        signIn('credentials', {
          username: formData.username,
          password: formData.password,
          callbackUrl: '/',
        });
      }, 1500);
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
      setLoading(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 0:
        return 'Very Weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      case 5:
        return 'Very Strong';
      default:
        return '';
    }
  };

  const getPasswordStrengthColor = () => {
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#17a2b8', '#28a745', '#20c997'];
    return colors[passwordStrength] || '#e2e8f0';
  };

  return (
    <>
      <Head>
        <title>Sign Up | NepalTrex</title>
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

          button[type="submit"]:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5) !important;
          }

          button[type="submit"]:active {
            transform: translateY(0);
          }

          button[type="submit"]:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          a:hover {
            color: #667eea;
          }
        `}</style>
      </Head>

      <div style={styles.container}>
        <div style={styles.card}>
          {/* Logo */}
          <div style={styles.logoContainer}>
            <div style={styles.logoCircle}>🏔️</div>
          </div>

          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Create Account</h1>
            <p style={styles.subtitle}>Start your trekking adventure today</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={styles.errorAlert}>
              <p style={styles.errorText}>⚠️ {error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div style={styles.successAlert}>
              <p style={styles.successText}>✓ {success}</p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="username" style={styles.label}>Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
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
                autoComplete="new-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
                required
              />
              {formData.password && (
                <div style={styles.passwordStrengthContainer}>
                  <div style={styles.strengthBars}>
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          ...styles.strengthBar,
                          backgroundColor:
                            i < passwordStrength ? getPasswordStrengthColor() : '#e2e8f0',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{...styles.strengthLabel, color: getPasswordStrengthColor()}}>
                    {getPasswordStrengthLabel()}
                  </span>
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={styles.input}
                required
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p style={styles.mismatchWarning}>⚠️ Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              style={styles.primaryButton}
              disabled={loading || !formData.email || !formData.username || !formData.password || !formData.confirmPassword}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign In Link */}
          <div style={styles.signinPrompt}>
            <span style={{ color: '#718096' }}>Already have an account? </span>
            <Link href="/auth/signin" style={styles.signinLink}>
              Sign in
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
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#718096',
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
  successAlert: {
    background: '#c6f6d5',
    border: '1px solid #9ae6b4',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  successText: {
    fontSize: '14px',
    color: '#22543d',
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
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '8px',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    fontSize: '12px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  passwordStrengthContainer: {
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  strengthBars: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    transition: 'all 0.3s ease',
  },
  strengthLabel: {
    fontSize: '12px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  mismatchWarning: {
    fontSize: '12px',
    color: '#c53030',
    marginTop: '6px',
    margin: 0,
  },
  primaryButton: {
    width: '100%',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '15px',
    fontWeight: '700',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '0.3px',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  signinPrompt: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#718096',
    marginBottom: '20px',
  },
  signinLink: {
    color: '#667eea',
    fontWeight: '700',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
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
