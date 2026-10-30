import { Box, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';

export default function RatingStars({ rating, count, size = 17 }) {
  const value = Number(rating || 0);
  return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45 }} aria-label={`${value.toFixed(1)} out of 5 stars`}><StarRoundedIcon sx={{ fontSize: size, color: '#F59E0B' }} /><Typography variant="body2" fontWeight={800}>{value ? value.toFixed(1) : 'New'}</Typography>{count !== undefined && <Typography variant="body2" color="text.secondary">({count})</Typography>}</Box>;
}