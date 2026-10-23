import Link from 'next/link';
import {
  Box,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { getDifficultyLabel, getTrekImage } from '../lib/treks';
import { themeColors } from '../lib/theme';

export default function TrekThumbnailCard({ trek }) {
  return (
    <Box component={Link} href={`/treks/${trek.slug}`} sx={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: 2, p: 1, mx: -1, transition: 'background-color 180ms ease, transform 180ms ease', '&:hover': { backgroundColor: 'action.hover', transform: 'translateY(-3px)' } }}>
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
              width: 30,
              height: 30,
              borderRadius: 1,
              bgcolor: '#00B4D8',
              boxShadow: '0 4px 10px rgba(2, 62, 138, 0.18)',
              display: 'grid',
              placeItems: 'center',
            }}
            title="Featured trek"
          >
            <WorkspacePremiumRoundedIcon sx={{ fontSize: 18, color: themeColors.ink }} />
          </Box>
        )}

        <Box
          sx={{
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
          }}
        >
          {Number(trek.reviewCount || 0) > 0 ? (
            <>
              <StarRoundedIcon sx={{ fontSize: 14, color: themeColors.goldSun }} />
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                {Number(trek.avgRating).toFixed(1)} ({Number(trek.reviewCount)})
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
          <Chip label={`${trek.durationDays} days`} size="small" variant="outlined" />
          <Tooltip title={getDifficultyLabel(trek.level)}>
            <Chip label={trek.level} size="small" color="secondary" />
          </Tooltip>
          <Chip label={trek.region || 'Other'} size="small" variant="outlined" />
          <Chip label={`${trek.nearbyStaysCount || 0} nearby stays`} size="small" variant="outlined" />
        </Stack>

      </Box>
    </Box>
  );
}
