import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import NearMeRoundedIcon from '@mui/icons-material/NearMeRounded';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';
import { authOptions } from '../lib/auth-options';

export default function AttemptsPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAttempts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/trek-attempts');
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || 'Unable to load trek attempts');
      setAttempts(data.attempts || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load trek attempts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  return (
    <>
      <Head>
        <title>My Trek Attempts | NepalTrex</title>
      </Head>
      <SiteHeader />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h3" component="h1" fontWeight={800}>
              My Trek Attempts
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.8 }}>
              A private history of the treks you have started with NepalTrex
              directions.
            </Typography>
          </Box>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {loading ? (
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={122} />
              ))}
            </Stack>
          ) : attempts.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{ py: 7, px: 3, textAlign: 'center', borderRadius: 2 }}
            >
              <NearMeRoundedIcon color="action" sx={{ fontSize: 44, mb: 1 }} />
              <Typography variant="h6" fontWeight={800}>
                No trek attempts yet
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.7, mb: 2.25 }}>
                Open a trek and select “Attempt Trek” to begin live trail
                guidance.
              </Typography>
              <AppButton component={Link} href="/">
                Explore treks
              </AppButton>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {attempts.map((attempt) => (
                <Card
                  key={attempt.id}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  <CardContent>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      spacing={1.5}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          {attempt.trekName}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.4 }}>
                          Started{' '}
                          {new Date(attempt.attemptedAt).toLocaleString()}
                        </Typography>
                        {attempt.startAccuracyM !== null && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.6 }}
                          >
                            Initial GPS accuracy:{' '}
                            {Math.round(attempt.startAccuracyM)} m
                          </Typography>
                        )}
                      </Box>
                      <AppButton
                        component={Link}
                        href={`/treks/${attempt.trekSlug}`}
                        variant="outlined"
                        sx={{ alignSelf: { sm: 'center' } }}
                      >
                        Open trek
                      </AppButton>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=%2Fattempts',
        permanent: false,
      },
    };
  }
  return { props: {} };
}
