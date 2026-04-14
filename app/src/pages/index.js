import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
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

const DEFAULT_MAP_SRC = 'https://www.openstreetmap.org/export/embed.html?bbox=80.0%2C26.0%2C89.0%2C31.0&layer=mapnik';

const ROUTE_MAPS = {
  'everest base camp': {
    bbox: '86.60,27.68,87.05,28.20',
    marker: '27.9881,86.9250',
  },
  'annapurna circuit': {
    bbox: '83.70,28.20,84.30,28.90',
    marker: '28.5983,83.9311',
  },
  'langtang valley': {
    bbox: '85.30,28.00,85.80,28.40',
    marker: '28.2112,85.5563',
  },
};

function mapEmbedForTrekName(name) {
  const preset = ROUTE_MAPS[(name || '').toLowerCase()];
  if (!preset) {
    return DEFAULT_MAP_SRC;
  }

  return `https://www.openstreetmap.org/export/embed.html?bbox=${preset.bbox}&layer=mapnik&marker=${preset.marker}`;
}

export default function HomePage({ featuredTreks, trekRegions, stays }) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTrek, setSelectedTrek] = useState('');
  const mapsSectionRef = useRef(null);

  const mapSrc = useMemo(() => mapEmbedForTrekName(selectedTrek), [selectedTrek]);

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

  const openRouteInMap = (trekName) => {
    setSelectedTrek(trekName);
    mapsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Head>
        <title>NepalTrex | Trekking Adventures in Nepal</title>
      </Head>

      <AppBar
        position="sticky"
        elevation={0}
        sx={(theme) => ({
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(90deg, rgba(31,41,55,0.96) 0%, rgba(51,65,85,0.96) 100%)'
              : '#ffffff',
          color: theme.palette.mode === 'dark' ? '#fff7ed' : theme.palette.text.primary,
          borderBottom:
            theme.palette.mode === 'dark' ? '1px solid rgba(217,119,69,0.35)' : '1px solid rgba(148,163,184,0.3)',
          backdropFilter: 'blur(8px)',
        })}
      >
        <Toolbar>
          <BabyTrexLogoWithText size={34} color="#f4b183" />
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
        sx={(theme) => ({
          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 18% 12%, rgba(195,122,84,0.34) 0%, transparent 38%), radial-gradient(circle at 82% -6%, rgba(110,142,173,0.34) 0%, transparent 32%), linear-gradient(160deg, #1f2937 0%, #334155 46%, #1e293b 100%)'
              : theme.palette.background.default,
          minHeight: '100vh',
          pb: 6,
        })}
      >
        <Container maxWidth="lg" sx={{ pt: 6 }}>
          <Paper
            sx={{
              p: { xs: 3, md: 5 },
              mb: 4,
              background:
                'linear-gradient(145deg, rgba(255,250,242,0.96) 0%, rgba(252,246,237,0.95) 50%, rgba(245,237,227,0.94) 100%)',
              border: '1px solid rgba(148,163,184,0.3)',
              boxShadow: '0 22px 44px rgba(15, 23, 42, 0.28)',
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
            <Typography
              variant="h4"
              sx={(theme) => ({
                mb: 1,
                color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                textShadow: theme.palette.mode === 'dark' ? '0 2px 14px rgba(0,0,0,0.35)' : 'none',
              })}
            >
              Featured Trekking Routes
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Popular guided journeys for first-timers and experienced hikers.
            </Typography>
            <Stack spacing={2}>
              {featuredTreks.map((trek) => (
                <Card
                  key={trek.name}
                  sx={{
                    background:
                      'linear-gradient(145deg, rgba(255,251,245,0.97) 0%, rgba(250,244,236,0.95) 100%)',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6">{trek.name}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Duration: ${formatDurationDays(trek.durationDays)}`} size="small" />
                      <Chip label={`Difficulty: ${titleCase(trek.level)}`} size="small" color="secondary" />
                      <Chip label={`Region: ${trek.region}`} size="small" variant="outlined" />
                    </Stack>
                    <Button variant="outlined" sx={{ mt: 1.4 }} onClick={() => openRouteInMap(trek.name)}>
                      Open Route In Maps
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>

          <Box id="stays" sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={(theme) => ({
                mb: 1,
                color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                textShadow: theme.palette.mode === 'dark' ? '0 2px 14px rgba(0,0,0,0.35)' : 'none',
              })}
            >
              Hotels and Homestays
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Browse local accommodations and compare room and food menu options.
            </Typography>
            <Stack spacing={2}>
              {stays.map((stay) => (
                <Card
                  key={stay.id}
                  sx={{
                    background:
                      'linear-gradient(145deg, rgba(255,251,245,0.97) 0%, rgba(250,244,236,0.95) 100%)',
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
              background: 'linear-gradient(140deg, #fff8ef 0%, #f6ecdf 100%)',
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
            ref={mapsSectionRef}
            sx={{
              p: 3,
              mb: 4,
              background: 'linear-gradient(140deg, #fffaf1 0%, #f7f0e5 100%)',
            }}
          >
            <Typography variant="h5" sx={{ mb: 1 }}>
              Map Explorer
            </Typography>
            {selectedTrek && (
              <Typography color="text.secondary" sx={{ mb: 1.2 }}>
                Showing route area for {selectedTrek}
              </Typography>
            )}
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <iframe
                title="Nepal map"
                loading="lazy"
                src={mapSrc}
                style={{ width: '100%', height: '360px', border: 0 }}
              />
            </Box>
          </Paper>

          <Paper
            id="about"
            sx={{
              p: 3,
              mb: 4,
              background: 'linear-gradient(140deg, #fff7ef 0%, #f4ebe1 100%)',
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
