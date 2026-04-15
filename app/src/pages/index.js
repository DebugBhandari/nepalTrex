import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import {
  Alert,
  AppBar,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Drawer,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { FEATURED_TREKS } from '@org/types';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';
import AppIconButton from '../components/AppIconButton';
import { getTrekImage, slugifyTrekName } from '../lib/treks';

const navItems = [
  { label: 'Treks', href: '#treks' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

const WISHLIST_STORAGE_KEY = 'nepaltrex-trek-wishlist';

export default function HomePage({ allTreks, dataSource, dataError }) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  const isAdminOrSuperUser = ['admin', 'superUser'].includes(session?.user?.role || '');
  const isSuperUser = session?.user?.role === 'superUser';

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setWishlist(parsed.filter((slug) => typeof slug === 'string'));
      }
    } catch {
      setWishlist([]);
    }
  }, []);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const toggleWishlist = (slug) => {
    setWishlist((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const wishlistedTreks = useMemo(() => allTreks.filter((trek) => wishlistSet.has(trek.slug)), [allTreks, wishlistSet]);

  return (
    <>
      <Head>
        <title>NepalTrex | Trek Wishlist & Planning</title>
      </Head>

      <AppBar position="sticky" elevation={0} sx={{ backdropFilter: 'blur(8px)' }}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: 0.2,
              color: '#0f766e',
            }}
          >
            NepalTrex
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            icon={<FavoriteIcon style={{ color: '#ffffff' }} />}
            label={`${wishlist.length} wishlist`}
            sx={{
              mr: 1,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #0f766e 0%, #285A48 100%)',
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          />
          <AppIconButton onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </AppIconButton>
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
              ? 'radial-gradient(circle at 18% 12%, rgba(64,138,113,0.34) 0%, transparent 38%), radial-gradient(circle at 82% -6%, rgba(110,142,173,0.34) 0%, transparent 32%), linear-gradient(160deg, #1f2937 0%, #334155 46%, #1e293b 100%)'
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
              Trek Discovery
            </Typography>
            <Typography variant="h3" sx={{ mt: 1, mb: 2 }}>
              Save routes to your wishlist and open full trek guides
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
              Home now focuses on quick trek thumbnails and wishlisting. Click any trek card to open its detailed route page with complete information, always-on map, and nearby stays.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <AppButton href="#treks" variant="contained" size="large">
                Explore Trek Thumbnails
              </AppButton>
              <Chip
                label={`${wishlistedTreks.length} saved`}
                color="secondary"
                sx={{ alignSelf: 'center' }}
              />
            </Stack>
          </Paper>

          <Box id="treks" sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Trek Thumbnails
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Tap a trek to open full details, route map, and nearby stay options.
            </Typography>

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
              {allTreks.map((trek) => {
                const isSaved = wishlistSet.has(trek.slug);

                return (
                  <Card
                    key={trek.slug}
                    sx={(theme) => ({
                      background:
                        theme.palette.mode === 'dark'
                          ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                          : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.96) 100%)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                      },
                    })}
                  >
                    <Link href={`/${trek.slug}`}>
                      <CardMedia
                        component="img"
                        height="220"
                        image={getTrekImage(trek.name)}
                        alt={`${trek.name} thumbnail`}
                        sx={{ objectFit: 'cover', objectPosition: 'center', cursor: 'pointer' }}
                      />
                    </Link>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {trek.name}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 1.2, flexWrap: 'wrap' }}>
                        <Chip label={trek.level} size="small" color="secondary" />
                        <Chip label={`${trek.durationDays} days`} size="small" variant="outlined" />
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <AppButton component={Link} href={`/${trek.slug}`} variant="outlined" size="small">
                          Open Trek Page
                        </AppButton>
                        <AppButton
                          variant={isSaved ? 'contained' : 'outlined'}
                          size="small"
                          startIcon={isSaved ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                          onClick={() => toggleWishlist(trek.slug)}
                        >
                          {isSaved ? 'Saved' : 'Wishlist'}
                        </AppButton>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>

          <Paper id="about" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              About NepalTrex
            </Typography>
            <Typography color="text.secondary">
              NepalTrex helps trekkers discover routes, shortlist favorites, and evaluate accommodation options around each trail.
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
      slug: slugifyTrekName(row.name),
      durationDays: row.duration_days,
      level: row.level,
      region: row.region,
      description: row.description || '',
      routeGeojson: row.route_geojson,
      isFeatured: row.is_featured,
      elevationMinM: row.elevation_min_m || null,
      elevationMaxM: row.elevation_max_m || null,
    }));

    return {
      props: {
        allTreks,
        dataSource: 'database',
        dataError: '',
      },
    };
  } catch (error) {
    console.error('Homepage data fallback:', error);

    const fallbackTreks = FEATURED_TREKS.map((trek) => ({
      ...trek,
      slug: slugifyTrekName(trek.name),
      description: '',
      routeGeojson: null,
      isFeatured: true,
      elevationMinM: null,
      elevationMaxM: null,
    }));

    return {
      props: {
        allTreks: fallbackTreks,
        dataSource: 'fallback',
        dataError: error?.message || 'Unknown database error',
      },
    };
  }
}
