import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Container, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import AppButton from '../../components/AppButton';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const [formData, setFormData] = useState({
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.password.trim()) {
      setError('Password is required');
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }

      setSuccess('Password reset successfully! Redirecting to sign in...');
      setFormData({ password: '', confirmPassword: '' });

      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <Head>
          <title>Reset Password | NepalTrex</title>
        </Head>
        <Box
          sx={(theme) => ({
            minHeight: '100vh',
            py: 6,
            background:
              theme.palette.mode === 'dark'
                ? 'radial-gradient(circle at 18% 12%, rgba(195,122,84,0.34) 0%, transparent 38%), radial-gradient(circle at 82% -6%, rgba(110,142,173,0.34) 0%, transparent 32%), linear-gradient(160deg, #1f2937 0%, #334155 46%, #1e293b 100%)'
                : theme.palette.background.default,
          })}
        >
          <Container maxWidth="sm">
            <Card
              sx={(theme) => ({
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(242,251,249,0.98) 100%)',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 24px 44px rgba(15, 23, 42, 0.26)',
              })}
            >
              <CardContent sx={{ p: 4 }}>
                <Alert severity="error">Invalid or expired reset link. Please request a new one.</Alert>
                <AppButton
                  fullWidth
                  variant="contained"
                  component={Link}
                  href="/auth/forgot-password"
                  sx={{ mt: 2 }}
                >
                  Request New Reset Link
                </AppButton>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Reset Password | NepalTrex</title>
      </Head>
      <Box
        sx={(theme) => ({
          minHeight: '100vh',
          py: 6,
          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 18% 12%, rgba(195,122,84,0.34) 0%, transparent 38%), radial-gradient(circle at 82% -6%, rgba(110,142,173,0.34) 0%, transparent 32%), linear-gradient(160deg, #1f2937 0%, #334155 46%, #1e293b 100%)'
              : theme.palette.background.default,
        })}
      >
        <Container maxWidth="sm">
          <Card
            sx={(theme) => ({
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(242,251,249,0.98) 100%)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 24px 44px rgba(15, 23, 42, 0.26)',
            })}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <Typography variant="h4">Reset Password</Typography>
                <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                  Enter your new password below.
                </Typography>
              </Stack>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="New Password"
                    type="password"
                    name="password"
                    fullWidth
                    required
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />

                  {formData.password && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Password strength:
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              passwordStrength <= 2
                                ? 'error.main'
                                : passwordStrength <= 3
                                  ? 'warning.main'
                                  : 'success.main',
                          }}
                        >
                          {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Fair' : 'Strong'}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(passwordStrength / 5) * 100}
                        sx={{
                          bgcolor: 'action.disabled',
                          '& .MuiLinearProgress-bar': {
                            bgcolor:
                              passwordStrength <= 2
                                ? 'error.main'
                                : passwordStrength <= 3
                                  ? 'warning.main'
                                  : 'success.main',
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        • At least 8 characters {formData.password.length >= 8 ? '✓' : ''}
                        <br />
                        • Uppercase & lowercase letters {/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? '✓' : ''}
                        <br />
                        • Number {/\d/.test(formData.password) ? '✓' : ''}
                        <br />
                        • Special character {/[!@#$%^&*]/.test(formData.password) ? '✓' : ''}
                      </Typography>
                    </Box>
                  )}

                  <TextField
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    fullWidth
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />

                  <AppButton
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{ py: 1.1 }}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </AppButton>
                </Stack>
              </Box>

              <Typography sx={{ mt: 3, textAlign: 'center', fontSize: '0.875rem' }}>
                Remember your password?{' '}
                <Link href="/auth/signin" style={{ fontWeight: 700 }}>
                  Sign in
                </Link>
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}
