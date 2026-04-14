import Head from 'next/head';
import Link from 'next/link';
import GoogleIcon from '@mui/icons-material/Google';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getCsrfToken, getProviders, signIn } from 'next-auth/react';
import AppButton from '../../components/AppButton';
import { BabyTrexLogo } from '../../components/BabyTrexLogo';

export default function SignInPage({ csrfToken, providers, error }) {
  const hasGoogle = Boolean(providers?.google);

  return (
    <>
      <Head>
        <title>Sign in | NepalTrex</title>
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
                <BabyTrexLogo size={42} color="#d97745" />
                <Typography variant="h4">Welcome Back</Typography>
                <Typography color="text.secondary">Continue your trekking journey</Typography>
              </Stack>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Authentication failed. Please check your credentials.
                </Alert>
              )}

              {hasGoogle ? (
                <AppButton
                  fullWidth
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={() => signIn('google', { callbackUrl: '/' })}
                  sx={{ mb: 2 }}
                >
                  Continue with Google
                </AppButton>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Google login is disabled.
                </Alert>
              )}

              <Divider sx={{ mb: 2 }}>OR</Divider>

              <Box component="form" method="post" action="/api/auth/callback/credentials">
                <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
                <Stack spacing={1.5}>
                  <TextField label="Username" name="username" autoComplete="username" required fullWidth />
                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    fullWidth
                  />
                  <AppButton type="submit" variant="contained" fullWidth sx={{ py: 1.1 }}>
                    Sign In
                  </AppButton>
                </Stack>
              </Box>

              <Typography sx={{ mt: 2 }}>
                Don't have an account? <Link href="/auth/signup">Sign up</Link>
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
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
