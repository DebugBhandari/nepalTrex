import Head from 'next/head';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { query } from '../lib/db';

export default function StayDetailPage({ stay }) {
  return (
    <>
      <Head>
        <title>{stay.name} | NepalTrex</title>
        <meta name="description" content={stay.description} />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          py: 5,
          background:
            'radial-gradient(circle at 15% 10%, #27595f 0%, transparent 35%), radial-gradient(circle at 80% -10%, #5f3f1f 0%, transparent 30%), linear-gradient(150deg, #0f2b2d 0%, #173b3f 45%, #08292d 100%)',
        }}
      >
        <Container maxWidth="md">
          <Button component={Link} href="/" startIcon={<HomeIcon />} variant="outlined" sx={{ mb: 2, color: '#f8f4eb', borderColor: '#f8f4eb' }}>
            Back to Home
          </Button>

          <Card
            sx={{
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(241,248,246,0.94) 100%)',
              border: '1px solid rgba(27,122,100,0.2)',
              boxShadow: '0 22px 44px rgba(8, 41, 45, 0.24)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Typography variant="h3" sx={{ mb: 1.5 }}>
                {stay.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Chip color="secondary" label={stay.stayType} />
                <Chip variant="outlined" label={stay.location} />
                <Chip label={`NPR ${Number(stay.pricePerNight).toFixed(0)} / night`} />
              </Stack>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {stay.description}
              </Typography>
              {stay.contactPhone && (
                <Typography>
                  <strong>Contact:</strong> {stay.contactPhone}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}

export async function getServerSideProps(context) {
  const slug = context.params?.slug;

  if (!slug) {
    return { notFound: true };
  }

  const result = await query(
    `
      SELECT name, slug, stay_type, location, description, price_per_night, contact_phone
      FROM stays
      WHERE slug = $1
      LIMIT 1
    `,
    [slug]
  );

  if (result.rows.length === 0) {
    return { notFound: true };
  }

  const row = result.rows[0];

  return {
    props: {
      stay: {
        name: row.name,
        slug: row.slug,
        stayType: row.stay_type,
        location: row.location,
        description: row.description,
        pricePerNight: row.price_per_night,
        contactPhone: row.contact_phone || '',
      },
    },
  };
}
