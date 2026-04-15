import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Select,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { FEATURED_TREKS } from '@org/types';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';
import { getTrekImage, minDistanceToRouteKm, parseRouteWaypoints, slugifyTrekName } from '../lib/treks';

const WISHLIST_STORAGE_KEY = 'nepaltrex-trek-wishlist';

const DURATION_FILTERS = [
  { value: 'all', label: 'Any Duration' },
  { value: 'short', label: 'Up to 7 days' },
  { value: 'medium', label: '8 to 12 days' },
  { value: 'long', label: '13+ days' },
];

const ALTITUDE_FILTERS = [
  { value: 'all', label: 'Any Altitude' },
  { value: 'low', label: 'Below 4,000m' },
  { value: 'mid', label: '4,000m to 5,000m' },
  { value: 'high', label: 'Above 5,000m' },
  { value: 'unknown', label: 'Altitude not listed' },
];

const NEARBY_STAY_THRESHOLD_KM = 35;

function normalizeDifficulty(level) {
  return (level || '').trim().toLowerCase();
}

function maxAltitude(trek) {
  return Math.max(trek.elevationMaxM || 0, trek.elevationMinM || 0);
}

function normalizeHandle(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

function initialsFromName(value) {
  const text = String(value || '').trim();
  if (!text) return 'NT';
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase() || first.toUpperCase() || 'NT';
}

export default function HomePage({ allTreks, dataSource, dataError }) {
  const { data: session, status } = useSession();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [wishlistAnchor, setWishlistAnchor] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [selectedAltitude, setSelectedAltitude] = useState('all');

  const isAdminOrSuperUser = ['admin', 'superUser'].includes(session?.user?.role || '');
  const isSuperUser = session?.user?.role === 'superUser';
  const isUserMenuOpen = Boolean(userMenuAnchor);
  const profileHandle = normalizeHandle(session?.user?.name || (session?.user?.email || '').split('@')[0]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      fetch('/api/users/wishlist')
        .then((r) => r.json())
        .then((data) => setWishlist(data.slugs || []))
        .catch(() => setWishlist([]));
    } else {
      try {
        const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          setWishlist(parsed.filter((slug) => typeof slug === 'string'));
        }
      } catch {
        setWishlist([]);
      }
    }
  }, [status]);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const toggleWishlist = (slug) => {
    if (status === 'authenticated') {
      const isInList = wishlistSet.has(slug);
      setWishlist((prev) => (isInList ? prev.filter((s) => s !== slug) : [...prev, slug]));
      fetch('/api/users/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, action: isInList ? 'remove' : 'add' }),
      })
        .then((r) => r.json())
        .then((data) => { if (data.slugs) setWishlist(data.slugs); })
        .catch(() => {});
    } else {
      setWishlist((prev) => {
        const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
        window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  const wishlistedTreks = useMemo(() => allTreks.filter((trek) => wishlistSet.has(trek.slug)), [allTreks, wishlistSet]);
  const visibleTreks = allTreks;

  const regionOptions = useMemo(() => {
    const regions = new Set(allTreks.map((trek) => trek.region || 'Other'));
    return ['all', ...Array.from(regions).sort((a, b) => a.localeCompare(b))];
  }, [allTreks]);

  const difficultyOptions = useMemo(() => {
    const values = new Set(
      allTreks
        .map((trek) => normalizeDifficulty(trek.level))
        .filter(Boolean)
    );

    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [allTreks]);

  const filteredTreks = useMemo(() => {
    return visibleTreks.filter((trek) => {
      const region = trek.region || 'Other';
      const difficulty = normalizeDifficulty(trek.level);
      const duration = Number(trek.durationDays) || 0;
      const altitude = maxAltitude(trek);

      if (selectedRegion !== 'all' && region !== selectedRegion) {
        return false;
      }

      if (selectedDifficulty !== 'all' && difficulty !== selectedDifficulty) {
        return false;
      }

      if (selectedDuration === 'short' && duration > 7) {
        return false;
      }

      if (selectedDuration === 'medium' && (duration < 8 || duration > 12)) {
        return false;
      }

      if (selectedDuration === 'long' && duration < 13) {
        return false;
      }

      if (selectedAltitude === 'low' && altitude >= 4000) {
        return false;
      }

      if (selectedAltitude === 'mid' && (altitude < 4000 || altitude > 5000)) {
        return false;
      }

      if (selectedAltitude === 'high' && altitude <= 5000) {
        return false;
      }

      if (selectedAltitude === 'unknown' && altitude > 0) {
        return false;
      }

      if (selectedAltitude !== 'unknown' && selectedAltitude !== 'all' && altitude <= 0) {
        return false;
      }

      return true;
    });
  }, [visibleTreks, selectedRegion, selectedDifficulty, selectedDuration, selectedAltitude]);

  const treksByRegion = useMemo(() => {
    const map = new Map();

    filteredTreks.forEach((trek) => {
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
  }, [filteredTreks]);

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
              gap: 0.5,
              minWidth: 0,
              textDecoration: 'none',
            }}
          >
            <Box
              component="img"
              src="/brand/banner-mountains.svg"
              alt="NepalTrex mountain logo"
              sx={{ width: 38, height: 28, objectFit: 'contain' }}
            />
            <Typography
              variant="h6"
              sx={(theme) => ({
                fontWeight: 800,
                letterSpacing: 0.2,
                color: theme.palette.mode === 'dark' ? '#B0E4CC' : '#0f766e',
              })}
            >
              NepalTrex
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />

          {/* Wishlist heart button */}
          <IconButton
            color="inherit"
            onClick={(event) => setWishlistAnchor(event.currentTarget)}
            aria-label="Open wishlist"
            sx={{ mr: 0.5 }}
          >
            <Badge badgeContent={wishlistedTreks.length} color="error" max={99}>
              <FavoriteIcon sx={{ color: wishlistedTreks.length > 0 ? '#ef4444' : 'inherit' }} />
            </Badge>
          </IconButton>

          <Popover
            open={Boolean(wishlistAnchor)}
            anchorEl={wishlistAnchor}
            onClose={() => setWishlistAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: { width: 310, maxHeight: 420, display: 'flex', flexDirection: 'column', borderRadius: 2 },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FavoriteIcon sx={{ color: '#ef4444', fontSize: 18 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Wishlist · {wishlistedTreks.length} saved
              </Typography>
            </Box>
            <Divider />
            {wishlistedTreks.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No treks saved yet. Click the heart on any trek to save it.
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding sx={{ overflow: 'auto', flex: 1 }}>
                {wishlistedTreks.map((trek) => (
                  <ListItem
                    key={trek.slug}
                    divider
                    component={Link}
                    href={`/treks/${trek.slug}`}
                    onClick={() => setWishlistAnchor(null)}
                    sx={{
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { bgcolor: 'action.hover' },
                      cursor: 'pointer',
                    }}
                  >
                    <ListItemText
                      primary={trek.name}
                      secondary={[trek.region, trek.level, trek.durationDays ? `${trek.durationDays} days` : null].filter(Boolean).join(' · ')}
                      primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Popover>

          {status === 'authenticated' ? (
            <>
              <IconButton
                color="inherit"
                onClick={(event) => setUserMenuAnchor(event.currentTarget)}
                sx={(theme) => ({
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                  borderRadius: 999,
                  p: 0.4,
                })}
                aria-label="Open user menu"
              >
                <Avatar
                  src={session?.user?.image || ''}
                  alt={session?.user?.name || session?.user?.email || 'User'}
                  sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}
                >
                  {initialsFromName(session?.user?.name || session?.user?.email)}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={userMenuAnchor}
                open={isUserMenuOpen}
                onClose={() => setUserMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem component={Link} href={`/user/${profileHandle}`} onClick={() => setUserMenuAnchor(null)}>
                  <PersonIcon fontSize="small" style={{ marginRight: 8 }} />
                  Profile
                </MenuItem>

                {isSuperUser && (
                  <MenuItem component={Link} href="/dashboard" onClick={() => setUserMenuAnchor(null)}>
                    <DashboardIcon fontSize="small" style={{ marginRight: 8 }} />
                    Super Dashboard
                  </MenuItem>
                )}

                {isAdminOrSuperUser && (
                  <MenuItem component={Link} href="/admin" onClick={() => setUserMenuAnchor(null)}>
                    <DashboardIcon fontSize="small" style={{ marginRight: 8 }} />
                    Admin Dashboard
                  </MenuItem>
                )}

                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    signOut({ callbackUrl: '/' });
                  }}
                >
                  <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
                  Sign out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <AppButton component={Link} href="/auth/signin" startIcon={<LoginIcon />} variant="outlined" size="small">
              Sign in
            </AppButton>
          )}
        </Toolbar>
      </AppBar>

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
              position: 'relative',
              overflow: 'hidden',
              p: { xs: 3, md: 5 },
              mb: 4,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.95) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.98) 100%)',
              boxShadow: '0 22px 44px rgba(15, 23, 42, 0.28)',
              '&::after': {
                content: '""',
                position: 'absolute',
                right: { xs: -18, md: -12 },
                bottom: { xs: -12, md: -16 },
                width: { xs: '58%', sm: '46%', md: 360 },
                height: { xs: 90, sm: 110, md: 140 },
                backgroundImage: 'url(/brand/banner-mountains.svg)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'bottom right',
                backgroundSize: 'contain',
                opacity: theme.palette.mode === 'dark' ? 0.2 : 0.16,
                pointerEvents: 'none',
              },
            })}
          >
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 1 }}>
              Trek Planning in Nepal
            </Typography>
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
              Explore
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Click any trek image to open full route details, map, and nearby stay options.
            </Typography>

            <Paper
              sx={(theme) => ({
                p: 2,
                mb: 2.5,
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(242,251,249,0.96) 100%)',
              })}
            >
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>
                Filter Treks
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))',
                  },
                }}
              >
                <FormControl size="small" fullWidth>
                  <InputLabel id="region-filter-label">Region</InputLabel>
                  <Select
                    labelId="region-filter-label"
                    label="Region"
                    value={selectedRegion}
                    onChange={(event) => setSelectedRegion(event.target.value)}
                  >
                    {regionOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option === 'all' ? 'Any Region' : option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="difficulty-filter-label">Difficulty</InputLabel>
                  <Select
                    labelId="difficulty-filter-label"
                    label="Difficulty"
                    value={selectedDifficulty}
                    onChange={(event) => setSelectedDifficulty(event.target.value)}
                  >
                    {difficultyOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option === 'all' ? 'Any Difficulty' : option.charAt(0).toUpperCase() + option.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="duration-filter-label">Duration</InputLabel>
                  <Select
                    labelId="duration-filter-label"
                    label="Duration"
                    value={selectedDuration}
                    onChange={(event) => setSelectedDuration(event.target.value)}
                  >
                    {DURATION_FILTERS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="altitude-filter-label">Altitude</InputLabel>
                  <Select
                    labelId="altitude-filter-label"
                    label="Altitude"
                    value={selectedAltitude}
                    onChange={(event) => setSelectedAltitude(event.target.value)}
                  >
                    {ALTITUDE_FILTERS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 1.5 }}>
                <AppButton
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedRegion('all');
                    setSelectedDifficulty('all');
                    setSelectedDuration('all');
                    setSelectedAltitude('all');
                  }}
                >
                  Clear Filters
                </AppButton>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Showing {filteredTreks.length} trek{filteredTreks.length === 1 ? '' : 's'}
                </Typography>
              </Stack>
            </Paper>

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
                          color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                          },
                        })}
                      >
                        <Link href={`/treks/${trek.slug}`}>
                          <CardMedia
                            component="img"
                            height="220"
                            image={getTrekImage(trek.name)}
                            alt={`${trek.name} route preview`}
                            sx={{ objectFit: 'cover', objectPosition: 'center', cursor: 'pointer' }}
                          />
                        </Link>
                        <CardContent>
                          <Link href={`/treks/${trek.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="h6" sx={{ mb: 1, color: 'inherit', '&:hover': { textDecoration: 'underline' } }}>
                              {trek.name}
                            </Typography>
                          </Link>
                          <Stack direction="row" spacing={1} sx={{ mb: 1.2, flexWrap: 'wrap' }}>
                            <Chip label={trek.level} size="small" color="secondary" />
                            <Chip label={`${trek.durationDays} days`} size="small" variant="outlined" />
                            <Chip
                              label={`${trek.nearbyStaysCount || 0} nearby stays`}
                              size="small"
                              variant="outlined"
                            />
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
              mt: 1,
              p: { xs: 2.4, md: 3.2 },
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(130deg, rgba(15,118,110,0.25), rgba(19,30,49,0.95) 55%, rgba(11,18,32,0.95))'
                  : 'linear-gradient(130deg, rgba(15,118,110,0.12), rgba(255,255,255,0.98) 52%, rgba(242,251,249,0.98))',
              border: '1px solid',
              borderColor: 'divider',
            })}
          >
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '2fr 1fr 1fr',
                },
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={(theme) => ({ color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary })}
                >
                  NepalTrex
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.6, maxWidth: 460 }}>
                  Trusted planning companion for international trekkers exploring Nepal. Compare routes, manage your shortlist, and prepare with confidence.
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.7, fontWeight: 700 }}>
                  Connect
                </Typography>
                <Typography color="text.secondary">hello@nepaltrex.com</Typography>
                <Typography color="text.secondary">Kathmandu, Nepal</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.7, fontWeight: 700 }}>
                  Explore
                </Typography>
                <Typography color="text.secondary">Everest Region</Typography>
                <Typography color="text.secondary">Annapurna Region</Typography>
                <Typography color="text.secondary">Langtang Region</Typography>
              </Box>
            </Box>
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

    const stayRows = await query(
      `
        SELECT latitude, longitude
        FROM stays
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `
    );

    const stayCoordinates = stayRows.rows
      .map((stay) => ({
        lat: Number(stay.latitude),
        lng: Number(stay.longitude),
      }))
      .filter((stay) => Number.isFinite(stay.lat) && Number.isFinite(stay.lng));

    const allTreks = trekRows.rows.map((row) => ({
      routeWaypoints: parseRouteWaypoints(row.route_geojson),
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
    })).map((trek) => {
      const nearbyStaysCount = stayCoordinates.filter((stay) => {
        const distanceKm = minDistanceToRouteKm(trek.routeWaypoints, stay.lat, stay.lng);
        return Number.isFinite(distanceKm) && distanceKm <= NEARBY_STAY_THRESHOLD_KM;
      }).length;

      return {
        name: trek.name,
        slug: trek.slug,
        durationDays: trek.durationDays,
        level: trek.level,
        region: trek.region,
        description: trek.description,
        routeGeojson: trek.routeGeojson,
        isFeatured: trek.isFeatured,
        elevationMinM: trek.elevationMinM,
        elevationMaxM: trek.elevationMaxM,
        nearbyStaysCount,
      };
    });

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
      nearbyStaysCount: 0,
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
