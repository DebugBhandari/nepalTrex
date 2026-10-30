import Link from 'next/link';
import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import AppButton from './AppButton';
import RatingStars from './RatingStars';

function value(guide, camelCase, snakeCase, fallback = '') {
  return guide[camelCase] ?? guide[snakeCase] ?? fallback;
}

export default function GuideCard({ guide, packageDetails }) {
  const slug = value(guide, 'slug', 'guide_slug');
  const name = value(guide, 'name', 'guide_name');
  const imageUrl = value(guide, 'profileImageUrl', 'profile_image_url');
  const homeRegion = value(guide, 'homeRegion', 'home_region');
  const yearsExperience = value(guide, 'yearsExperience', 'years_experience', 0);
  const headline = value(guide, 'headline', 'headline');
  const bio = value(guide, 'bio', 'bio');
  const languagesValue = value(guide, 'languages', 'languages', []);
  const languages = Array.isArray(languagesValue) ? languagesValue : [];
  const rating = value(guide, 'avgRating', 'avg_rating', 0);
  const reviewCount = value(guide, 'reviewCount', 'review_count', 0);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={imageUrl || undefined} sx={{ width: 54, height: 54 }}>{name?.slice(0, 1)}</Avatar>
          <Box>
            <Typography variant="h6">{name}</Typography>
            <Typography variant="body2" color="text.secondary">{homeRegion}</Typography>
          </Box>
        </Stack>
        {headline && <Typography fontWeight={700}>{headline}</Typography>}
        {bio && <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bio}</Typography>}
        <Box component={Link} href={`/reviews/guide/${slug}`} sx={{ alignSelf: 'flex-start', color: 'inherit', textDecoration: 'none', borderRadius: 1, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }} aria-label={`View reviews for ${name}`}>
          <RatingStars rating={rating} count={reviewCount} />
        </Box>
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {(languages || []).slice(0, 3).map((language) => <Chip key={language} label={language} size="small" />)}
          <Chip label={`${yearsExperience} yrs experience`} size="small" />
        </Stack>
        {packageDetails && (
          <Box>
            {packageDetails.title ? <><Typography variant="h6" sx={{ mt: 0.25 }}>{packageDetails.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{packageDetails.durationDays} days · NPR {Number(packageDetails.priceAmount || 0).toLocaleString()} {String(packageDetails.priceUnit || 'per_person').replace('_', ' ')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{packageDetails.summary}</Typography></> : <Typography variant="body2" color="text.secondary">Experienced in this terrain. Contact the guide for a tailored itinerary.</Typography>}
          </Box>
        )}
        <Box sx={{ mt: 'auto', pt: 1 }}><AppButton component={Link} href={`/guides/${slug}`} fullWidth>View guide</AppButton></Box>
      </CardContent>
    </Card>
  );
}