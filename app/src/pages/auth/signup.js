import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Alert, Box, Card, CardContent, Container, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import AppButton from '../../components/AppButton';
import { getEmailValidationError } from '../../lib/email-validation';

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
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailError = getEmailValidationError(formData.email);
    if (emailError) {
      setError(emailError);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully! Redirecting to sign in...');
      const credentials = { username: formData.username, password: formData.password };
      setFormData({ email: '', username: '', password: '', confirmPassword: '' });

      setTimeout(() => {
        signIn('credentials', {
          username: credentials.username,
          password: credentials.password,
          callbackUrl: '/',
        });
      }, 1200);
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | NepalTrex</title>
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
                <Typography variant="h4">Create Account</Typography>
                <Typography color="text.secondary">Start your trekking adventure today</Typography>
              </Stack>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={1.5}>
                  <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required fullWidth />
                  <TextField label="Username" name="username" value={formData.username} onChange={handleChange} required fullWidth />
                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                  {formData.password && (
                    <LinearProgress
                      variant="determinate"
                      value={(passwordStrength / 5) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  )}
                  <TextField
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                  <AppButton type="submit" variant="contained" fullWidth disabled={loading} sx={{ py: 1.1 }}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </AppButton>
                </Stack>
              </Box>

              <Typography sx={{ mt: 2 }}>
                Already have an account? <Link href="/auth/signin">Sign in</Link>
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}
