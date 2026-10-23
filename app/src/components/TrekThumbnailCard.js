import Link from 'next/link';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import TerrainRoundedIcon from '@mui/icons-material/TerrainRounded';
import AppButton from './AppButton';
import { getTrekImage } from '../lib/treks';
import { themeColors } from '../lib/theme';

export default function TrekThumbnailCard({ trek, isSaved, wishlistCount, onToggleWishlist }) {
  return (
    <Box component={Link} href={`/treks/${trek.slug}`} sx={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: 5, p: 1, mx: -1, transition: 'background-color 180ms ease, transform 180ms ease', '&:hover': { backgroundColor: 'action.hover', transform: 'translateY(-3px)' } }}>
      <Box
        sx={{
          position: 'relative',
          paddingTop: '66.67%',
          borderRadius: '18px',
          overflow: 'hidden',
          mb: 1.5,
          '& img': { transition: 'transform 0.35s ease' },
          boxShadow: '0 10px 24px rgba(18, 44, 33, 0.14)',
          '&:hover img': { transform: 'scale(1.055)' },
          '&::after': { content: '""', position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7, 21, 16, 0.04) 34%, rgba(7, 21, 16, 0.28) 100%)', pointerEvents: 'none' },
        }}
      >
        <Box
          component="img"
          src={getTrekImage(trek.name)}
          alt={`${trek.name} route preview`}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        {trek.isFeatured && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
            bgcolor: '#e8bd5b',
            boxShadow: '0 4px 10px rgba(31, 41, 34, 0.15)',
            }}
          >
            <Typography variant="caption" sx={{ color: themeColors.ink, fontWeight: 700, lineHeight: 1 }}>
              Featured
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: 'rgba(16, 35, 27, 0.78)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <TerrainRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, lineHeight: 1 }}>
            {trek.durationDays} days
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 0.5 }}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            mb: 0.8,
            letterSpacing: '-0.018em',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {trek.name}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 1.2, flexWrap: 'wrap' }}>
          <Chip label={trek.level} size="small" color="secondary" />
          <Chip label={trek.region || 'Other'} size="small" variant="outlined" />
          <Chip label={`${trek.nearbyStaysCount || 0} nearby stays`} size="small" variant="outlined" />
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            ❤️ {Number(wishlistCount || 0)} saved
          </Typography>
          <AppButton
            variant={isSaved ? 'contained' : 'outlined'}
            size="small"
            startIcon={isSaved ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleWishlist(trek.slug);
            }}
          >
            {isSaved ? 'Saved' : 'Wishlist'}
          </AppButton>
        </Box>
      </Box>
    </Box>
  );
}
