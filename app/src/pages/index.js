import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { FEATURED_TREKS, TREK_REGIONS } from '@org/types';
import { formatDurationDays, titleCase } from '@org/utils';
import { query } from '../lib/db';
import { BabyTrexLogoWithText } from '../components/BabyTrexLogo';

const navItems = [
  { label: 'Stays', href: '#stays' },
  { label: 'Treks', href: '#treks' },
  { label: 'Regions', href: '#regions' },
  { label: 'Maps', href: '#maps' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export default function HomePage({ featuredTreks, trekRegions, stays }) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdminOrSuperUser = ['admin', 'superUser'].includes(session?.user?.role || '');
  const isSuperUser = session?.user?.role === 'superUser';

  const formatStartingPrice = (menuItems) => {
    const prices = (Array.isArray(menuItems) ? menuItems : [])
      .map((item) => Number(item?.price))
      .filter((price) => Number.isFinite(price) && price >= 0);

    if (prices.length === 0) {
      return 'Menu coming soon';
    }

    return `From NPR ${Math.min(...prices).toFixed(0)}`;
  };

  return (
    <>
      <Head>
        <title>NepalTrex | Trekking Adventures in Nepal</title>
      </Head>

      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(90deg, rgba(10,34,37,0.92) 0%, rgba(19,59,63,0.92) 100%)',
          color: '#f8f4eb',
          borderBottom: '1px solid rgba(240,180,41,0.25)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <BabyTrexLogoWithText size={34} color="#f0b429" />
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Navigation
          </Typography>
          <Stack spacing={1}>
            {navItems.map((item) => (
              <Button key={item.href} href={item.href} variant="outlined" onClick={() => setMenuOpen(false)}>
                {item.label}
              </Button>
            ))}

            {status === 'authenticated' && isSuperUser && (
              <Button
                component={Link}
                href="/dashboard"
                startIcon={<DashboardIcon />}
                variant="contained"
                onClick={() => setMenuOpen(false)}
              >
                Super Dashboard
              </Button>
            )}

            {status === 'authenticated' && isAdminOrSuperUser && (
              <Button
                component={Link}
                href="/admin"
                startIcon={<DashboardIcon />}
                variant="outlined"
                onClick={() => setMenuOpen(false)}
              >
                Admin Dashboard
              </Button>
            )}

            {status === 'authenticated' ? (
              <Button
                startIcon={<LogoutIcon />}
                variant="outlined"
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
              >
                Sign out
              </Button>
            ) : (
              <Button
                component={Link}
                href="/auth/signin"
                startIcon={<LoginIcon />}
                variant="contained"
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Button>
            )}
          </Stack>
        </Box>
      </Drawer>

      <Box
        sx={{
          background:
            'radial-gradient(circle at 15% 10%, #27595f 0%, transparent 35%), radial-gradient(circle at 80% -10%, #5f3f1f 0%, transparent 30%), linear-gradient(150deg, #0f2b2d 0%, #173b3f 45%, #08292d 100%)',
          minHeight: '100vh',
          pb: 6,
        }}
      >
        <Container maxWidth="lg" sx={{ pt: 6 }}>
          <Paper
            sx={{
              p: { xs: 3, md: 5 },
              mb: 4,
              background:
                'linear-gradient(145deg, rgba(254,252,248,0.95) 0%, rgba(240,250,246,0.92) 45%, rgba(255,244,219,0.9) 100%)',
              border: '1px solid rgba(27,122,100,0.22)',
              boxShadow: '0 22px 44px rgba(8, 41, 45, 0.28)',
            }}
          >
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 1 }}>
              Trekking in the Himalayas
            </Typography>
            <Typography variant="h3" sx={{ mt: 1, mb: 2 }}>
              Find your route through Nepal's most iconic trails
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
              From the high passes of Annapurna to the villages beneath Everest, NepalTrex helps you choose treks,
              compare routes, and plan safely before you fly.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button href="#treks" variant="contained" size="large">
                Explore Treks
              </Button>
              <Button href="#maps" variant="outlined" size="large">
                View Map Explorer
              </Button>
              {isAdminOrSuperUser && (
                <Button
                  component={Link}
                  href={isSuperUser ? '/dashboard' : '/admin'}
                  variant="outlined"
                  startIcon={<DashboardIcon />}
                  size="large"
                >
                  {isSuperUser ? 'Super Dashboard' : 'Admin Dashboard'}
                </Button>
              )}
              {isAdminOrSuperUser && (
                <Button component={Link} href="/admin" variant="outlined" size="large">
                  Manage Stays
                </Button>
              )}
            </Stack>
          </Paper>

          <Box id="treks" sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ mb: 1, color: '#ffffff', textShadow: '0 2px 14px rgba(0,0,0,0.35)' }}>
              Featured Trekking Routes
            </Typography>
            <Typography color="rgba(255,255,255,0.8)" sx={{ mb: 2 }}>
              Popular guided journeys for first-timers and experienced hikers.
            </Typography>
            <Stack spacing={2}>
              {featuredTreks.map((trek) => (
                <Card
                  key={trek.name}
                  sx={{
                    background:
                      'linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(241,248,246,0.94) 100%)',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6">{trek.name}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Duration: ${formatDurationDays(trek.durationDays)}`} size="small" />
                      <Chip label={`Difficulty: ${titleCase(trek.level)}`} size="small" color="secondary" />
                      <Chip label={`Region: ${trek.region}`} size="small" variant="outlined" />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>

          <Box id="stays" sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ mb: 1, color: '#ffffff', textShadow: '0 2px 14px rgba(0,0,0,0.35)' }}>
              Hotels and Homestays
            </Typography>
            <Typography color="rgba(255,255,255,0.84)" sx={{ mb: 2 }}>
              Browse local accommodations and compare room and food menu options.
            </Typography>
            <Stack spacing={2}>
              {stays.map((stay) => (
                <Card
                  key={stay.id}
                  sx={{
                    background:
                      'linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(241,248,246,0.94) 100%)',
                  }}
                >
                  <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                      <Box>
                        <Typography variant="h6">{stay.name}</Typography>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>
                          {stay.location}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          <Chip label={titleCase(stay.stayType)} size="small" color="secondary" />
                          <Chip label={formatStartingPrice(stay.menuItems)} size="small" />
                        </Stack>
                      </Box>
                      <Stack justifyContent="center">
                        <Button component={Link} href={`/${stay.slug}`} variant="contained">
                          View Stay
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {stays.length === 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography color="text.secondary">No stays registered yet.</Typography>
                </Paper>
              )}
            </Stack>
          </Box>

          <Paper
            id="regions"
            sx={{
              p: 3,
              mb: 4,
              background: 'linear-gradient(140deg, #f9fefc 0%, #eef7f3 100%)',
            }}
          >
            <Typography variant="h5" sx={{ mb: 1 }}>
              Regions at a Glance
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {trekRegions.map((region) => (
                <Chip key={region} label={region} sx={{ mb: 1 }} />
              ))}
            </Stack>
          </Paper>

          <Paper
            id="maps"
            sx={{
              p: 3,
              mb: 4,
              background: 'linear-gradient(140deg, #fffdf7 0%, #f3faf7 100%)',
            }}
          >
            <Typography variant="h5" sx={{ mb: 1 }}>
              Map Explorer
            </Typography>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <iframe
                title="Nepal map"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=80.0%2C26.0%2C89.0%2C31.0&layer=mapnik"
                style={{ width: '100%', height: '360px', border: 0 }}
              />
            </Box>
          </Paper>

          <Paper
            id="about"
            sx={{
              p: 3,
              mb: 4,
              background: 'linear-gradient(140deg, #f8fffc 0%, #eef6f2 100%)',
            }}
          >
            <Typography variant="h5" sx={{ mb: 1 }}>
              Why NepalTrex
            </Typography>
            <Typography color="text.secondary">
              We combine local guides, safe pacing itineraries, and route support to help you trek smarter.
            </Typography>
          </Paper>

          <Paper id="contact" sx={{ p: 3 }}>
            <Typography variant="subtitle1">nepaltrex.com</Typography>
            <Typography color="text.secondary">Email: hello@nepaltrex.com</Typography>
            <Typography color="text.secondary">Kathmandu, Nepal</Typography>
          </Paper>
        </Container>
      </Box>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const trekRows = await query(
      `
        SELECT name, duration_days, level, region
        FROM treks
        WHERE is_featured = true
        ORDER BY name ASC
      `
    );

    const featuredTreks = trekRows.rows.map((row) => ({
      name: row.name,
      durationDays: row.duration_days,
      level: row.level,
      region: row.region,
    }));

    const regionRows = await query(
      `
        SELECT DISTINCT region
        FROM treks
        ORDER BY region ASC
      `
    );

    const trekRegions = regionRows.rows.map((row) => row.region);

    const stayRows = await query(
      `
        SELECT id, name, slug, stay_type, location, menu_items
        FROM stays
        ORDER BY created_at DESC
      `
    );

    const stays = stayRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      stayType: row.stay_type,
      location: row.location,
      menuItems: Array.isArray(row.menu_items) ? row.menu_items : [],
    }));

    return {
      props: {
        featuredTreks,
        trekRegions,
        stays,
      },
    };
  } catch {
    return {
      props: {
        featuredTreks: FEATURED_TREKS,
        trekRegions: Array.from(TREK_REGIONS),
        stays: [],
      },
    };
  }
}
