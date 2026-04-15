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

const BRAND_LOGO_SRC = '/brand/nepaltrex-logo.png';

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
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

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
  const visibleTreks = showWishlistOnly ? wishlistedTreks : allTreks;

  const treksByRegion = useMemo(() => {
    const map = new Map();

    visibleTreks.forEach((trek) => {
      const region = trek.region || 'Other';
      if (!map.has(region)) {
        map.set(region, []);
      }
      map.get(region).push(trek);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([region, treks]) => ({
        region,
        treks: [...treks].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [visibleTreks]);

  return (
    <>
      <Head>
        <title>NepalTrex | Trek Wishlist & Planning</title>
      </Head>

      <AppBar position="sticky" elevation={0} sx={{ backdropFilter: 'blur(8px)' }}>
        <Toolbar>
          <Box
            component={Link}
            href="/"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
            }}
          >
            <Box
              component="img"
              src={BRAND_LOGO_SRC}
              alt="NepalTrex logo"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              sx={{
                width: { xs: 42, sm: 48 },
                height: { xs: 42, sm: 48 },
                objectFit: 'contain',
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.7)',
                p: 0.25,
              }}
            />
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
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <AppButton
            variant={showWishlistOnly ? 'contained' : 'outlined'}
            size="small"
            startIcon={<FavoriteIcon />}
            onClick={() => setShowWishlistOnly((prev) => !prev)}
            sx={{ mr: 1, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {showWishlistOnly ? 'Showing Wishlist' : `${wishlist.length} wishlist`}
          </AppButton>
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
              Trek Planning in Nepal
            </Typography>
            <Box
              component="img"
              src={BRAND_LOGO_SRC}
              alt="NepalTrex mascot"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              sx={{
                width: { xs: 92, sm: 120 },
                height: { xs: 92, sm: 120 },
                objectFit: 'contain',
                borderRadius: 3,
                mb: 1.25,
                mt: 1,
                border: '1px solid rgba(15, 118, 110, 0.22)',
                bgcolor: 'rgba(255,255,255,0.66)',
                p: 0.5,
              }}
            />
            <Typography
              variant="h3"
              sx={(theme) => ({
                mt: 1,
                mb: 2,
                color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
              })}
            >
              Plan your Himalayan trek with confidence
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
              Discover routes by region, shortlist your favorites, and open complete trek pages with route maps and nearby stays. Built for international travelers preparing for Nepal.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <AppButton href="#treks" variant="contained" size="large">
                Explore Treks
              </AppButton>
              <AppButton variant="outlined" size="large" disabled>
                {wishlistedTreks.length} saved
              </AppButton>
            </Stack>
          </Paper>

          <Box id="treks" sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={(theme) => ({
                mb: 1,
                color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
              })}
            >
              Treks by Region
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Click any trek image to open full route details, map, and nearby stay options.
            </Typography>
            {treksByRegion.map(({ region, treks }) => (
              <Box key={region} sx={{ mb: 3 }}>
                <Typography
                  variant="h5"
                  sx={(theme) => ({
                    mb: 1.25,
                    color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                  })}
                >
                  {region}
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
                  {treks.map((trek) => {
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
                            alt={`${trek.name} route preview`}
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
                          <AppButton
                            variant={isSaved ? 'contained' : 'outlined'}
                            size="small"
                            startIcon={isSaved ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                            onClick={() => toggleWishlist(trek.slug)}
                          >
                            {isSaved ? 'Saved' : 'Wishlist'}
                          </AppButton>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            ))}

            {treksByRegion.length === 0 && (
              <Alert severity="info">
                No treks found for the current filter. Try turning off wishlist-only mode.
              </Alert>
            )}
          </Box>

          <Paper
            id="about"
            sx={(theme) => ({
              p: 3,
              mb: 3,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                  : undefined,
            })}
          >
            <Typography
              variant="h5"
              sx={(theme) => ({
                mb: 1,
                color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
              })}
            >
              About NepalTrex
            </Typography>
            <Typography color="text.secondary">
              NepalTrex helps international trekkers compare routes, understand elevation and pacing, and find suitable stays around each trekking corridor in Nepal.
            </Typography>
          </Paper>

          <Paper
            id="contact"
            sx={(theme) => ({
              p: 3,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                  : undefined,
            })}
          >
            <Typography
              variant="subtitle1"
              sx={(theme) => ({ color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary })}
            >
              nepaltrex.com
            </Typography>
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
