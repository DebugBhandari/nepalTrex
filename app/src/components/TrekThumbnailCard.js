import Link from 'next/link';
import {
  Box,
  Chip,
  Tooltip,
  Typography,
} from '@mui/material';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { getDifficultyLabel, getTrekImage } from '../lib/treks';
import { themeColors } from '../lib/theme';

export default function TrekThumbnailCard({ trek }) {
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
          boxShadow: '0 10px 24px rgba(86, 71, 61, 0.16)',
          '&:hover img': { transform: 'scale(1.055)' },
          '&::after': { content: '""', position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(108, 88, 76, 0.04) 34%, rgba(108, 88, 76, 0.36) 100%)', pointerEvents: 'none' },
        }}
      >
        <Box
          component={Link}
          href={`/treks/${trek.slug}`}
          aria-label={`View ${trek.name}`}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'block',
          }}
        >
          <Box
            component="img"
            src={getTrekImage(trek.name)}
            alt={`${trek.name} route preview`}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </Box>

        {trek.isFeatured && (
          <Tooltip title="Featured trek" arrow>
            <Box
              component="span"
              aria-label="Featured trek"
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                width: 34,
                height: 34,
                borderRadius: 1,
                bgcolor: themeColors.accent,
                color: themeColors.ink,
                boxShadow: '0 7px 16px rgba(0, 21, 36, 0.32)',
                border: '1px solid rgba(255, 251, 246, 0.5)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'help',
                zIndex: 1,
              }}
            >
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 18, color: 'inherit' }} />
            </Box>
          </Tooltip>
        )}

        <Box
          component={Link}
          href={`/reviews/trek/${trek.slug}`}
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            position: 'absolute',
            top: 12,
            right: 12,
            px: 1.25,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'rgba(108, 88, 76, 0.78)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            zIndex: 1,
          }}
        >
          {Number(trek.reviewCount || 0) > 0 ? (
            <>
              <StarRoundedIcon sx={{ fontSize: 14, color: themeColors.goldSun }} />
              <Typography variant="caption" sx={{ color: '#fffbf6', fontWeight: 700, lineHeight: 1 }}>
                {Number(trek.avgRating).toFixed(1)} ({Number(trek.reviewCount)})
              </Typography>
            </>
          ) : (
            <Typography variant="caption" sx={{ color: '#fffbf6', fontWeight: 600, lineHeight: 1 }}>
              No reviews
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 0.5 }}>
        <Typography
          component={Link}
          href={`/treks/${trek.slug}`}
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
            color: 'inherit',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {trek.name}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 0.8 }}>
          <Chip label={`${trek.durationDays} days`} size="small" variant="outlined" />
          <Tooltip title={getDifficultyLabel(trek.level)}>
            <Chip label={trek.level} size="small" color="secondary" />
          </Tooltip>
          <Chip label={trek.region || 'Other'} size="small" variant="outlined" />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.2 }}>
          <Chip label={`${trek.nearbyStaysCount || 0} stays available`} size="small" variant="outlined" />
          <Chip label={`${trek.availableGuideCount || 0} guides available`} size="small" color="primary" variant="outlined" />
        </Box>

      </Box>
    </Box>
  );
}
