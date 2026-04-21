import Link from 'next/link';
import {
  Box,
  Typography,
} from '@mui/material';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { themeColors } from '../lib/theme';

const DEFAULT_STAY_IMAGE = '/stays/lodge-exterior.jpg';

function discountedPrice(stay) {
  if (!stay.pricePerNight) return null;
  if (stay.discountPercent > 0) {
    return Math.round(stay.pricePerNight * (1 - stay.discountPercent / 100));
  }
  return stay.pricePerNight;
}

export default function StayThumbnailCard({ stay, showMenuCount = true }) {
  const finalPrice = discountedPrice(stay);

  return (
    <Box component={Link} href={`/stays/${stay.slug}`} sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <Box
        sx={{
          position: 'relative',
          paddingTop: '66.67%',
          borderRadius: '16px',
          overflow: 'hidden',
          mb: 1.5,
          '& img': { transition: 'transform 0.35s ease' },
          '&:hover img': { transform: 'scale(1.04)' },
        }}
      >
        <Box
          component="img"
          src={stay.imageUrl || DEFAULT_STAY_IMAGE}
          alt={stay.name}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />

        {stay.discountPercent > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              bgcolor: themeColors.goldSun,
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
            }}
          >
            <LocalOfferRoundedIcon sx={{ fontSize: 12, color: themeColors.ink }} />
            <Typography variant="caption" sx={{ color: themeColors.ink, fontWeight: 800, lineHeight: 1 }}>
              -{stay.discountPercent}%
            </Typography>
          </Box>
        )}

        {stay.isFeatured && stay.discountPercent === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              bgcolor: 'primary.main',
            }}
          >
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1 }}>
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
            bgcolor: 'rgba(15,43,45,0.78)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(240, 180, 41, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {stay.stayType === 'hotel'
            ? <HotelRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
            : <HomeRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />}
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize', lineHeight: 1 }}>
            {stay.stayType}
          </Typography>
        </Box>
      </Box>

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
          {stay.avgRating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
              <StarRoundedIcon sx={{ fontSize: 15, color: themeColors.goldSun }} />
              <Typography variant="body2" fontWeight={700}>{stay.avgRating}</Typography>
              <Typography variant="caption" color="text.secondary">({stay.reviewCount})</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.4 }}>
          <LocationOnOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary" noWrap>{stay.location}</Typography>
        </Box>

        {showMenuCount && stay.menuCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.4 }}>
            <MenuBookOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary">
              {stay.menuCount} menu item{stay.menuCount === 1 ? '' : 's'}
            </Typography>
          </Box>
        )}

        {finalPrice && (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, mt: 0.5 }}>
            {stay.discountPercent > 0 && (
              <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                NPR {stay.pricePerNight.toLocaleString()}
              </Typography>
            )}
            <Typography variant="body2">
              <Box component="span" fontWeight={700}>NPR {finalPrice.toLocaleString()}</Box>
              <Box component="span" color="text.secondary"> /night</Box>
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
