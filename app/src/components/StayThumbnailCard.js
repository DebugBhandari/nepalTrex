import Link from 'next/link';
import {
  Box,
  Typography,
} from '@mui/material';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
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

export default function StayThumbnailCard({ stay }) {
  const finalPrice = discountedPrice(stay);

  return (
    <Box sx={{ color: 'inherit', display: 'block', borderRadius: 2, p: 1, mx: -1, transition: 'background-color 180ms ease, transform 180ms ease', '&:hover': { backgroundColor: 'action.hover', transform: 'translateY(-3px)' } }}>
      <Box
        sx={{
          position: 'relative',
          paddingTop: '66.67%',
          borderRadius: '12px',
          overflow: 'hidden',
          mb: 1.5,
          '& img': { transition: 'transform 0.35s ease' },
            boxShadow: '0 10px 24px rgba(2, 62, 138, 0.16)',
          '&:hover img': { transform: 'scale(1.055)' },
          '&::after': { content: '""', position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3, 4, 94, 0.04) 34%, rgba(3, 4, 94, 0.36) 100%)', pointerEvents: 'none' },
        }}
      >
        <Box
          component={Link}
          href={`/stays/${stay.slug}`}
          aria-label={`View ${stay.name}`}
          sx={{ position: 'absolute', inset: 0, display: 'block' }}
        >
          <Box
            component="img"
            src={stay.imageUrl || DEFAULT_STAY_IMAGE}
            alt={stay.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          />
        </Box>

        {stay.discountPercent > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 44,
              left: 12,
              px: 1.25,
              py: 0.5,
              borderRadius: 1,
            bgcolor: '#00B4D8',
            boxShadow: '0 4px 10px rgba(2, 62, 138, 0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              pointerEvents: 'none',
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
              top: 44,
              left: 12,
              px: 1.25,
              py: 0.5,
              borderRadius: 1,
              bgcolor: 'primary.main',
              pointerEvents: 'none',
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
            left: 12,
            px: 1.25,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'rgba(3, 4, 94, 0.78)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            pointerEvents: 'none',
          }}
        >
          {stay.stayType === 'hotel'
            ? <HotelRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
            : <HomeRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />}
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize', lineHeight: 1 }}>
            {stay.stayType}
          </Typography>
        </Box>

        <Box
          component={Link}
          href={`/reviews/stay/${stay.slug}`}
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            position: 'absolute',
            top: 12,
            right: 12,
            px: 1.25,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'rgba(3, 4, 94, 0.78)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            zIndex: 1,
          }}
        >
          {Number(stay.reviewCount || 0) > 0 ? (
            <>
              <StarRoundedIcon sx={{ fontSize: 14, color: themeColors.goldSun }} />
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                {Number(stay.avgRating).toFixed(1)} ({Number(stay.reviewCount)})
              </Typography>
            </>
          ) : (
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, lineHeight: 1 }}>
              No reviews
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.3 }}>
          <Typography
            component={Link}
            href={`/stays/${stay.slug}`}
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
              letterSpacing: '-0.018em',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            {stay.name}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.4 }}>
          <LocationOnOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary" noWrap>{stay.location}</Typography>
        </Box>

        {finalPrice && (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, mt: 0.5, flexWrap: 'wrap' }}>
            {stay.discountPercent > 0 && (
              <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                NPR {stay.pricePerNight.toLocaleString()}
              </Typography>
            )}
            <Typography variant="body2">
              <Box component="span" color="text.secondary">From </Box>
              <Box component="span" fontWeight={700}>NPR {finalPrice.toLocaleString()}</Box>
              <Box component="span" color="text.secondary"> /night (room only)</Box>
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
