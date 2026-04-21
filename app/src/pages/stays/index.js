import Head from 'next/head';
import { useMemo, useState } from 'react';
import {
  Box,
  Container,
  Divider,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SiteHeader from '../../components/SiteHeader';
import StayThumbnailCard from '../../components/StayThumbnailCard';
import ThumbnailGrid from '../../components/ThumbnailGrid';
import { gradients, themeColors } from '../../lib/theme';

const TYPE_FILTERS = [
  { label: 'All', value: null, icon: AppsRoundedIcon },
  { label: 'Hotels', value: 'hotel', icon: HotelRoundedIcon },
  { label: 'Homestays', value: 'homestay', icon: HomeRoundedIcon },
];

function HeroStrip({ emoji, headline, subline, bgFrom, bgMid, bgTo, dark = false }) {
  return (
    <Box
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        my: 5,
        background: `linear-gradient(120deg, ${bgFrom} 0%, ${bgMid} 55%, ${bgTo} 100%)`,
        py: { xs: 4.5, md: 6.5 },
        px: { xs: 3, md: 6 },
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 2, md: 3 },
      }}
    >
      <Typography sx={{ fontSize: { xs: 40, md: 56 }, lineHeight: 1, flexShrink: 0, userSelect: 'none' }}>
        {emoji}
      </Typography>
      <Box>
        <Typography
          variant="h4"
          fontWeight={900}
          sx={{
            color: dark ? '#1e293b' : '#fff',
            textShadow: dark ? 'none' : '0 2px 14px rgba(0,0,0,0.3)',
            fontSize: { xs: '1.5rem', md: '2rem' },
            mb: 0.5,
            lineHeight: 1.2,
          }}
        >
          {headline}
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: dark ? 'rgba(0,0,0,0.62)' : 'rgba(255,255,255,0.88)', fontWeight: 400 }}
        >
          {subline}
        </Typography>
      </Box>
    </Box>
  );
}

function Section({ title, subtitle, stays, viewAll }) {
  if (!stays || stays.length === 0) return null;

  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: subtitle ? 0.4 : 2 }}>
        <Typography variant="h5" fontWeight={800}>{title}</Typography>
        {viewAll && (
          <Typography component="a" href="#all" variant="body2" sx={{ color: 'primary.main', textDecoration: 'underline', fontWeight: 600, flexShrink: 0 }}>
            Show all
          </Typography>
        )}
      </Box>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}
      <ThumbnailGrid columns={{ xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' }}>
        {stays.slice(0, 8).map((stay) => <StayThumbnailCard key={stay.id} stay={stay} />)}
      </ThumbnailGrid>
    </Box>
  );
}

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

  const isFiltering = searchQuery.trim() !== '' || activeType !== null;

  const featured = useMemo(() => filteredStays.filter((s) => s.isFeatured), [filteredStays]);
  const deals = useMemo(() => filteredStays.filter((s) => s.discountPercent > 0), [filteredStays]);
  const kathmandu = useMemo(() => filteredStays.filter((s) => {
    const loc = s.location.toLowerCase();
    return loc.includes('kathmandu') || loc.includes('thamel') || loc.includes('bhaktapur') || loc.includes('patan') || loc.includes('lalitpur') || loc.includes('bagmati');
  }), [filteredStays]);
  const mountain = useMemo(() => filteredStays.filter((s) => {
    const loc = s.location.toLowerCase();
    return loc.includes('solukhumbu') || loc.includes('annapurna') || loc.includes('langtang') || loc.includes('manang') || loc.includes('namche') || loc.includes('ghandruk') || loc.includes('nagarkot') || loc.includes('syangboche') || loc.includes('kaski') || loc.includes('khumbu');
  }), [filteredStays]);
  const lakeside = useMemo(() => filteredStays.filter((s) => {
    const loc = s.location.toLowerCase();
    return loc.includes('pokhara') || loc.includes('lake') || loc.includes('lakeside') || loc.includes('phewa');
  }), [filteredStays]);

  const maxDiscount = deals.length > 0 ? Math.max(...deals.map((s) => s.discountPercent)) : 0;

  return (
    <>
      <Head>
        <title>Stays | NepalTrex</title>
        <meta name="description" content="Browse hotels and homestays across Nepal — featured stays, best deals, Kathmandu city stays, mountain escapes, and lakeside retreats." />
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
          {TYPE_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeType === filter.value;
            return (
              <Box
                key={String(filter.value)}
                onClick={() => setActiveType(filter.value)}
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

      {!isFiltering && (
        <Box
          sx={() => ({
            background: gradients.landing,
            py: { xs: 5, md: 8 },
            textAlign: 'center',
          })}
        >
          <Container maxWidth="md">
            <Typography variant="h3" fontWeight={900} sx={{ mb: 1, color: themeColors.snow, fontSize: { xs: '2rem', md: '2.8rem' } }}>
              Where to in Nepal?
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(248, 244, 235, 0.82)' }}>
              {stays.length} unique stays — teahouses, heritage inns, jungle camps and city boutiques
            </Typography>
          </Container>
        </Box>
      )}

      {!isFiltering && deals.length > 0 && (
        <Box sx={{ bgcolor: themeColors.midTeal, py: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <LocalOfferRoundedIcon sx={{ fontSize: 16, color: themeColors.goldSun }} />
          <Typography variant="body2" sx={{ color: themeColors.snow, fontWeight: 600 }}>
            Limited-time deals — save up to {maxDiscount}% on selected stays
          </Typography>
        </Box>
      )}

      <Box
        sx={(theme) => ({
          minHeight: '60vh',
          py: { xs: 3, md: 5 },
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 18% 12%, rgba(30,111,92,0.14) 0%, transparent 38%), linear-gradient(160deg, #0f2b2d 0%, #173b3f 100%)'
            : theme.palette.background.default,
        })}
      >
        <Container maxWidth="xl">
          {isFiltering ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                {filteredStays.length === 0 ? 'No stays match your filters.' : `${filteredStays.length} stay${filteredStays.length === 1 ? '' : 's'}`}
              </Typography>
              <ThumbnailGrid columns={{ xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' }}>
                {filteredStays.map((stay) => <StayThumbnailCard key={stay.id} stay={stay} />)}
              </ThumbnailGrid>
            </>
          ) : (
            <>
              <Section
                title="Featured Stays"
                subtitle="Hand-picked for outstanding views, unique character, and guest love"
                stays={featured}
                viewAll={featured.length > 4}
              />

              {featured.length > 0 && deals.length > 0 && <Divider sx={{ my: 4 }} />}

              <Section
                title="Best Deals"
                subtitle="Limited-time discounts — book before they are gone"
                stays={deals}
                viewAll={deals.length > 4}
              />

              <Box sx={{ mb: 5 }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.4 }}>Explore by Destination</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Find stays in Nepal's most iconic regions
                </Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', md: 'repeat(4,1fr)' } }}>
                  {[
                    { label: 'Kathmandu Valley', emoji: '🏛️', count: kathmandu.length, search: 'Kathmandu' },
                    { label: 'Mountain Escapes', emoji: '⛰️', count: mountain.length, search: 'Solukhumbu' },
                    { label: 'Lakeside Pokhara', emoji: '🌊', count: lakeside.length, search: 'Pokhara' },
                    { label: 'All Stays', emoji: '🗺️', count: stays.length, search: '' },
                  ].map((dest) => (
                    <Box
                      key={dest.label}
                      onClick={() => {
                        setSearchQuery(dest.search);
                        setActiveType(null);
                      }}
                      sx={(theme) => ({
                        p: 2,
                        borderRadius: 3,
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.background.paper,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 28px rgba(15, 43, 45, 0.14)' },
                      })}
                    >
                      <Typography sx={{ fontSize: 32, lineHeight: 1, mb: 0.8 }}>{dest.emoji}</Typography>
                      <Typography variant="subtitle2" fontWeight={700}>{dest.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{dest.count} stays</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <HeroStrip
                emoji="🏙️"
                headline="Ancient Cities, Modern Spirit"
                subline="From Thamel's buzzing lanes to Bhaktapur's ancient squares — find your perfect city base"
                bgFrom={themeColors.midTeal}
                bgMid={themeColors.moss}
                bgTo={themeColors.goldSun}
                dark
              />

              <Section
                title="Stays in Kathmandu Valley"
                subtitle="Historic cities, Newari culture, and temple-side boutique hotels"
                stays={kathmandu}
                viewAll={kathmandu.length > 4}
              />

              {kathmandu.length > 0 && mountain.length > 0 && (
                <HeroStrip
                  emoji="⛰️"
                  headline="The Roof of the World"
                  subline="Sleep above the clouds on Nepal's legendary trekking routes"
                  bgFrom={themeColors.deepTeal}
                  bgMid={themeColors.moss}
                  bgTo={themeColors.midTeal}
                />
              )}

              <Section
                title="Mountain Escapes"
                subtitle="Teahouses, lodges, and high-altitude retreats along Nepal's great trekking routes"
                stays={mountain}
                viewAll={mountain.length > 4}
              />

              {mountain.length > 0 && lakeside.length > 0 && (
                <HeroStrip
                  emoji="🌊"
                  headline="Lakeside Paradise"
                  subline="Phewa Lake reflections, Machhapuchhre silhouettes, and pure calm"
                  bgFrom={themeColors.moss}
                  bgMid={themeColors.midTeal}
                  bgTo={themeColors.deepTeal}
                />
              )}

              <Section
                title="Lakeside Pokhara"
                subtitle="Phewa Lake sunsets, Machhapuchhre views, and a relaxed lakeside vibe"
                stays={lakeside}
                viewAll={lakeside.length > 4}
              />

              <Box id="all" sx={{ pt: 2 }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.4 }}>All Stays</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {stays.length} stay{stays.length === 1 ? '' : 's'} across Nepal
                </Typography>
                <ThumbnailGrid columns={{ xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' }}>
                  {filteredStays.map((stay) => <StayThumbnailCard key={stay.id} stay={stay} />)}
                </ThumbnailGrid>
              </Box>
            </>
          )}
        </Container>
      </Box>
    </>
  );
}

export async function getServerSideProps(context) {
  const proto = (context.req.headers['x-forwarded-proto'] || 'http').toString().split(',')[0].trim();
  const host = (context.req.headers['x-forwarded-host'] || context.req.headers.host || '').toString();
  const baseUrl = `${proto}://${host}`;

  try {
    const response = await fetch(`${baseUrl}/api/stays?view=listing`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stays (${response.status})`);
    }
    const data = await response.json();
    return { props: { stays: Array.isArray(data.stays) ? data.stays : [] } };
  } catch (error) {
    console.error('Stays page data fetch failed:', error);
    return { props: { stays: [] } };
  }
}
