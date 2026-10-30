import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PlaceIcon from '@mui/icons-material/Place';
import NearMeRoundedIcon from '@mui/icons-material/NearMeRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';
import StayThumbnailCard from '../components/StayThumbnailCard';
import {
  getDifficultyLabel,
  getTrekImage,
  haversineKm,
  minDistanceToRouteKm,
  parseRouteWaypoints,
} from '../lib/treks';

const TrekRouteMap = dynamic(() => import('../components/TrekRouteMap'), {
  ssr: false,
});

const DEFAULT_STAY_IMAGE = 'https://placehold.co/1000x620?text=NepalTrex+Stay';
const DEFAULT_MENU_IMAGE = 'https://placehold.co/600x380?text=Menu+Item';
const NEARBY_THRESHOLD_KM = 35;

function bearingLabel(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const radians = (value) => (value * Math.PI) / 180;
  const degrees = (value) => (value * 180) / Math.PI;
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const y = Math.sin(longitudeDelta) * Math.cos(radians(toLatitude));
  const x =
    Math.cos(radians(fromLatitude)) * Math.sin(radians(toLatitude)) -
    Math.sin(radians(fromLatitude)) *
      Math.cos(radians(toLatitude)) *
      Math.cos(longitudeDelta);
  const heading = (degrees(Math.atan2(y, x)) + 360) % 360;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(heading / 45) % directions.length];
}

function serializeReview(row) {
  return {
    id: row.id,
    reviewerUserId: row.reviewer_user_id,
    reviewerName: row.reviewer_name,
    reviewerInitials: row.reviewer_initials,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

async function getReviews(targetType, targetId, limit = null) {
  const result = await query(
    `
      SELECT r.id, r.reviewer_user_id, r.rating, r.comment, r.created_at, r.updated_at,
        COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NepalTrex guest') AS reviewer_name,
        UPPER(LEFT(COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NT'), 1)) AS reviewer_initials
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_user_id
      WHERE r.target_type = $1 AND r.target_id = $2
      ORDER BY r.created_at DESC
      LIMIT $3
    `,
    [targetType, targetId, limit]
  );
  return result.rows.map(serializeReview);
}

async function getReviewSummary(targetType, targetId) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS review_count, ROUND(AVG(rating)::numeric, 1) AS avg_rating
      FROM reviews
      WHERE target_type = $1 AND target_id = $2
    `,
    [targetType, targetId]
  );
  const row = result.rows[0];
  return {
    reviewCount: Number(row?.review_count || 0),
    avgRating:
      row?.avg_rating === null || row?.avg_rating === undefined
        ? null
        : Number(row.avg_rating),
  };
}

function StarRow({ rating, count }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {stars.map((s) => (
        <StarRoundedIcon
          key={s}
          sx={{
            fontSize: 18,
            color:
              s <= Math.round(Number(rating)) ? '#00B4D8' : 'text.disabled',
          }}
        />
      ))}
      {count > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
          {Number(rating).toFixed(1)} ({count} review{count === 1 ? '' : 's'})
        </Typography>
      )}
    </Box>
  );
}

function averageRating(reviews) {
  if (!reviews.length) return null;
  return (
    reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
    reviews.length
  );
}

function ReviewForm({
  initialReview,
  onCancel,
  onSaved,
  targetId,
  targetType,
}) {
  const [rating, setRating] = useState(initialReview?.rating || 5);
  const [comment, setComment] = useState(initialReview?.comment || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetch(
        initialReview ? `/api/reviews/${initialReview.id}` : '/api/reviews',
        {
          method: initialReview ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            initialReview
              ? { rating, comment }
              : { targetType, targetId, rating, comment }
          ),
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || 'Unable to save your review');
      onSaved(data.review);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={submit}
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}
    >
      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
        {initialReview ? 'Edit your review' : 'Share your experience'}
      </Typography>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 1.5 }}
        aria-label={`Rating: ${rating} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <IconButton
            key={star}
            type="button"
            size="small"
            onClick={() => setRating(star)}
            aria-label={`Set rating to ${star} stars`}
          >
            <StarRoundedIcon
              sx={{ color: star <= rating ? '#00B4D8' : 'text.disabled' }}
            />
          </IconButton>
        ))}
      </Box>
      <TextField
        label="Your feedback"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        multiline
        minRows={3}
        fullWidth
        required
        inputProps={{ minLength: 3, maxLength: 1200 }}
        helperText={`${comment.length}/1200`}
      />
      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 1.75 }}>
        <AppButton type="submit" disabled={saving}>
          {saving
            ? 'Saving…'
            : initialReview
            ? 'Save changes'
            : 'Publish review'}
        </AppButton>
        <AppButton
          type="button"
          variant="outlined"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </AppButton>
      </Stack>
    </Paper>
  );
}

function ReviewsSection({
  initialReviews,
  initialReviewCount,
  initialRating,
  targetId,
  targetType,
  reviewsPageHref,
  title = 'Guest Reviews',
}) {
  const { status, data: session } = useSession();
  const [reviews, setReviews] = useState(initialReviews || []);
  const [reviewCount, setReviewCount] = useState(initialReviewCount || 0);
  const [rating, setRating] = useState(initialRating || null);
  const [formReview, setFormReview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const currentUserId = session?.user?.id;

  const saveReview = (savedReview) => {
    const previousReview = reviews.find(
      (review) => review.id === savedReview.id
    );
    setReviews((current) => {
      const exists = current.some((review) => review.id === savedReview.id);
      if (exists)
        return current.map((review) =>
          review.id === savedReview.id ? savedReview : review
        );
      return [savedReview, ...current].slice(0, 4);
    });
    if (previousReview) {
      setRating((currentRating) => {
        if (!reviewCount || currentRating === null)
          return averageRating(
            reviews.map((review) =>
              review.id === savedReview.id ? savedReview : review
            )
          );
        return (
          (currentRating * reviewCount -
            previousReview.rating +
            savedReview.rating) /
          reviewCount
        );
      });
    } else {
      setRating((currentRating) =>
        currentRating === null
          ? savedReview.rating
          : (currentRating * reviewCount + savedReview.rating) /
            (reviewCount + 1)
      );
      setReviewCount((count) => count + 1);
    }
    setShowForm(false);
    setFormReview(null);
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete your review? This cannot be undone.')) return;
    setError('');
    const response = await fetch(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to delete your review');
      return;
    }
    const deletedReview = reviews.find((review) => review.id === reviewId);
    setReviews((current) => current.filter((review) => review.id !== reviewId));
    if (deletedReview) {
      setRating((currentRating) => {
        if (reviewCount <= 1 || currentRating === null) return null;
        return (
          (currentRating * reviewCount - deletedReview.rating) /
          (reviewCount - 1)
        );
      });
    }
    setReviewCount((count) => Math.max(0, count - 1));
  };

  const ownReview = reviews.find(
    (review) => review.reviewerUserId === currentUserId
  );

  return (
    <Box>
      <Divider sx={{ mb: 4 }} />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            {title}
          </Typography>
          {rating ? (
            <StarRow rating={rating} count={reviewCount} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No reviews yet — be the first to share feedback.
            </Typography>
          )}
        </Box>
        {status === 'authenticated' && !ownReview && !showForm && (
          <AppButton
            onClick={() => {
              setFormReview(null);
              setShowForm(true);
            }}
          >
            Add review
          </AppButton>
        )}
      </Box>
      {status === 'unauthenticated' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sign in to leave a review.
        </Typography>
      )}
      {showForm && (
        <ReviewForm
          initialReview={formReview}
          targetId={targetId}
          targetType={targetType}
          onSaved={saveReview}
          onCancel={() => {
            setShowForm(false);
            setFormReview(null);
          }}
        />
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {reviews.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' },
          }}
        >
          {reviews.map((review) => {
            const isOwner = review.reviewerUserId === currentUserId;
            return (
              <Box
                key={review.id}
                sx={(theme) => ({
                  p: 2.5,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: theme.palette.background.paper,
                })}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  <Avatar
                    sx={(theme) => ({
                      width: 44,
                      height: 44,
                      fontWeight: 700,
                      bgcolor: theme.palette.primary.main,
                      fontSize: '1rem',
                    })}
                  >
                    {review.reviewerInitials}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {review.reviewerName}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.3, mt: 0.2 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarRoundedIcon
                          key={star}
                          sx={{
                            fontSize: 14,
                            color:
                              star <= review.rating
                                ? '#00B4D8'
                                : 'text.disabled',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                  {isOwner && (
                    <Stack direction="row" spacing={0.25}>
                      <IconButton
                        size="small"
                        aria-label="Edit your review"
                        onClick={() => {
                          setFormReview(review);
                          setShowForm(true);
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Delete your review"
                        color="error"
                        onClick={() => deleteReview(review.id)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.65 }}
                >
                  &ldquo;{review.comment}&rdquo;
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
      {reviewsPageHref && reviewCount > 0 && (
        <Box sx={{ mt: 2.5, textAlign: 'center' }}>
          <AppButton component={Link} href={reviewsPageHref} variant="outlined">
            View all reviews
          </AppButton>
        </Box>
      )}
    </Box>
  );
}

function StayDetailView({ stay }) {
  const { status, data: session } = useSession();
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [ownerAlert, setOwnerAlert] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reservationForm, setReservationForm] = useState({
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1,
    units: 1,
    customerPhone: '',
    guestNotes: '',
  });
  const [reservationStatus, setReservationStatus] = useState({
    loading: false,
    error: '',
    success: '',
  });

  const handleRequestRoom = (room) => {
    if (status !== 'authenticated') {
      setLoginPrompt(true);
      return;
    }
    if (
      session?.user?.id &&
      stay.ownerUserId &&
      session.user.id === stay.ownerUserId
    ) {
      setOwnerAlert(true);
      return;
    }
    setReservationStatus({ loading: false, error: '', success: '' });
    setSelectedRoom(room);
  };

  const closeReservationDialog = () => {
    if (reservationStatus.loading) return;
    setSelectedRoom(null);
    setReservationStatus({ loading: false, error: '', success: '' });
  };

  const reservationNights = useMemo(() => {
    if (!reservationForm.checkInDate || !reservationForm.checkOutDate) return 0;
    const start = new Date(`${reservationForm.checkInDate}T00:00:00.000Z`);
    const end = new Date(`${reservationForm.checkOutDate}T00:00:00.000Z`);
    const nights = Math.round((end - start) / 86_400_000);
    return Number.isFinite(nights) && nights > 0 ? nights : 0;
  }, [reservationForm.checkInDate, reservationForm.checkOutDate]);

  const submitReservation = async () => {
    if (!selectedRoom) return;
    setReservationStatus({ loading: true, error: '', success: '' });

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stayId: stay.id,
          roomId: selectedRoom.id,
          ...reservationForm,
          guestCount: Number(reservationForm.guestCount),
          units: Number(reservationForm.units),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || 'Unable to request this room');
      setReservationStatus({
        loading: false,
        error: '',
        success: 'Request sent. The host has up to 24 hours to respond.',
      });
    } catch (error) {
      setReservationStatus({
        loading: false,
        error: error.message || 'Unable to request this room',
        success: '',
      });
    }
  };

  const groupedMenu = useMemo(() => {
    const items = Array.isArray(stay.menuItems) ? stay.menuItems : [];
    const roomItems = Array.isArray(stay.rooms) ? stay.rooms : [];
    const availableRoomPrices = roomItems
      .filter((item) => item.isActive !== false)
      .map((item) => Number(item.pricePerNight))
      .filter((price) => Number.isFinite(price) && price > 0);
    const allRoomPrices = roomItems
      .map((item) => Number(item.pricePerNight))
      .filter((price) => Number.isFinite(price) && price > 0);

    return {
      rooms: roomItems,
      foods: items.filter((item) => item.category === 'food'),
      cheapestRoomPrice:
        availableRoomPrices.length > 0
          ? Math.min(...availableRoomPrices)
          : allRoomPrices.length > 0
          ? Math.min(...allRoomPrices)
          : null,
    };
  }, [stay.menuItems, stay.rooms]);

  const baseRoomPrice = groupedMenu.cheapestRoomPrice;
  const finalPrice =
    baseRoomPrice && stay.discountPercent > 0
      ? Math.round(baseRoomPrice * (1 - stay.discountPercent / 100))
      : baseRoomPrice;

  const reviews = Array.isArray(stay.reviews) ? stay.reviews : [];

  return (
    <>
      <Head>
        <title>{stay.name} | NepalTrex</title>
        <meta name="description" content={stay.description} />
      </Head>

      <SiteHeader />

      <Box
        sx={{
          position: 'relative',
          maxWidth: 1440,
          mx: 'auto',
          mt: { xs: 1.5, md: 2.5 },
          height: { xs: 300, sm: 420, md: 520 },
          overflow: 'hidden',
          borderRadius: { xs: 0, sm: 2 },
          boxShadow: '0 22px 54px rgba(2, 62, 138, 0.24)',
        }}
      >
        <Box
          component="img"
          src={stay.imageUrl || DEFAULT_STAY_IMAGE}
          alt={stay.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(3,4,94,0.86) 0%, rgba(3,4,94,0.3) 58%, rgba(3,4,94,0.04) 100%)',
          }}
        />
        {/* Text on hero */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: 1240,
            mx: 'auto',
            px: { xs: 2.5, md: 5 },
            pb: { xs: 3, md: 4.5 },
          }}
        >
          {/* Badges */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.2, flexWrap: 'wrap' }}>
            <Box
              sx={{
                px: 1.4,
                py: 0.4,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.16)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {stay.stayType}
              </Typography>
            </Box>
            {stay.isFeatured && (
              <Box
                sx={{ px: 1.4, py: 0.4, borderRadius: 1, bgcolor: '#00B4D8' }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: '#03045E', fontWeight: 800 }}
                >
                  Featured
                </Typography>
              </Box>
            )}
            {stay.discountPercent > 0 && (
              <Box
                sx={{
                  px: 1.4,
                  py: 0.4,
                  borderRadius: 1,
                  bgcolor: '#0096C7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <LocalOfferRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
                <Typography
                  variant="caption"
                  sx={{ color: '#fff', fontWeight: 700 }}
                >
                  {stay.discountPercent}% off
                </Typography>
              </Box>
            )}
          </Box>

          <Typography
            variant="h3"
            sx={{
              color: '#fff',
              fontWeight: 700,
              lineHeight: 1.1,
              fontSize: { xs: '2rem', sm: '2.7rem', md: '3.4rem' },
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: '-0.045em',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              mb: 1,
            }}
          >
            {stay.name}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <PlaceIcon
                sx={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}
              />
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.9)' }}
              >
                {stay.location}
              </Typography>
            </Box>
            {stay.avgRating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <StarRoundedIcon sx={{ fontSize: 16, color: '#00B4D8' }} />
                <Typography
                  variant="body2"
                  sx={{ color: '#fff', fontWeight: 700 }}
                >
                  {Number(stay.avgRating).toFixed(1)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  ({reviews.length} review{reviews.length === 1 ? '' : 's'})
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Page body */}
      <Box
        sx={(theme) => ({
          minHeight: '60vh',
          py: { xs: 3.5, md: 6 },
          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 18% 12%, rgba(0,180,216,0.24) 0%, transparent 38%), linear-gradient(160deg, #03045E 0%, #023E8A 100%)'
              : theme.palette.background.default,
        })}
      >
        <Container maxWidth="xl">
          {/* Quick stats row */}
          <Box
            sx={(theme) => ({
              display: 'flex',
              gap: { xs: 2, md: 4 },
              flexWrap: 'wrap',
              alignItems: 'center',
              p: { xs: 2, md: 2.5 },
              mb: 3.5,
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: '0 8px 24px rgba(2, 62, 138, 0.1)',
              borderBottom: `1px solid ${theme.palette.divider}`,
            })}
          >
            {finalPrice && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  From (room only)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
                  {stay.discountPercent > 0 && (
                    <Typography
                      variant="body2"
                      sx={{
                        textDecoration: 'line-through',
                        color: 'text.disabled',
                      }}
                    >
                      NPR {baseRoomPrice.toLocaleString()}
                    </Typography>
                  )}
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="primary.main"
                  >
                    NPR {finalPrice.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    /night (not incl. food)
                  </Typography>
                </Box>
              </Box>
            )}

            {stay.avgRating && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Rating
                </Typography>
                <StarRow rating={stay.avgRating} count={reviews.length} />
              </Box>
            )}

            {stay.contactPhone && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Contact
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {stay.contactPhone}
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                lg: 'minmax(0, 1fr) 330px',
              },
              gap: { xs: 4, lg: 7 },
              alignItems: 'start',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {ownerAlert && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  onClose={() => setOwnerAlert(false)}
                >
                  You cannot book your own stay.
                </Alert>
              )}

              {loginPrompt && status !== 'authenticated' && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  onClose={() => setLoginPrompt(false)}
                >
                  Please{' '}
                  <Link
                    href={`/auth/signin?callbackUrl=${encodeURIComponent(
                      typeof window !== 'undefined'
                        ? window.location.pathname
                        : ''
                    )}`}
                    style={{ fontWeight: 700 }}
                  >
                    sign in
                  </Link>{' '}
                  to request a room.
                </Alert>
              )}

              {stay.description && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>
                    About this stay
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {stay.description}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ mb: 4 }} />

              {/* Room Options */}
              <Box id="room-options" sx={{ mb: 4, scrollMarginTop: 96 }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
                  Room Options
                </Typography>
                {groupedMenu.rooms.length === 0 ? (
                  <Typography color="text.secondary">
                    No room options listed yet.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {groupedMenu.rooms.map((item) => {
                      const isUnavailable = item.isActive === false;
                      return (
                        <Card
                          key={item.id}
                          sx={(theme) => ({
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: `1px solid ${theme.palette.divider}`,
                            opacity: isUnavailable ? 0.62 : 1,
                          })}
                          elevation={0}
                        >
                          <CardMedia
                            component="img"
                            image={item.imageUrl || DEFAULT_MENU_IMAGE}
                            alt={item.name}
                            sx={{
                              width: { xs: '100%', sm: 210 },
                              height: { xs: 210, sm: 168 },
                              objectFit: 'cover',
                              flexShrink: 0,
                              filter: isUnavailable
                                ? 'grayscale(0.9) blur(1px)'
                                : 'none',
                            }}
                          />
                          <CardContent
                            sx={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              p: 2,
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle1" fontWeight={700}>
                                {item.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.4, mb: 1.2 }}
                              >
                                {item.description}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 1.2 }}
                              >
                                Sleeps up to {item.capacity} guest
                                {Number(item.capacity) === 1 ? '' : 's'} ·{' '}
                                {item.totalUnits} room
                                {Number(item.totalUnits) === 1 ? '' : 's'}{' '}
                                available to request
                              </Typography>
                              {isUnavailable && (
                                <Chip
                                  size="small"
                                  color="default"
                                  label="Unavailable"
                                  sx={{ mb: 1 }}
                                />
                              )}
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Typography
                                variant="body1"
                                fontWeight={700}
                                color="primary.main"
                              >
                                NPR{' '}
                                {Number(item.pricePerNight).toLocaleString()} /
                                night
                              </Typography>
                              <AppButton
                                variant="contained"
                                size="small"
                                disabled={isUnavailable}
                                onClick={() => handleRequestRoom(item)}
                              >
                                {isUnavailable ? 'Unavailable' : 'Request room'}
                              </AppButton>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              <Divider sx={{ mb: 4 }} />

              {/* Meal information */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
                  Meals at the stay
                </Typography>
                {groupedMenu.foods.length === 0 ? (
                  <Typography color="text.secondary">
                    Ask the host about meals and dietary needs when they confirm your stay.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' },
                    }}
                  >
                    {groupedMenu.foods.map((item, index) => (
                      <Card
                        key={`food-${index}`}
                        sx={(theme) => ({
                          border: `1px solid ${theme.palette.divider}`,
                          overflow: 'hidden',
                          borderRadius: 2,
                        })}
                        elevation={0}
                      >
                        <CardMedia
                          component="img"
                          height="160"
                          image={item.imageUrl || DEFAULT_MENU_IMAGE}
                          alt={item.name}
                          sx={{ objectFit: 'cover' }}
                        />
                        <CardContent sx={{ p: 1.8 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ mb: 0.4 }}
                          >
                            {item.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1.2 }}
                          >
                            {item.description}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color="primary.main"
                            >
                              NPR {Number(item.price).toLocaleString()}
                            </Typography>
                            <Chip size="small" label="Ask host when booking" variant="outlined" />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>

              <ReviewsSection
                initialReviews={reviews}
                initialReviewCount={stay.reviewCount}
                initialRating={stay.avgRating}
                targetId={stay.id}
                targetType="stay"
                reviewsPageHref={`/reviews/stay/${stay.slug}`}
              />
            </Box>
            <Paper
              sx={{
                display: { xs: 'none', lg: 'block' },
                position: 'sticky',
                top: 88,
                p: 3,
                borderRadius: 2,
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Plan your stay
              </Typography>
              {finalPrice ? (
                <>
                  <Typography variant="h5" sx={{ mt: 0.4 }}>
                    From NPR {finalPrice.toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    / night, room only
                  </Typography>
                </>
              ) : (
                <Typography variant="h6" sx={{ mt: 0.4 }}>
                  Choose a room below
                </Typography>
              )}
              <Divider sx={{ my: 2.25 }} />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.65, mb: 2.25 }}
              >
                Choose a room, add your dates, and send one booking request.
                The host confirms final availability and any meal arrangements.
              </Typography>
              <AppButton
                fullWidth
                onClick={() =>
                  document
                    .getElementById('room-options')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                Choose a room
              </AppButton>
            </Paper>
          </Box>
        </Container>
      </Box>

      <Dialog
        open={Boolean(selectedRoom)}
        onClose={closeReservationDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {reservationStatus.success
            ? 'Reservation request sent'
            : `Request ${selectedRoom?.name || 'room'}`}
        </DialogTitle>
        <DialogContent>
          {reservationStatus.success ? (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity="success">{reservationStatus.success}</Alert>
              <Typography color="text.secondary">
                The request is now held for host review. A reservation is
                confirmed only after the host accepts it.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {reservationStatus.error && (
                <Alert severity="error">{reservationStatus.error}</Alert>
              )}
              <Typography variant="body2" color="text.secondary">
                This is a reservation request, not an instant confirmation.
                Availability and the final total are confirmed by the host.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Check-in"
                  type="date"
                  fullWidth
                  required
                  value={reservationForm.checkInDate}
                  onChange={(event) =>
                    setReservationForm((current) => ({
                      ...current,
                      checkInDate: event.target.value,
                    }))
                  }
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: new Date().toISOString().slice(0, 10) },
                  }}
                />
                <TextField
                  label="Check-out"
                  type="date"
                  fullWidth
                  required
                  value={reservationForm.checkOutDate}
                  onChange={(event) =>
                    setReservationForm((current) => ({
                      ...current,
                      checkOutDate: event.target.value,
                    }))
                  }
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: {
                      min:
                        reservationForm.checkInDate ||
                        new Date().toISOString().slice(0, 10),
                    },
                  }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Guests"
                  type="number"
                  fullWidth
                  required
                  value={reservationForm.guestCount}
                  onChange={(event) =>
                    setReservationForm((current) => ({
                      ...current,
                      guestCount: event.target.value,
                    }))
                  }
                  slotProps={{
                    htmlInput: {
                      min: 1,
                      max: Math.max(
                        1,
                        Number(selectedRoom?.capacity || 1) *
                          Number(reservationForm.units || 1)
                      ),
                    },
                  }}
                />
                <TextField
                  label="Rooms"
                  type="number"
                  fullWidth
                  required
                  value={reservationForm.units}
                  onChange={(event) =>
                    setReservationForm((current) => ({
                      ...current,
                      units: event.target.value,
                    }))
                  }
                  slotProps={{
                    htmlInput: { min: 1, max: selectedRoom?.totalUnits || 1 },
                  }}
                />
              </Stack>
              <TextField
                label="Phone number"
                fullWidth
                required
                value={reservationForm.customerPhone}
                onChange={(event) =>
                  setReservationForm((current) => ({
                    ...current,
                    customerPhone: event.target.value,
                  }))
                }
              />
              <TextField
                label="Note for the host (optional)"
                fullWidth
                multiline
                minRows={3}
                value={reservationForm.guestNotes}
                onChange={(event) =>
                  setReservationForm((current) => ({
                    ...current,
                    guestNotes: event.target.value,
                  }))
                }
              />
              {reservationNights > 0 && selectedRoom && (
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, bgcolor: 'action.hover' }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    Estimated total: NPR{' '}
                    {(
                      Number(selectedRoom.pricePerNight) *
                      reservationNights *
                      Number(reservationForm.units || 1)
                    ).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {reservationNights} night
                    {reservationNights === 1 ? '' : 's'} · final availability
                    and total are confirmed by the host.
                  </Typography>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton
            variant="outlined"
            onClick={closeReservationDialog}
            disabled={reservationStatus.loading}
          >
            {reservationStatus.success ? 'Close' : 'Cancel'}
          </AppButton>
          {!reservationStatus.success && (
            <AppButton
              onClick={submitReservation}
              disabled={
                reservationStatus.loading ||
                reservationNights === 0 ||
                !reservationForm.customerPhone
              }
            >
              {reservationStatus.loading ? 'Sending request…' : 'Send request'}
            </AppButton>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

function TrekDetailView({ trek }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hoveredStayId, setHoveredStayId] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistError, setWishlistError] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [attemptsLoaded, setAttemptsLoaded] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState({
    loading: false,
    error: '',
    success: '',
  });
  const [userLocation, setUserLocation] = useState(null);
  const watchIdRef = useRef(null);
  const routeWaypoints = useMemo(
    () => parseRouteWaypoints(trek.routeGeojson),
    [trek.routeGeojson]
  );
  const guidanceWaypoint = useMemo(() => {
    if (!userLocation || routeWaypoints.length === 0) return null;
    return routeWaypoints.reduce((closest, waypoint) =>
      haversineKm(
        userLocation.latitude,
        userLocation.longitude,
        waypoint.lat,
        waypoint.lng
      ) <
      haversineKm(
        userLocation.latitude,
        userLocation.longitude,
        closest.lat,
        closest.lng
      )
        ? waypoint
        : closest
    );
  }, [routeWaypoints, userLocation]);
  const guidanceDistanceKm =
    guidanceWaypoint && userLocation
      ? haversineKm(
          userLocation.latitude,
          userLocation.longitude,
          guidanceWaypoint.lat,
          guidanceWaypoint.lng
        )
      : null;

  useEffect(() => {
    if (status !== 'authenticated') {
      setIsWishlisted(false);
      return;
    }

    fetch('/api/users/wishlist')
      .then((response) => (response.ok ? response.json() : { slugs: [] }))
      .then((data) =>
        setIsWishlisted((data.slugs || []).includes(router.query.slug))
      )
      .catch(() => setIsWishlisted(false));
  }, [router.query.slug, status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setAttempts([]);
      setAttemptsLoaded(false);
      return;
    }

    let active = true;
    fetch('/api/trek-attempts')
      .then((response) => (response.ok ? response.json() : { attempts: [] }))
      .then((data) => {
        if (active) setAttempts(data.attempts || []);
      })
      .catch(() => {
        if (active) setAttempts([]);
      })
      .finally(() => {
        if (active) setAttemptsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [status]);

  useEffect(
    () => () => {
      if (watchIdRef.current !== null && navigator.geolocation)
        navigator.geolocation.clearWatch(watchIdRef.current);
    },
    []
  );

  const toggleWishlist = async () => {
    if (status !== 'authenticated') {
      router.push(
        `/auth/signin?callbackUrl=${encodeURIComponent(router.asPath)}`
      );
      return;
    }

    setWishlistError('');
    const nextSavedState = !isWishlisted;
    setIsWishlisted(nextSavedState);
    try {
      const response = await fetch('/api/users/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: router.query.slug,
          action: nextSavedState ? 'add' : 'remove',
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || 'Unable to update wishlist');
      setIsWishlisted((data.slugs || []).includes(router.query.slug));
    } catch (error) {
      setIsWishlisted(!nextSavedState);
      setWishlistError(error.message || 'Unable to update wishlist');
    }
  };

  const updateLiveLocation = (position) => {
    setUserLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      updatedAt: position.timestamp,
    });
  };

  const startAttempt = () => {
    if (status !== 'authenticated') {
      router.push(
        `/auth/signin?callbackUrl=${encodeURIComponent(router.asPath)}`
      );
      return;
    }
    if (!navigator.geolocation) {
      setAttemptStatus({
        loading: false,
        error: 'Location services are not available in this browser.',
        success: '',
      });
      return;
    }

    setAttemptStatus({ loading: true, error: '', success: '' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        updateLiveLocation(position);
        try {
          const response = await fetch('/api/trek-attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trekId: trek.id,
              startLatitude: position.coords.latitude,
              startLongitude: position.coords.longitude,
              startAccuracyM: position.coords.accuracy,
            }),
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || 'Unable to start this trek attempt');
          setAttempts((current) => [
            { ...data.attempt, trekName: trek.name, trekSlug: trek.slug },
            ...current,
          ]);
          setAttemptsLoaded(true);
          setAttemptStatus({
            loading: false,
            error: '',
            success: 'Attempt started. Live trail guidance is now on.',
          });
          if (watchIdRef.current !== null)
            navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = navigator.geolocation.watchPosition(
            updateLiveLocation,
            () => {
              setAttemptStatus((current) => ({
                ...current,
                error:
                  'Live location updates were interrupted. You can still use the route map.',
              }));
            },
            { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
          );
        } catch (error) {
          setAttemptStatus({
            loading: false,
            error: error.message || 'Unable to start this trek attempt',
            success: '',
          });
        }
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission is required to begin an attempt and show live directions.'
            : 'We could not determine your location. Please try again outdoors or check location services.';
        setAttemptStatus({ loading: false, error: message, success: '' });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
    );
  };

  const stopLiveDirections = () => {
    if (watchIdRef.current !== null && navigator.geolocation)
      navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setAttemptStatus((current) => ({
      ...current,
      success: 'Live directions paused. Your attempt remains in history.',
    }));
  };

  const currentTrekAttempts = attempts.filter(
    (attempt) => String(attempt.trekId) === String(trek.id)
  );
  const directionsUrl = guidanceWaypoint
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        `${userLocation.latitude},${userLocation.longitude}`
      )}&destination=${encodeURIComponent(
        `${guidanceWaypoint.lat},${guidanceWaypoint.lng}`
      )}&travelmode=walking`
    : null;

  return (
    <>
      <Head>
        <title>{trek.name} | NepalTrex</title>
        <meta
          name="description"
          content={
            trek.description ||
            `${trek.name} detailed itinerary, route and nearby stays.`
          }
        />
      </Head>

      <SiteHeader />

      <Box
        sx={(theme) => ({
          minHeight: '100vh',
          py: { xs: 2.5, md: 4.5 },
          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 18% 12%, rgba(0,180,216,0.28) 0%, transparent 38%), linear-gradient(160deg, #03045E 0%, #023E8A 100%)'
              : theme.palette.background.default,
        })}
      >
        <Container maxWidth="xl">
          <Card
            sx={{
              mb: 4,
              overflow: 'hidden',
              borderRadius: { xs: 0, sm: 2 },
              boxShadow: '0 22px 54px rgba(2, 62, 138, 0.22)',
            }}
          >
            <CardMedia
              component="img"
              height="460"
              image={getTrekImage(trek.name)}
              alt={trek.name}
              sx={{
                objectFit: 'cover',
                objectPosition: 'center',
                height: { xs: 300, sm: 390, md: 460 },
              }}
            />
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Typography variant="overline" color="text.secondary">
                Guided route overview
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 1.5,
                }}
              >
                <Typography
                  variant="h3"
                  sx={{ mt: 0.4, fontSize: { xs: '2rem', md: '3rem' } }}
                >
                  {trek.name}
                </Typography>
                <AppButton
                  variant={isWishlisted ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={
                    isWishlisted ? <FavoriteIcon /> : <FavoriteBorderIcon />
                  }
                  disabled={status === 'loading'}
                  onClick={toggleWishlist}
                  sx={{ mt: 0.5, flexShrink: 0 }}
                >
                  {isWishlisted ? 'Saved' : 'Wishlist'}
                </AppButton>
              </Box>
              {wishlistError && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {wishlistError}
                </Alert>
              )}
              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 2, flexWrap: 'wrap' }}
              >
                <Chip label={trek.region} color="secondary" />
                <Tooltip title={getDifficultyLabel(trek.level)}>
                  <Chip label={trek.level} variant="outlined" />
                </Tooltip>
                <Chip label={`${trek.durationDays} days`} variant="outlined" />
                {trek.elevationMinM && trek.elevationMaxM && (
                  <Chip
                    label={`${trek.elevationMinM.toLocaleString()}m - ${trek.elevationMaxM.toLocaleString()}m`}
                    variant="outlined"
                  />
                )}
              </Stack>
              <Typography
                color="text.secondary"
                sx={{
                  maxWidth: 820,
                  lineHeight: 1.75,
                  fontSize: { md: '1.05rem' },
                }}
              >
                {trek.description ||
                  'Detailed trek description is coming soon.'}
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ mt: 2.5 }}
              >
                <AppButton
                  startIcon={<NearMeRoundedIcon />}
                  onClick={startAttempt}
                  disabled={attemptStatus.loading || status === 'loading'}
                >
                  {attemptStatus.loading
                    ? 'Getting your location…'
                    : 'Attempt Trek'}
                </AppButton>
                {userLocation && (
                  <AppButton
                    variant="outlined"
                    startIcon={<MyLocationRoundedIcon />}
                    onClick={stopLiveDirections}
                  >
                    Pause live directions
                  </AppButton>
                )}
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.1 }}
              >
                Starting an attempt saves its time and initial GPS point to your
                private history. Live location remains on this device.
              </Typography>
            </CardContent>
          </Card>

          {(attemptStatus.error || attemptStatus.success) && (
            <Alert
              severity={attemptStatus.error ? 'error' : 'success'}
              sx={{ mb: 3 }}
              onClose={() =>
                setAttemptStatus((current) => ({
                  ...current,
                  error: '',
                  success: '',
                }))
              }
            >
              {attemptStatus.error || attemptStatus.success}
            </Alert>
          )}

          {userLocation && (
            <Paper
              sx={{
                p: { xs: 2, md: 3 },
                mb: 4,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'primary.light',
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="overline" color="primary">
                    Live trail guidance
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.25 }}>
                    Follow the saved trek route
                  </Typography>
                  {guidanceWaypoint ? (
                    <Typography color="text.secondary" sx={{ mt: 0.8 }}>
                      Head{' '}
                      {bearingLabel(
                        userLocation.latitude,
                        userLocation.longitude,
                        guidanceWaypoint.lat,
                        guidanceWaypoint.lng
                      )}{' '}
                      for{' '}
                      {guidanceWaypoint.place || 'the nearest trail waypoint'} ·{' '}
                      {guidanceDistanceKm < 1
                        ? `${Math.round(guidanceDistanceKm * 1000)} m`
                        : `${guidanceDistanceKm.toFixed(1)} km`}{' '}
                      away.
                    </Typography>
                  ) : (
                    <Typography color="text.secondary" sx={{ mt: 0.8 }}>
                      This trek has no mapped waypoints yet. Your current
                      location is shown on the map.
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 1 }}
                  >
                    GPS accuracy: {Math.round(userLocation.accuracy || 0)} m ·
                    last update{' '}
                    {new Date(userLocation.updatedAt).toLocaleTimeString()}
                  </Typography>
                </Box>
                {directionsUrl && (
                  <AppButton
                    component="a"
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    sx={{ alignSelf: { md: 'center' } }}
                  >
                    Open in Google Maps
                  </AppButton>
                )}
              </Stack>
            </Paper>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 1.5,
              mb: 4,
            }}
          >
            {[
              ['Duration', `${trek.durationDays} days`],
              ['Difficulty', trek.level],
              ['Route stops', routeWaypoints.length ? `${routeWaypoints.length} mapped waypoints` : 'Route details pending'],
              [
                'Elevation',
                trek.elevationMinM && trek.elevationMaxM
                  ? `${trek.elevationMinM.toLocaleString()}–${trek.elevationMaxM.toLocaleString()}m`
                  : 'Not listed',
              ],
            ].map(([label, value]) => (
              <Paper
                key={label}
                sx={{ p: 2.25, borderRadius: 2, boxShadow: 'none' }}
              >
                <Typography variant="overline" color="text.secondary">
                  {label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    mt: 0.25,
                    textTransform:
                      label === 'Difficulty' ? 'capitalize' : 'none',
                  }}
                >
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Interactive trail map
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.25, mb: 0.8 }}>
              Route Map
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Hover over a nearby stay card below to highlight it on the map.
            </Typography>
            <Box
              sx={(theme) => ({
                borderRadius: 2,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              })}
            >
              <TrekRouteMap
                selectedTrek={{
                  name: trek.name,
                  routeGeojson: trek.routeGeojson,
                }}
                nearbyStays={trek.nearbyStays}
                hoveredStayId={hoveredStayId}
                userLocation={userLocation}
                guidanceWaypoint={guidanceWaypoint}
              />
            </Box>
          </Paper>

          {status === 'authenticated' && (
            <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Private activity
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.25, mb: 1.4 }}>
                Your {trek.name} attempts
              </Typography>
              {!attemptsLoaded ? (
                <Typography color="text.secondary">
                  Loading your attempt history...
                </Typography>
              ) : currentTrekAttempts.length === 0 ? (
                <Typography color="text.secondary">
                  No attempts recorded yet. Start when you are ready for live
                  trail guidance.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {currentTrekAttempts.map((attempt) => (
                    <Paper key={attempt.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Attempt started{' '}
                        {new Date(attempt.attemptedAt).toLocaleString()}
                      </Typography>
                      {attempt.startAccuracyM !== null && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.35 }}
                        >
                          Initial GPS accuracy:{' '}
                          {Math.round(attempt.startAccuracyM)} m
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          )}

          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 2 }}>
            <ReviewsSection
              initialReviews={trek.reviews || []}
              initialReviewCount={trek.reviewCount}
              initialRating={trek.avgRating}
              targetId={trek.id}
              targetType="trek"
              reviewsPageHref={`/reviews/trek/${trek.slug}`}
              title="Trekker Reviews"
            />
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Rest along the route
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.25, mb: 0.8 }}>
              Nearby Stays ({trek.nearbyStays.length} within{' '}
              {NEARBY_THRESHOLD_KM} km)
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              Hover a card to pin it on the route map above.
            </Typography>

            {trek.nearbyStays.length === 0 ? (
              <Alert severity="info">
                No mapped stays are currently near this route.
              </Alert>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
                  },
                }}
              >
                {trek.nearbyStays.map((stay) => (
                  <Box
                    key={stay.id}
                    onMouseEnter={() => setHoveredStayId(stay.id)}
                    onMouseLeave={() => setHoveredStayId(null)}
                    sx={(theme) => ({
                      outline:
                        hoveredStayId === stay.id
                          ? '2px solid'
                          : '2px solid transparent',
                      outlineColor:
                        hoveredStayId === stay.id
                          ? theme.palette.primary.main
                          : 'transparent',
                      borderRadius: 2,
                      transition: 'outline-color 0.2s ease',
                    })}
                  >
                    <StayThumbnailCard stay={stay} />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </>
  );
}

export default function SlugPage(props) {
  if (props.pageType === 'trek') {
    return <TrekDetailView trek={props.trek} />;
  }

  return <StayDetailView stay={props.stay} />;
}

export async function getServerSideProps(context) {
  const slug = context.params?.slug;

  if (!slug) {
    return { notFound: true };
  }

  const trekResult = await query(
    `
      SELECT id, name, duration_days, level, region, description, route_geojson, elevation_min_m, elevation_max_m
      FROM treks
      WHERE trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) = $1
      LIMIT 1
    `,
    [slug.toLowerCase()]
  );

  if (trekResult.rows.length > 0) {
    const row = trekResult.rows[0];
    const routeWaypoints = parseRouteWaypoints(row.route_geojson);

    const [stayRows, reviews, reviewSummary] = await Promise.all([
      query(
        `
        SELECT
          s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url, s.contact_phone,
          s.price_per_night, s.is_featured, s.discount_percent, s.latitude, s.longitude,
          COALESCE(
            MIN(CASE WHEN m.category = 'room' AND m.available = true THEN m.price END),
            MIN(CASE WHEN m.category = 'room' THEN m.price END)
          ) AS cheapest_room_price,
          ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
          COUNT(DISTINCT r.id)::int AS review_count
        FROM stays s
        LEFT JOIN menu_items m ON m.stay_id = s.id
        LEFT JOIN reviews r ON r.target_type = 'stay' AND r.target_id = s.id
        WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
        GROUP BY s.id
      `
      ),
      getReviews('trek', row.id, 4),
      getReviewSummary('trek', row.id),
    ]);

    const nearbyStays = stayRows.rows
      .map((stay) => {
        const distanceKm = minDistanceToRouteKm(
          routeWaypoints,
          Number(stay.latitude),
          Number(stay.longitude)
        );
        return {
          id: stay.id,
          name: stay.name,
          slug: stay.slug,
          stayType: stay.stay_type,
          location: stay.location,
          description: stay.description,
          imageUrl: stay.image_url || DEFAULT_STAY_IMAGE,
          pricePerNight: stay.cheapest_room_price
            ? Number(stay.cheapest_room_price)
            : null,
          isFeatured: Boolean(stay.is_featured),
          discountPercent: Number(stay.discount_percent || 0),
          avgRating: stay.avg_rating
            ? Number(stay.avg_rating).toFixed(1)
            : null,
          reviewCount: Number(stay.review_count || 0),
          contactPhone: stay.contact_phone || '',
          latitude: stay.latitude,
          longitude: stay.longitude,
          distanceKm,
        };
      })
      .filter(
        (stay) =>
          Number.isFinite(stay.distanceKm) &&
          stay.distanceKm <= NEARBY_THRESHOLD_KM
      )
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      props: {
        pageType: 'trek',
        trek: {
          id: row.id,
          name: row.name,
          slug,
          durationDays: row.duration_days,
          level: row.level,
          region: row.region,
          description: row.description || '',
          routeGeojson: row.route_geojson,
          elevationMinM: row.elevation_min_m || null,
          elevationMaxM: row.elevation_max_m || null,
          nearbyStays,
          reviews,
          reviewCount: reviewSummary.reviewCount,
          avgRating: reviewSummary.avgRating,
        },
      },
    };
  }

  const stayResult = await query(
    `
      SELECT
        s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url,
        s.contact_phone, s.owner_user_id, s.price_per_night, s.is_featured, s.discount_percent,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', m.id, 'category', m.category, 'name', m.name, 'description', m.description,
              'price', m.price, 'imageUrl', m.image_url, 'available', m.available
            )
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::jsonb
          ) AS menu_items,
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', r.id, 'name', r.name, 'description', r.description,
                  'pricePerNight', r.price_per_night, 'capacity', r.capacity,
                  'totalUnits', r.total_units, 'imageUrl', r.image_url, 'isActive', r.is_active
                ) ORDER BY r.created_at
              )
              FROM rooms r
              WHERE r.stay_id = s.id
            ),
            '[]'::jsonb
          ) AS rooms
      FROM stays s
      LEFT JOIN menu_items m ON m.stay_id = s.id
      WHERE s.slug = $1
      GROUP BY s.id
      LIMIT 1
    `,
    [slug]
  );

  if (stayResult.rows.length === 0) {
    return { notFound: true };
  }

  const row = stayResult.rows[0];
  const [reviews, reviewSummary] = await Promise.all([
    getReviews('stay', row.id, 4),
    getReviewSummary('stay', row.id),
  ]);

  return {
    props: {
      pageType: 'stay',
      stay: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        stayType: row.stay_type,
        location: row.location,
        description: row.description,
        imageUrl: row.image_url || DEFAULT_STAY_IMAGE,
        menuItems: Array.isArray(row.menu_items) ? row.menu_items : [],
        rooms: Array.isArray(row.rooms) ? row.rooms : [],
        contactPhone: row.contact_phone || '',
        ownerUserId: row.owner_user_id,
        pricePerNight: row.price_per_night ? Number(row.price_per_night) : null,
        isFeatured: Boolean(row.is_featured),
        discountPercent: Number(row.discount_percent || 0),
        avgRating: reviewSummary.avgRating,
        reviewCount: reviewSummary.reviewCount,
        reviews,
      },
    },
  };
}
