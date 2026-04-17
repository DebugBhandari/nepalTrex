import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Box,
  Container,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { query } from '../../lib/db';
import SiteHeader from '../../components/SiteHeader';

const DEFAULT_STAY_IMAGE = 'https://placehold.co/800x600?text=NepalTrex+Stay';

const TYPE_FILTERS = [
  { label: 'All', value: null, icon: AppsRoundedIcon },
  { label: 'Hotels', value: 'hotel', icon: HotelRoundedIcon },
  { label: 'Homestays', value: 'homestay', icon: HomeRoundedIcon },
];

export default function StaysPage({ stays }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState(null);

  const filteredStays = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return stays.filter((stay) => {
      if (activeType !== null && stay.stayType !== activeType) return false;
      if (!needle) return true;
      const name = String(stay.name || '').toLowerCase();
      const location = String(stay.location || '').toLowerCase();
      return name.includes(needle) || location.includes(needle);
    });
  }, [stays, searchQuery, activeType]);

  return (
    <>
      <Head>
        <title>Stays | NepalTrex</title>
        <meta name="description" content="Browse all NepalTrex stays — hotels and homestays across Nepal." />
      </Head>

      <SiteHeader />

      {/* Sticky sub-header: search + category filters */}
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
        {/* Search bar */}
        <Box sx={{ maxWidth: 560, mx: 'auto', mb: 1.5 }}>
          <TextField
            fullWidth
            placeholder="Search by name or location…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 999,
                bgcolor: 'background.paper',
                px: 1,
              },
            }}
          />
        </Box>

        {/* Category chips — horizontally scrollable like Airbnb */}
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
          {TYPE_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeType === filter.value;
            return (
              <Box
                key={String(filter.value)}
                onClick={() => setActiveType(filter.value)}
                sx={(theme) => ({
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
                })}
              >
                <Icon sx={{ fontSize: 24 }} />
                <Typography
                  variant="caption"
                  fontWeight={isActive ? 700 : 400}
                  sx={{ lineHeight: 1, whiteSpace: 'nowrap' }}
                >
                  {filter.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Main content */}
      <Box
        sx={(theme) => ({
          minHeight: '100vh',
          py: 4,
          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 18% 12%, rgba(64,138,113,0.18) 0%, transparent 38%), linear-gradient(160deg, #1f2937 0%, #1e293b 100%)'
              : theme.palette.background.default,
        })}
      >
        <Container maxWidth="xl">
          {/* Result count */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            {filteredStays.length === 0
              ? 'No stays match your filters.'
              : `${filteredStays.length} stay${filteredStays.length === 1 ? '' : 's'}`}
          </Typography>

          {/* Airbnb-style card grid */}
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 3, md: 4 },
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                xl: 'repeat(4, 1fr)',
              },
            }}
          >
            {filteredStays.map((stay) => (
              <Box
                key={stay.id}
                component={Link}
                href={`/stays/${stay.slug}`}
                sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                {/* Image */}
                <Box
                  sx={{
                    position: 'relative',
                    paddingTop: '66.67%', // 3:2 aspect ratio
                    borderRadius: '16px',
                    overflow: 'hidden',
                    mb: 1.5,
                    '& img': {
                      transition: 'transform 0.35s ease',
                    },
                    '&:hover img': {
                      transform: 'scale(1.04)',
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={stay.imageUrl || DEFAULT_STAY_IMAGE}
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
                  {/* Stay type badge */}
                  <Box
                    sx={(theme) => ({
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    })}
                  >
                    {stay.stayType === 'hotel' ? (
                      <HotelRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
                    ) : (
                      <HomeRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize', lineHeight: 1 }}
                    >
                      {stay.stayType}
                    </Typography>
                  </Box>
                </Box>

                {/* Card details */}
                <Box sx={{ px: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.3 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        flex: 1,
                        mr: 1,
                      }}
                    >
                      {stay.name}
                    </Typography>
                    {stay.pricePerNight && (
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <Box component="span" fontWeight={700}>
                          NPR {Number(stay.pricePerNight).toLocaleString()}
                        </Box>{' '}
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          /night
                        </Box>
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.4 }}>
                    <LocationOnOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {stay.location}
                    </Typography>
                  </Box>

                  {stay.menuCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <MenuBookOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary">
                        {stay.menuCount} menu item{stay.menuCount === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
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
        s.price_per_night,
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
    pricePerNight: row.price_per_night ? Number(row.price_per_night) : null,
    contactPhone: row.contact_phone || '',
    menuCount: Number(row.menu_count || 0),
  }));

  return {
    props: {
      stays,
    },
  };
}
