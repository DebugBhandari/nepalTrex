import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Container,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import TerrainRoundedIcon from '@mui/icons-material/TerrainRounded';
import { FEATURED_TREKS } from '@org/types';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';
import StayThumbnailCard from '../components/StayThumbnailCard';
import TrekThumbnailCard from '../components/TrekThumbnailCard';
import ThumbnailGrid from '../components/ThumbnailGrid';
import { slugifyTrekName } from '../lib/treks';
import { gradients, themeColors } from '../lib/theme';

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

const TREK_TYPE_FILTERS = [
  { label: 'All Treks', value: 'all', icon: AppsRoundedIcon },
  { label: 'Featured', value: 'featured', icon: StarRoundedIcon },
  { label: 'High Altitude', value: 'high-altitude', icon: TerrainRoundedIcon },
];

function normalizeDifficulty(level) {
  return (level || '').trim().toLowerCase();
}

function maxAltitude(trek) {
  return Math.max(trek.elevationMaxM || 0, trek.elevationMinM || 0);
}

export default function HomePage({ allTreks, featuredStays = [], dataSource, dataError }) {
  const { data: session, status } = useSession();
  const [treks, setTreks] = useState(allTreks || []);
  const [landingStays, setLandingStays] = useState(featuredStays || []);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoginRequired, setWishlistLoginRequired] = useState(false);
  const [wishlistCountsBySlug, setWishlistCountsBySlug] = useState(() =>
    (allTreks || []).reduce((acc, trek) => {
      acc[trek.slug] = Number(trek.wishlistCount || 0);
      return acc;
    }, {})
  );
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [selectedAltitude, setSelectedAltitude] = useState('all');
  const [showTrekFilters, setShowTrekFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTrekFilter, setActiveTrekFilter] = useState('all');

  useEffect(() => {
    let active = true;

    const fetchLandingData = async () => {
      try {
        const [treksRes, staysRes] = await Promise.all([
          fetch('/api/treks'),
          fetch('/api/stays?view=listing&featuredOnly=true&limit=6'),
        ]);

        if (!treksRes.ok || !staysRes.ok || !active) {
          return;
        }

        const [treksData, staysData] = await Promise.all([treksRes.json(), staysRes.json()]);
        const nextTreks = Array.isArray(treksData.treks) ? treksData.treks : [];
        const nextStays = Array.isArray(staysData.stays) ? staysData.stays : [];

        setTreks(nextTreks);
        setLandingStays(nextStays);
        setWishlistCountsBySlug(
          nextTreks.reduce((acc, trek) => {
            acc[trek.slug] = Number(trek.wishlistCount || 0);
            return acc;
          }, {})
        );
      } catch {
        // Keep SSR data if client fetch fails
      }
    };

    fetchLandingData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      fetch('/api/users/wishlist')
        .then((r) => r.json())
        .then((data) => setWishlist(data.slugs || []))
        .catch(() => setWishlist([]));
    } else {
      setWishlist([]);
    }
  }, [status]);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const toggleWishlist = (slug) => {
    if (status !== 'authenticated') {
      setWishlistLoginRequired(true);
      return;
    }

    const isInList = wishlistSet.has(slug);
    setWishlist((prev) => (isInList ? prev.filter((s) => s !== slug) : [...prev, slug]));
    setWishlistCountsBySlug((prev) => ({
      ...prev,
      [slug]: Math.max(0, Number(prev[slug] || 0) + (isInList ? -1 : 1)),
    }));

    fetch('/api/users/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, action: isInList ? 'remove' : 'add' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.slugs) setWishlist(data.slugs);
        if (typeof data.wishlistCount === 'number' && typeof data.slug === 'string') {
          setWishlistCountsBySlug((prev) => ({
            ...prev,
            [data.slug]: data.wishlistCount,
          }));
        }
      })
      .catch(() => {});
  };

  const visibleTreks = treks;

  const regionOptions = useMemo(() => {
    const regions = new Set(treks.map((trek) => trek.region || 'Other'));
    return ['all', ...Array.from(regions).sort((a, b) => a.localeCompare(b))];
  }, [treks]);

  const difficultyOptions = useMemo(() => {
    const values = new Set(
      treks
        .map((trek) => normalizeDifficulty(trek.level))
        .filter(Boolean)
    );

    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [treks]);

  const filteredTreks = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    return visibleTreks.filter((trek) => {
      const region = trek.region || 'Other';
      const difficulty = normalizeDifficulty(trek.level);
      const duration = Number(trek.durationDays) || 0;
      const altitude = maxAltitude(trek);
      const searchable = `${trek.name || ''} ${trek.region || ''} ${trek.level || ''}`.toLowerCase();

      if (needle && !searchable.includes(needle)) {
        return false;
      }

      if (activeTrekFilter === 'featured' && !trek.isFeatured) {
        return false;
      }

      if (activeTrekFilter === 'high-altitude' && altitude <= 5000) {
        return false;
      }

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
  }, [
    visibleTreks,
    selectedRegion,
    selectedDifficulty,
    selectedDuration,
    selectedAltitude,
    searchQuery,
    activeTrekFilter,
  ]);

  const isFiltering =
    searchQuery.trim() !== '' ||
    activeTrekFilter !== 'all' ||
    selectedRegion !== 'all' ||
    selectedDifficulty !== 'all' ||
    selectedDuration !== 'all' ||
    selectedAltitude !== 'all';

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

      <SiteHeader />

      <Box
        sx={(theme) => ({
          position: 'sticky',
          top: 64,
          zIndex: 1000,
          bgcolor: theme.palette.background.default,
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: { xs: 2, md: 4 },
          pt: 1.5,
          pb: 0,
        })}
      >
        <Box sx={{ maxWidth: 560, mx: 'auto', mb: 1.5 }}>
          <TextField
            fullWidth
            placeholder="Search treks by name, region, or difficulty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 999, bgcolor: 'background.paper', px: 1 },
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 0,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            justifyContent: { sm: 'center' },
          }}
        >
          {TREK_TYPE_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeTrekFilter === filter.value;
            return (
              <Box
                key={filter.value}
                onClick={() => setActiveTrekFilter(filter.value)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 3,
                  pb: 1.25,
                  pt: 0.5,
                  cursor: 'pointer',
                  position: 'relative',
                  color: isActive ? 'text.primary' : 'text.secondary',
                  flexShrink: 0,
                  transition: 'color 0.15s',
                  '&:hover': { color: 'text.primary' },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: isActive ? '100%' : 0,
                    height: 2,
                    bgcolor: 'text.primary',
                    borderRadius: 1,
                    transition: 'width 0.2s ease',
                  },
                }}
              >
                <Icon sx={{ fontSize: 24 }} />
                <Typography variant="caption" fontWeight={isActive ? 700 : 400} sx={{ lineHeight: 1, whiteSpace: 'nowrap' }}>
                  {filter.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

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
          {wishlistLoginRequired && (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              action={
                <AppButton component={Link} href="/auth/signin" variant="contained" size="small">
                  Login
                </AppButton>
              }
            >
              You need to be logged in to add treks to your wishlist.
            </Alert>
          )}

          {dataSource === 'fallback' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Showing fallback trek data because database routes could not be loaded.
              {dataError ? ` (${dataError})` : ''}
            </Alert>
          )}

          {!isFiltering && (
            <Box
              sx={{
                background: gradients.landing,
                py: { xs: 5, md: 8 },
                textAlign: 'center',
                borderRadius: 4,
                px: 2,
                mb: 5,
              }}
            >
              <Typography
                variant="h3"
                fontWeight={900}
                sx={{ mb: 1, color: themeColors.snow, fontSize: { xs: '2rem', md: '2.8rem' } }}
              >
                Plan your Himalayan trek with confidence
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(248, 244, 235, 0.82)', maxWidth: 760, mx: 'auto' }}>
                Discover routes by region, shortlist favorites, and open complete trek pages with route maps and nearby stays.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5, justifyContent: 'center' }}>
                <AppButton href="#treks" variant="contained" size="large">
                  Explore Treks
                </AppButton>
                <AppButton
                  component={Link}
                  href="/stays"
                  variant="outlined"
                  size="large"
                  sx={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.8)', '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  Browse Stays
                </AppButton>
              </Stack>
            </Box>
          )}

          {/* Featured Stays Section - Airbnb Style */}
          {landingStays && landingStays.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h5"
                  sx={(theme) => ({
                    mb: 0.5,
                    fontWeight: 800,
                    color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                  })}
                >
                  ✨ Featured Stays
                </Typography>
                <Typography color="text.secondary">Hand-picked accommodations near your favorite treks</Typography>
              </Box>

              <ThumbnailGrid
                gap={{ xs: 2, md: 3 }}
                columns={{
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                }}
              >
                {landingStays.map((stay) => (
                  <StayThumbnailCard key={stay.id} stay={stay} showMenuCount={false} />
                ))}
              </ThumbnailGrid>

              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <AppButton component={Link} href="/stays" variant="outlined" size="large">
                  Browse All Stays
                </AppButton>
              </Box>
            </Box>
          )}

          <Box id="treks" sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 0.4 }}>
              Explore Treks
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2.3 }}>
              Click any trek image to open route details, map, and nearby stay options.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2 }}>
              <AppButton variant="outlined" onClick={() => setShowTrekFilters((prev) => !prev)}>
                {showTrekFilters ? 'Hide Filters' : 'Filters'}
              </AppButton>
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                Showing {filteredTreks.length} trek{filteredTreks.length === 1 ? '' : 's'}
              </Typography>
            </Stack>

            {showTrekFilters && (
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
                      setSearchQuery('');
                      setActiveTrekFilter('all');
                      setSelectedRegion('all');
                      setSelectedDifficulty('all');
                      setSelectedDuration('all');
                      setSelectedAltitude('all');
                    }}
                  >
                    Clear Filters
                  </AppButton>
                </Stack>
              </Paper>
            )}

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

                <ThumbnailGrid
                  gap={{ xs: 3, md: 4 }}
                  columns={{
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(3, minmax(0, 1fr))',
                  }}
                >
                  {treks.map((trek) => (
                    <TrekThumbnailCard
                      key={trek.slug}
                      trek={trek}
                      isSaved={wishlistSet.has(trek.slug)}
                      wishlistCount={wishlistCountsBySlug[trek.slug] ?? trek.wishlistCount ?? 0}
                      onToggleWishlist={toggleWishlist}
                    />
                  ))}
                </ThumbnailGrid>
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
                  About NepalTrex
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.6, maxWidth: 460 }}>
                  NepalTrex helps international trekkers compare routes, understand elevation and pacing, and find suitable stays around each trekking corridor in Nepal. Trusted planning companion for comparing routes, managing your shortlist, and preparing with confidence.
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.7, fontWeight: 700 }}>
                  Contact
                </Typography>
                <Typography color="text.secondary">buddhavtrex@gmail.com</Typography>
                <Typography color="text.secondary">Chitwan, Nepal</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>bhandarideepakdev@gmail.com</Typography>
                <Typography color="text.secondary">Helsinki, Finland</Typography>
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

export async function getServerSideProps(context) {
  try {
    const proto = (context.req.headers['x-forwarded-proto'] || 'http').toString().split(',')[0].trim();
    const host = (context.req.headers['x-forwarded-host'] || context.req.headers.host || '').toString();
    const baseUrl = `${proto}://${host}`;

    const [treksResponse, staysResponse] = await Promise.all([
      fetch(`${baseUrl}/api/treks`),
      fetch(`${baseUrl}/api/stays?view=listing&featuredOnly=true&limit=6`),
    ]);

    if (!treksResponse.ok || !staysResponse.ok) {
      throw new Error(`Failed to fetch API data (treks ${treksResponse.status}, stays ${staysResponse.status})`);
    }

    const treksData = await treksResponse.json();
    const staysData = await staysResponse.json();

    const allTreks = Array.isArray(treksData.treks) ? treksData.treks : [];
    const featuredStays = Array.isArray(staysData.stays) ? staysData.stays : [];

    return {
      props: {
        allTreks,
        featuredStays,
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
        featuredStays: [],
        dataSource: 'fallback',
        dataError: error?.message || 'Unknown database error',
      },
    };
  }
}
