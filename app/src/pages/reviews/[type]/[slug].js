import Head from 'next/head';
import Link from 'next/link';
import { Avatar, Box, Container, Paper, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AppButton from '../../../components/AppButton';
import SiteHeader from '../../../components/SiteHeader';
import { query } from '../../../lib/db';

function serializeReview(row) {
  return {
    id: row.id,
    reviewerName: row.reviewer_name,
    reviewerInitials: row.reviewer_initials,
    rating: Number(row.rating),
    comment: row.comment,
  };
}

function Stars({ rating }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.3, mt: 0.2 }} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarRoundedIcon key={star} sx={{ fontSize: 15, color: star <= rating ? '#ADC178' : 'text.disabled' }} />
      ))}
    </Box>
  );
}

export default function ReviewsPage({ item, reviews, targetType }) {
  const itemPath = targetType === 'trek' ? `/treks/${item.slug}` : targetType === 'stay' ? `/stays/${item.slug}` : `/guides/${item.slug}`;
  const itemTypeLabel = targetType;

  return (
    <>
      <Head>
        <title>Reviews for {item.name} | NepalTrex</title>
        <meta name="description" content={`All guest reviews for ${item.name}.`} />
      </Head>
      <SiteHeader />
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <AppButton component={Link} href={itemPath} variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 3 }}>
          Back to {itemTypeLabel}
        </AppButton>
        <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}>
          <Typography variant="overline" color="text.secondary">Guest feedback</Typography>
          <Typography variant="h3" sx={{ mt: 0.4, mb: 1, fontSize: { xs: '2rem', md: '2.6rem' } }}>
            Reviews for {item.name}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {reviews.length} review{reviews.length === 1 ? '' : 's'} from the NepalTrex community
          </Typography>

          {reviews.length === 0 ? (
            <Typography color="text.secondary">No reviews have been published yet.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              {reviews.map((review) => (
                <Box key={review.id} sx={(theme) => ({ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` })}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={(theme) => ({ width: 44, height: 44, fontWeight: 700, bgcolor: theme.palette.primary.main, fontSize: '1rem' })}>
                      {review.reviewerInitials}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{review.reviewerName}</Typography>
                      <Stars rating={review.rating} />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>&ldquo;{review.comment}&rdquo;</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const targetType = context.params?.type;
  const slug = context.params?.slug;
  if (!['trek', 'stay', 'guide'].includes(targetType) || !slug) return { notFound: true };

  const itemResult = targetType === 'trek'
    ? await query(
      `SELECT id, name FROM treks WHERE trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) = $1 LIMIT 1`,
      [slug.toLowerCase()]
    )
    : targetType === 'stay'
      ? await query('SELECT id, name, slug FROM stays WHERE slug = $1 LIMIT 1', [slug])
      : await query(`SELECT gp.id, gp.slug, COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS name FROM guide_profiles gp JOIN users u ON u.id = gp.user_id WHERE gp.slug = $1 AND gp.approval_status = 'approved' LIMIT 1`, [slug]);

  const itemRow = itemResult.rows[0];
  if (!itemRow) return { notFound: true };

  const reviewsResult = await query(
    `
      SELECT r.id, r.rating, r.comment,
        COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NepalTrex guest') AS reviewer_name,
        UPPER(LEFT(COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NT'), 1)) AS reviewer_initials
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_user_id
      WHERE r.target_type = $1 AND r.target_id = $2
      ORDER BY r.created_at DESC
    `,
    [targetType, itemRow.id]
  );

  return {
    props: {
      targetType,
      item: {
        name: itemRow.name,
        slug: targetType === 'trek' ? slug : itemRow.slug,
      },
      reviews: reviewsResult.rows.map(serializeReview),
    },
  };
}