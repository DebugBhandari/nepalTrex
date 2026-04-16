import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { query } from '../../lib/db';
import SiteHeader from '../../components/SiteHeader';

const DEFAULT_STAY_IMAGE = 'https://placehold.co/1000x620?text=NepalTrex+Stay';

export default function StaysPage({ stays }) {
  const [nameQuery, setNameQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  const filteredStays = useMemo(() => {
    const nameNeedle = nameQuery.trim().toLowerCase();
    const locationNeedle = locationQuery.trim().toLowerCase();

    return stays.filter((stay) => {
      const stayName = String(stay.name || '').toLowerCase();
      const stayLocation = String(stay.location || '').toLowerCase();

      if (nameNeedle && !stayName.includes(nameNeedle)) {
        return false;
      }

      if (locationNeedle && !stayLocation.includes(locationNeedle)) {
        return false;
      }

      return true;
    });
  }, [stays, nameQuery, locationQuery]);

  return (
    <>
      <Head>
        <title>Stays | NepalTrex</title>
        <meta name="description" content="Browse all NepalTrex stays with quick name and location search." />
      </Head>

      <SiteHeader />

      <Box
        sx={(theme) => ({
          minHeight: '100vh',
          py: 4,
          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 18% 12%, rgba(64,138,113,0.34) 0%, transparent 38%), radial-gradient(circle at 82% -6%, rgba(110,142,173,0.34) 0%, transparent 32%), linear-gradient(160deg, #1f2937 0%, #334155 46%, #1e293b 100%)'
              : theme.palette.background.default,
        })}
      >
        <Container maxWidth="lg">
          <Paper
            sx={(theme) => ({
              p: { xs: 2.4, md: 3 },
              mb: 2.5,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.96) 100%)',
            })}
          >
            <Typography variant="h4" sx={{ mb: 0.7 }}>
              All Stays
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              Search by stay name and location to find places that match your route.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
              }}
            >
              <TextField
                label="Search by stay name"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                fullWidth
              />
              <TextField
                label="Search by location"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                fullWidth
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.3 }}>
              Showing {filteredStays.length} stay{filteredStays.length === 1 ? '' : 's'}
            </Typography>
          </Paper>

          {filteredStays.length === 0 ? (
            <Alert severity="info">No stays match your current filters.</Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
              }}
            >
              {filteredStays.map((stay) => (
                <Card
                  key={stay.id}
                  sx={(theme) => ({
                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                        : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.96) 100%)',
                    color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                    },
                  })}
                >
                  <Link href={`/stays/${stay.slug}`}>
                    <CardMedia
                      component="img"
                      height="220"
                      image={stay.imageUrl || DEFAULT_STAY_IMAGE}
                      alt={stay.name}
                      sx={{ objectFit: 'cover', objectPosition: 'center', cursor: 'pointer' }}
                    />
                  </Link>
                  <CardContent>
                    <Link href={`/stays/${stay.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Typography variant="h6" sx={{ mb: 1, '&:hover': { textDecoration: 'underline' } }}>
                        {stay.name}
                      </Typography>
                    </Link>
                    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip size="small" color="secondary" label={stay.stayType} sx={{ textTransform: 'capitalize' }} />
                      <Chip size="small" variant="outlined" label={stay.location} />
                      <Chip size="small" variant="outlined" label={`${stay.menuCount} menu items`} />
                    </Stack>
                    <Typography color="text.secondary" sx={{ mb: 1.3 }}>
                      {stay.description || 'No description yet.'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stay.contactPhone || 'Contact not listed'}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}

export async function getServerSideProps() {
  const result = await query(
    `
      SELECT
        s.id,
        s.name,
        s.slug,
        s.stay_type,
        s.location,
        s.description,
        s.image_url,
        s.contact_phone,
        COUNT(m.id)::int AS menu_count
      FROM stays s
      LEFT JOIN menu_items m ON m.stay_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `
  );

  const stays = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    stayType: row.stay_type,
    location: row.location,
    description: row.description || '',
    imageUrl: row.image_url || DEFAULT_STAY_IMAGE,
    contactPhone: row.contact_phone || '',
    menuCount: Number(row.menu_count || 0),
  }));

  return {
    props: {
      stays,
    },
  };
}
