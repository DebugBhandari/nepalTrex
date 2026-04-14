import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Box,
  Card,
  CardContent,
  CardMedia,
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
import AppButton from '../components/AppButton';

const navItems = [
  { label: 'Stays', href: '#stays' },
  { label: 'Treks', href: '#treks' },
  { label: 'Regions', href: '#regions' },
  { label: 'Maps', href: '#maps' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

const TrekRouteMap = dynamic(() => import('../components/TrekRouteMap'), { ssr: false });

const TREK_IMAGE_BY_NAME = {
  'everest base camp trek': '/treks/everest-base-camp.jpg',
  'gokyo lakes trek': '/treks/gokyo-lakes.jpg',
  'three passes trek': '/treks/three-passes.jpg',
  'island peak trek': '/treks/island-peak.jpg',
  'annapurna circuit trek': '/treks/annapurna-circuit.jpg',
  'annapurna base camp trek': '/treks/annapurna-base-camp.jpg',
  'poon hill trek': '/treks/poon-hill.jpg',
  'mardi himal trek': '/treks/mardi-himal.jpg',
  'langtang valley trek': '/treks/langtang-valley.jpg',
  'gosaikunda lake trek': '/treks/gosaikunda-lake.jpg',
  'helambu trek': '/treks/helambu.jpg',
  'manaslu circuit trek': '/treks/manaslu-circuit.jpg',
  'tsum valley trek': '/treks/tsum-valley.jpg',
  'upper mustang trek': '/treks/upper-mustang.jpg',
  'kanchenjunga north base camp trek': '/treks/kanchenjunga.jpg',
  'rara lake trek': '/treks/rara-lake.jpg',
  // aliases without 'trek' suffix
  'everest base camp': '/treks/everest-base-camp.jpg',
  'gokyo lakes': '/treks/gokyo-lakes.jpg',
  'three passes': '/treks/three-passes.jpg',
  'annapurna circuit': '/treks/annapurna-circuit.jpg',
  'annapurna base camp': '/treks/annapurna-base-camp.jpg',
  'poon hill': '/treks/poon-hill.jpg',
  'mardi himal': '/treks/mardi-himal.jpg',
  'langtang valley': '/treks/langtang-valley.jpg',
  'gosaikunda lake': '/treks/gosaikunda-lake.jpg',
  'helambu': '/treks/helambu.jpg',
  'manaslu circuit': '/treks/manaslu-circuit.jpg',
  'tsum valley': '/treks/tsum-valley.jpg',
  'upper mustang': '/treks/upper-mustang.jpg',
  'kanchenjunga north base camp': '/treks/kanchenjunga.jpg',
  'rara lake': '/treks/rara-lake.jpg',
};

const REGION_IMAGE_BY_KEYWORD = {
  everest: '/treks/everest-base-camp.jpg',
  khumbu: '/treks/everest-base-camp.jpg',
  annapurna: '/treks/annapurna-circuit.jpg',
  langtang: '/treks/langtang-valley.jpg',
  manaslu: '/treks/manaslu-circuit.jpg',
  mustang: '/treks/upper-mustang.jpg',
  kanchenjunga: '/treks/kanchenjunga.jpg',
  western: '/treks/rara-lake.jpg',
};

const ROUTE_GEOJSON_BY_NAME = {
  'everest base camp': {
    type: 'LineString',
    coordinates: [
      [86.7314, 27.6881],
      [86.7138, 27.8077],
      [86.8318, 27.8965],
      [86.8652, 27.9881],
    ],
  },
  'everest base camp trek': {
    type: 'LineString',
    coordinates: [
      [86.7314, 27.6881],
      [86.7138, 27.8077],
      [86.8318, 27.8965],
      [86.8652, 27.9881],
    ],
  },
  'annapurna circuit': {
    type: 'LineString',
    coordinates: [
      [84.41, 28.235],
      [84.628, 28.595],
      [84.758, 28.796],
      [83.97, 28.824],
      [83.682, 28.209],
    ],
  },
  'langtang valley': {
    type: 'LineString',
    coordinates: [
      [85.358, 28.213],
      [85.417, 28.3],
      [85.482, 28.4],
      [85.5, 28.41],
    ],
  },
  'langtang valley trek': {
    type: 'LineString',
    coordinates: [
      [85.358, 28.213],
      [85.417, 28.3],
      [85.482, 28.4],
      [85.5, 28.41],
    ],
  },
};

function routeGeojsonByName(name) {
  return ROUTE_GEOJSON_BY_NAME[(name || '').toLowerCase()] || null;
}

function getTrekImage(name) {
  const key = (name || '').toLowerCase();
  return TREK_IMAGE_BY_NAME[key] || '/treks/everest-base-camp.jpg';
}

function getRegionImage(region, regionTreks) {
  const normalizedRegion = (region || '').toLowerCase();

  for (const key of Object.keys(REGION_IMAGE_BY_KEYWORD)) {
    if (normalizedRegion.includes(key)) {
      return REGION_IMAGE_BY_KEYWORD[key];
    }
  }

  const firstTrekName = regionTreks[0]?.name;
  return getTrekImage(firstTrekName, region);
}

export default function HomePage({ featuredTreks, trekRegions, allTreks, stays, dataSource, dataError }) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTrek, setSelectedTrek] = useState(null);
  const [expandedRegion, setExpandedRegion] = useState('');
  const mapsSectionRef = useRef(null);

  const treksByRegion = useMemo(() => {
    const regionMap = new Map();

    allTreks.forEach((trek) => {
      const regionKey = trek.region || 'Other Routes';
      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, []);
      }
      regionMap.get(regionKey).push(trek);
    });

    return trekRegions.map((region) => ({
      region,
      treks: regionMap.get(region) || [],
    }));
  }, [allTreks, trekRegions]);

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

  const openRouteInMap = (trek) => {
    if (!trek?.name) {
      return;
    }

    setSelectedTrek({
      name: trek.name,
      routeGeojson: trek.routeGeojson || routeGeojsonByName(trek.name),
    });

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
        sx={{ backdropFilter: 'blur(8px)' }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: 0.2,
              color: '#f59e0b',
            }}
          >
            NepalTrex
          </Typography>
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
              <AppButton key={item.href} href={item.href} variant="outlined" onClick={() => setMenuOpen(false)}>
                {item.label}
              </AppButton>
            ))}

            {status === 'authenticated' && isSuperUser && (
              <AppButton
                component={Link}
                href="/dashboard"
                startIcon={<DashboardIcon />}
                variant="contained"
                onClick={() => setMenuOpen(false)}
              >
                Super Dashboard
              </AppButton>
            )}

            {status === 'authenticated' && isAdminOrSuperUser && (
              <AppButton
                component={Link}
                href="/admin"
                startIcon={<DashboardIcon />}
                variant="outlined"
                onClick={() => setMenuOpen(false)}
              >
                Admin Dashboard
              </AppButton>
            )}

            {status === 'authenticated' ? (
              <AppButton
                startIcon={<LogoutIcon />}
                variant="outlined"
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
              >
                Sign out
              </AppButton>
            ) : (
              <AppButton
                component={Link}
                href="/auth/signin"
                startIcon={<LoginIcon />}
                variant="contained"
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </AppButton>
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
          {dataSource === 'fallback' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Showing fallback trek data because database routes could not be loaded.
              {dataError ? ` (${dataError})` : ''}
            </Alert>
          )}

          <Paper
            sx={(theme) => ({
              p: { xs: 3, md: 5 },
              mb: 4,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.95) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.98) 100%)',
              boxShadow: '0 22px 44px rgba(15, 23, 42, 0.28)',
            })}
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
              <AppButton href="#treks" variant="contained" size="large">
                Explore Treks
              </AppButton>
              <AppButton href="#maps" variant="outlined" size="large">
                View Map Explorer
              </AppButton>
              {isAdminOrSuperUser && (
                <AppButton
                  component={Link}
                  href={isSuperUser ? '/dashboard' : '/admin'}
                  variant="outlined"
                  startIcon={<DashboardIcon />}
                  size="large"
                >
                  {isSuperUser ? 'Super Dashboard' : 'Admin Dashboard'}
                </AppButton>
              )}
              {isAdminOrSuperUser && (
                <AppButton component={Link} href="/admin" variant="outlined" size="large">
                  Manage Stays
                </AppButton>
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
                  sx={(theme) => ({
                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                        : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.96) 100%)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                    },
                  })}
                  onClick={() => openRouteInMap(trek)}
                >
                  <CardMedia
                    component="img"
                    height="220"
                    image={getTrekImage(trek.name)}
                    alt={`${trek.name} route landscape`}
                    sx={{ pointerEvents: 'none' }}
                  />
                  <CardContent>
                    <Typography variant="h6">{trek.name}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={`${trek.durationDays} days`} size="small" />
                      <Chip label={trek.level} size="small" color="secondary" />
                      {trek.elevationMaxM && (
                        <Chip label={`↑ ${trek.elevationMaxM.toLocaleString()}m`} size="small" variant="outlined" />
                      )}
                    </Stack>
                    <AppButton variant="outlined" sx={{ mt: 1.4 }} onClick={(e) => { e.stopPropagation(); openRouteInMap(trek); }}>
                      Open Route In Maps
                    </AppButton>
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
                  sx={(theme) => ({
                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                        : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.96) 100%)',
                  })}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={stay.imageUrl || '/stays/lodge-exterior.jpg'}
                    alt={stay.name}
                    sx={{ objectFit: 'cover' }}
                  />
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
                        <AppButton component={Link} href={`/${stay.slug}`} variant="contained">
                          View Stay
                        </AppButton>
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
            sx={(theme) => ({
              p: 3,
              mb: 4,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                  : 'linear-gradient(140deg, #ffffff 0%, #f2fbf9 100%)',
            })}
          >
            <Typography variant="h5" sx={{ mb: 1 }}>
              Trek Regions
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Select a region to expand its available treks with duration, difficulty, and route details.
            </Typography>
            <Stack spacing={2}>
              {treksByRegion.map((regionGroup) => (
                <Card
                  key={regionGroup.region}
                  sx={(theme) => ({
                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                        : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.96) 100%)',
                  })}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={getRegionImage(regionGroup.region, regionGroup.treks)}
                    alt={`${regionGroup.region} trekking region`}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setExpandedRegion(expandedRegion === regionGroup.region ? '' : regionGroup.region)}
                  />
                  <Accordion
                    disableGutters
                    expanded={expandedRegion === regionGroup.region}
                    onChange={(_, isExpanded) => setExpandedRegion(isExpanded ? regionGroup.region : '')}
                    sx={{
                      background: 'transparent',
                      boxShadow: 'none',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`region-panel-${regionGroup.region}`}
                      id={`region-panel-header-${regionGroup.region}`}
                    >
                      <Box>
                        <Typography variant="h6">{regionGroup.region}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {regionGroup.treks.length} trek{regionGroup.treks.length === 1 ? '' : 's'} available
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        {regionGroup.treks.map((trek) => (
                          <Paper key={trek.name} sx={{ p: 2 }}>
                            <Typography variant="subtitle1">{trek.name}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1, flexWrap: 'wrap' }}>
                              <Chip label={`${trek.durationDays} days`} size="small" />
                              <Chip label={trek.level} size="small" color="secondary" />
                              {trek.elevationMaxM && (
                                <Chip label={`↑ ${trek.elevationMaxM.toLocaleString()}m`} size="small" variant="outlined" />
                              )}
                            </Stack>
                            <Typography color="text.secondary" sx={{ mb: 1.2 }}>
                              {trek.description || 'Description coming soon.'}
                            </Typography>
                            <AppButton size="small" variant="outlined" onClick={() => openRouteInMap(trek)}>
                              Open Route In Maps
                            </AppButton>
                          </Paper>
                        ))}
                        {regionGroup.treks.length === 0 && (
                          <Typography color="text.secondary">No treks published yet for this region.</Typography>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Card>
              ))}
            </Stack>
          </Paper>

          <Paper
            id="maps"
            ref={mapsSectionRef}
            sx={(theme) => ({
              p: 3,
              mb: 4,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                  : 'linear-gradient(140deg, #ffffff 0%, #f2fbf9 100%)',
            })}
          >
            <Typography variant="h5" sx={{ mb: 1 }}>
              Map Explorer
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.2 }}>
              {selectedTrek
                ? `Showing GeoJSON route for ${selectedTrek.name}`
                : 'Pick any trek and click Open Route In Maps to draw the trail route.'}
            </Typography>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <TrekRouteMap selectedTrek={selectedTrek} />
            </Box>
          </Paper>

          <Paper
            id="about"
            sx={(theme) => ({
              p: 3,
              mb: 4,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                  : 'linear-gradient(140deg, #ffffff 0%, #f2fbf9 100%)',
            })}
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
        SELECT name, duration_days, level, region, description, route_geojson, is_featured, elevation_min_m, elevation_max_m
        FROM treks
        ORDER BY name ASC
      `
    );

    const allTreks = trekRows.rows.map((row) => ({
      name: row.name,
      durationDays: row.duration_days,
      level: row.level,
      region: row.region,
      description: row.description || '',
      routeGeojson: row.route_geojson || routeGeojsonByName(row.name),
      isFeatured: row.is_featured,
      elevationMinM: row.elevation_min_m || null,
      elevationMaxM: row.elevation_max_m || null,
    }));

    const featuredTreks = allTreks.filter((row) => row.isFeatured);
    const trekRegions = Array.from(new Set(allTreks.map((row) => row.region))).sort((a, b) => a.localeCompare(b));

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
        allTreks,
        stays,
        dataSource: 'database',
        dataError: '',
      },
    };
  } catch (error) {
    console.error('Homepage data fallback:', error);

    const fallbackTreks = FEATURED_TREKS.map((trek) => ({
      ...trek,
      description: '',
      routeGeojson: routeGeojsonByName(trek.name),
      isFeatured: true,
    }));

    return {
      props: {
        featuredTreks: fallbackTreks,
        trekRegions: Array.from(TREK_REGIONS),
        allTreks: fallbackTreks,
        stays: [],
        dataSource: 'fallback',
        dataError: error?.message || 'Unknown database error',
      },
    };
  }
}
