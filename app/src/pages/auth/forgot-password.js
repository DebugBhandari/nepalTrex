import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Box, Card, CardContent, Container, Stack, TextField, Typography } from '@mui/material';
import AppButton from '../../components/AppButton';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email');
        setLoading(false);
        return;
      }

      setSuccess('If an account exists for this email, a password reset link has been sent. Please check your inbox.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password | NepalTrex</title>
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
                <Typography variant="h4">Forgot Password?</Typography>
                <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                  Enter your email address and we'll send you a link to reset your password.
                </Typography>
              </Stack>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Email Address"
                    type="email"
                    fullWidth
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                      setSuccess('');
                    }}
                    placeholder="you@example.com"
                  />
                  <AppButton
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{ py: 1.1 }}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </AppButton>
                </Stack>
              </Box>

              <Typography sx={{ mt: 3, textAlign: 'center', fontSize: '0.875rem' }}>
                Remember your password?{' '}
                <Link href="/auth/signin" style={{ fontWeight: 700 }}>
                  Sign in
                </Link>
              </Typography>
              <Typography sx={{ mt: 1, textAlign: 'center', fontSize: '0.875rem' }}>
                Need an account?{' '}
                <Link href="/auth/signup" style={{ fontWeight: 700 }}>
                  Sign up
                </Link>
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}
