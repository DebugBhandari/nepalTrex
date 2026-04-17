import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { FEATURED_TREKS } from '@org/types';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';
import { getTrekImage, minDistanceToRouteKm, parseRouteWaypoints, slugifyTrekName } from '../lib/treks';

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

export default function HomePage({ allTreks, featuredStays = [], dataSource, dataError }) {
  const { data: session, status } = useSession();
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoginRequired, setWishlistLoginRequired] = useState(false);
  const [wishlistCountsBySlug, setWishlistCountsBySlug] = useState(() =>
    allTreks.reduce((acc, trek) => {
      acc[trek.slug] = Number(trek.wishlistCount || 0);
      return acc;
    }, {})
  );
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [selectedAltitude, setSelectedAltitude] = useState('all');
  const [showTrekFilters, setShowTrekFilters] = useState(false);

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

      <SiteHeader />

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
              <AppButton component={Link} href="/stays" variant="outlined" size="large">
                Browse Stays
              </AppButton>
            </Stack>
          </Paper>

          {/* Featured Stays Section - Airbnb Style */}
          {featuredStays && featuredStays.length > 0 && (
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

              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 2, md: 3 },
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(3, minmax(0, 1fr))',
                  },
                }}
              >
                {featuredStays.map((stay) => {
                  const finalPrice = stay.discountPercent > 0
                    ? Math.round(stay.pricePerNight * (1 - stay.discountPercent / 100))
                    : stay.pricePerNight;

                  return (
                    <Box
                      key={stay.id}
                      component={Link}
                      href={`/stays/${stay.slug}`}
                      sx={{
                        textDecoration: 'none',
                        color: 'inherit',
                        display: 'block',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <Box
                        sx={(theme) => ({
                          position: 'relative',
                          paddingTop: '66.67%',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          mb: 1.5,
                          backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5',
                          '& img': { transition: 'transform 0.35s ease' },
                          '&:hover img': { transform: 'scale(1.04)' },
                        })}
                      >
                        <Box
                          component="img"
                          src={stay.imageUrl || 'https://placehold.co/800x600?text=NepalTrex+Stay'}
                          alt={stay.name}
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                          }}
                        />

                        {/* Stay Type Badge (Top Right) */}
                        <Box
                          sx={(theme) => ({
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 999,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          })}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#fff',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              lineHeight: 1,
                            }}
                          >
                            {stay.stayType}
                          </Typography>
                        </Box>

                        {/* Discount Badge (Top Left) */}
                        {stay.discountPercent > 0 && (
                          <Box
                            sx={(theme) => ({
                              position: 'absolute',
                              top: 12,
                              left: 12,
                              px: 1.25,
                              py: 0.5,
                              borderRadius: 999,
                              bgcolor: theme.palette.error.main,
                              display: 'flex',
                              alignItems: 'center',
                              fontWeight: 700,
                            })}
                          >
                            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                              -{stay.discountPercent}%
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Stay Details */}
                      <Box>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          sx={{
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            mb: 0.5,
                          }}
                        >
                          {stay.name}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.8 }}>
                          {stay.location}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {stay.avgRating > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <Typography variant="body2" fontWeight={700}>{stay.avgRating}</Typography>
                              <Typography variant="caption" color="text.secondary">({stay.reviewCount})</Typography>
                            </Box>
                          )}

                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, ml: 'auto' }}>
                            {stay.discountPercent > 0 && (
                              <Typography
                                variant="caption"
                                sx={(theme) => ({
                                  textDecoration: 'line-through',
                                  color: theme.palette.text.disabled,
                                })}
                              >
                                NPR {stay.pricePerNight.toLocaleString()}
                              </Typography>
                            )}
                            <Typography variant="body2" fontWeight={700}>
                              NPR {finalPrice.toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <AppButton component={Link} href="/stays" variant="outlined" size="large">
                  Browse All Stays
                </AppButton>
              </Box>
            </Box>
          )}

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
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: 'text.secondary' }}
                            >
                              ❤️ {Number(wishlistCountsBySlug[trek.slug] ?? trek.wishlistCount ?? 0)}
                            </Typography>
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

export async function getServerSideProps() {
  try {
    const trekRows = await query(
      `
        SELECT name, duration_days, level, region, description, route_geojson, is_featured, elevation_min_m, elevation_max_m
        FROM treks
        ORDER BY name ASC
      `
    );

    const wishlistCountRows = await query(
      `
        SELECT trek_slug, COUNT(*)::int AS wishlist_count
        FROM user_trek_wishlists
        GROUP BY trek_slug
      `
    );

    const wishlistCountBySlug = wishlistCountRows.rows.reduce((acc, row) => {
      acc[row.trek_slug] = Number(row.wishlist_count || 0);
      return acc;
    }, {});

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

    const featuredStaysRows = await query(
      `
        SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url, s.price_per_night, s.is_featured, s.discount_percent,
               COALESCE(ROUND(AVG(sr.rating)::numeric, 1), 0) as avg_rating,
               COUNT(sr.id) as review_count
        FROM stays s
        LEFT JOIN stay_reviews sr ON s.id = sr.stay_id
        WHERE s.is_featured = true
        GROUP BY s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url, s.price_per_night, s.is_featured, s.discount_percent
        ORDER BY RANDOM()
        LIMIT 6
      `
    );

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
        wishlistCount: Number(wishlistCountBySlug[trek.slug] || 0),
      };
    });

    const featuredStays = featuredStaysRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      stayType: row.stay_type,
      location: row.location,
      description: row.description,
      imageUrl: row.image_url,
      pricePerNight: Number(row.price_per_night),
      isFeatured: row.is_featured,
      discountPercent: Number(row.discount_percent || 0),
      avgRating: Number(row.avg_rating || 0),
      reviewCount: Number(row.review_count || 0),
    }));

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
