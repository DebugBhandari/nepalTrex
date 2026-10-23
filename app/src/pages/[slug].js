import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
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
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PlaceIcon from '@mui/icons-material/Place';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';
import { getTrekImage, minDistanceToRouteKm, parseRouteWaypoints } from '../lib/treks';
import { useCart } from '../hooks/useCart';

const TrekRouteMap = dynamic(() => import('../components/TrekRouteMap'), { ssr: false });

const DEFAULT_STAY_IMAGE = 'https://placehold.co/1000x620?text=NepalTrex+Stay';
const DEFAULT_MENU_IMAGE = 'https://placehold.co/600x380?text=Menu+Item';
const NEARBY_THRESHOLD_KM = 35;

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

async function getReviews(targetType, targetId) {
  const result = await query(
    `
      SELECT r.id, r.reviewer_user_id, r.rating, r.comment, r.created_at, r.updated_at,
        COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NepalTrex guest') AS reviewer_name,
        UPPER(LEFT(COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NT'), 1)) AS reviewer_initials
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_user_id
      WHERE r.target_type = $1 AND r.target_id = $2
      ORDER BY r.created_at DESC
    `,
    [targetType, targetId]
  );
  return result.rows.map(serializeReview);
}

function StarRow({ rating, count }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {stars.map((s) => (
        <StarRoundedIcon
          key={s}
          sx={{ fontSize: 18, color: s <= Math.round(Number(rating)) ? '#00B4D8' : 'text.disabled' }}
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
  return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
}

function ReviewForm({ initialReview, onCancel, onSaved, targetId, targetType }) {
  const [rating, setRating] = useState(initialReview?.rating || 5);
  const [comment, setComment] = useState(initialReview?.comment || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetch(initialReview ? `/api/reviews/${initialReview.id}` : '/api/reviews', {
        method: initialReview ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialReview ? { rating, comment } : { targetType, targetId, rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save your review');
      onSaved(data.review);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper component="form" onSubmit={submit} variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
        {initialReview ? 'Edit your review' : 'Share your experience'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 1.5 }} aria-label={`Rating: ${rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconButton key={star} type="button" size="small" onClick={() => setRating(star)} aria-label={`Set rating to ${star} stars`}>
            <StarRoundedIcon sx={{ color: star <= rating ? '#00B4D8' : 'text.disabled' }} />
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
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      <Stack direction="row" spacing={1} sx={{ mt: 1.75 }}>
        <AppButton type="submit" disabled={saving}>{saving ? 'Saving…' : initialReview ? 'Save changes' : 'Publish review'}</AppButton>
        <AppButton type="button" variant="outlined" onClick={onCancel} disabled={saving}>Cancel</AppButton>
      </Stack>
    </Paper>
  );
}

function ReviewsSection({ initialReviews, targetId, targetType, title = 'Guest Reviews' }) {
  const { status, data: session } = useSession();
  const [reviews, setReviews] = useState(initialReviews || []);
  const [formReview, setFormReview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const rating = averageRating(reviews);
  const currentUserId = session?.user?.id;

  const saveReview = (savedReview) => {
    setReviews((current) => {
      const exists = current.some((review) => review.id === savedReview.id);
      return exists ? current.map((review) => review.id === savedReview.id ? savedReview : review) : [savedReview, ...current];
    });
    setShowForm(false);
    setFormReview(null);
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete your review? This cannot be undone.')) return;
    setError('');
    const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to delete your review');
      return;
    }
    setReviews((current) => current.filter((review) => review.id !== reviewId));
  };

  const ownReview = reviews.find((review) => review.reviewerUserId === currentUserId);

  return (
    <Box>
      <Divider sx={{ mb: 4 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>{title}</Typography>
          {rating ? <StarRow rating={rating} count={reviews.length} /> : <Typography variant="body2" color="text.secondary">No reviews yet — be the first to share feedback.</Typography>}
        </Box>
        {status === 'authenticated' && !ownReview && !showForm && (
          <AppButton onClick={() => { setFormReview(null); setShowForm(true); }}>Add review</AppButton>
        )}
      </Box>
      {status === 'unauthenticated' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Sign in to leave a review.</Typography>
      )}
      {showForm && (
        <ReviewForm
          initialReview={formReview}
          targetId={targetId}
          targetType={targetType}
          onSaved={saveReview}
          onCancel={() => { setShowForm(false); setFormReview(null); }}
        />
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {reviews.length > 0 && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' } }}>
          {reviews.map((review) => {
            const isOwner = review.reviewerUserId === currentUserId;
            return (
              <Box key={review.id} sx={(theme) => ({ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper })}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                  <Avatar sx={(theme) => ({ width: 44, height: 44, fontWeight: 700, bgcolor: theme.palette.primary.main, fontSize: '1rem' })}>{review.reviewerInitials}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>{review.reviewerName}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.3, mt: 0.2 }}>
                      {[1, 2, 3, 4, 5].map((star) => <StarRoundedIcon key={star} sx={{ fontSize: 14, color: star <= review.rating ? '#00B4D8' : 'text.disabled' }} />)}
                    </Box>
                  </Box>
                  {isOwner && (
                    <Stack direction="row" spacing={0.25}>
                      <IconButton size="small" aria-label="Edit your review" onClick={() => { setFormReview(review); setShowForm(true); }}><EditOutlinedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" aria-label="Delete your review" color="error" onClick={() => deleteReview(review.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                    </Stack>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>&ldquo;{review.comment}&rdquo;</Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function StayDetailView({ stay }) {
  const { status, data: session } = useSession();
  const { addToCart } = useCart();
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [ownerAlert, setOwnerAlert] = useState(false);

  const handleAddToCart = (item) => {
    if (status !== 'authenticated') {
      setLoginPrompt(true);
      return;
    }
    if (session?.user?.id && stay.ownerUserId && session.user.id === stay.ownerUserId) {
      setOwnerAlert(true);
      return;
    }
    addToCart(stay, item);
  };

  const groupedMenu = useMemo(() => {
    const items = Array.isArray(stay.menuItems) ? stay.menuItems : [];
    const roomItems = items.filter((item) => item.category === 'room');
    const availableRoomPrices = roomItems
      .filter((item) => item.available !== false)
      .map((item) => Number(item.price))
      .filter((price) => Number.isFinite(price) && price > 0);
    const allRoomPrices = roomItems
      .map((item) => Number(item.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    return {
      rooms: roomItems,
      foods: items.filter((item) => item.category === 'food'),
      cheapestRoomPrice: availableRoomPrices.length > 0
        ? Math.min(...availableRoomPrices)
        : (allRoomPrices.length > 0 ? Math.min(...allRoomPrices) : null),
    };
  }, [stay.menuItems]);

  const baseRoomPrice = groupedMenu.cheapestRoomPrice;
  const finalPrice = baseRoomPrice && stay.discountPercent > 0
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
          sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(3,4,94,0.86) 0%, rgba(3,4,94,0.3) 58%, rgba(3,4,94,0.04) 100%)',
          }}
        />
        {/* Text on hero */}
        <Box
          sx={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            maxWidth: 1240, mx: 'auto', px: { xs: 2.5, md: 5 }, pb: { xs: 3, md: 4.5 },
          }}
        >
          {/* Badges */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.2, flexWrap: 'wrap' }}>
            <Box
              sx={{
                px: 1.4, py: 0.4, borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize' }}>
                {stay.stayType}
              </Typography>
            </Box>
            {stay.isFeatured && (
              <Box sx={{ px: 1.4, py: 0.4, borderRadius: 1, bgcolor: '#00B4D8' }}>
                <Typography variant="caption" sx={{ color: '#03045E', fontWeight: 800 }}>Featured</Typography>
              </Box>
            )}
            {stay.discountPercent > 0 && (
              <Box
                sx={{
                  px: 1.4, py: 0.4, borderRadius: 1,
                  bgcolor: '#0096C7', display: 'flex', alignItems: 'center', gap: 0.5,
                }}
              >
                <LocalOfferRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>
                  {stay.discountPercent}% off
                </Typography>
              </Box>
            )}
          </Box>

          <Typography
            variant="h3"
            sx={{
              color: '#fff', fontWeight: 700, lineHeight: 1.1,
              fontSize: { xs: '2rem', sm: '2.7rem', md: '3.4rem' },
              fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.045em',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              mb: 1,
            }}
          >
            {stay.name}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <PlaceIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                {stay.location}
              </Typography>
            </Box>
            {stay.avgRating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <StarRoundedIcon sx={{ fontSize: 16, color: '#00B4D8' }} />
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>
                  {Number(stay.avgRating).toFixed(1)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
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
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 18% 12%, rgba(0,180,216,0.24) 0%, transparent 38%), linear-gradient(160deg, #03045E 0%, #023E8A 100%)'
            : theme.palette.background.default,
        })}
      >
        <Container maxWidth="xl">
          {/* Quick stats row */}
          <Box
            sx={(theme) => ({
              display: 'flex', gap: { xs: 2, md: 4 }, flexWrap: 'wrap',
              alignItems: 'center', p: { xs: 2, md: 2.5 }, mb: 3.5, borderRadius: 2,
              bgcolor: 'background.paper', boxShadow: '0 8px 24px rgba(2, 62, 138, 0.1)',
              borderBottom: `1px solid ${theme.palette.divider}`,
            })}
          >
            {finalPrice && (
              <Box>
                <Typography variant="caption" color="text.secondary">From (room only)</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
                  {stay.discountPercent > 0 && (
                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                      NPR {baseRoomPrice.toLocaleString()}
                    </Typography>
                  )}
                  <Typography variant="h5" fontWeight={800} color="primary.main">
                    NPR {finalPrice.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">/night (not incl. food)</Typography>
                </Box>
              </Box>
            )}

            {stay.avgRating && (
              <Box>
                <Typography variant="caption" color="text.secondary">Rating</Typography>
                <StarRow rating={stay.avgRating} count={reviews.length} />
              </Box>
            )}

            {stay.contactPhone && (
              <Box>
                <Typography variant="caption" color="text.secondary">Contact</Typography>
                <Typography variant="body1" fontWeight={600}>{stay.contactPhone}</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 330px' }, gap: { xs: 4, lg: 7 }, alignItems: 'start' }}>
          <Box sx={{ minWidth: 0 }}>
            {ownerAlert && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setOwnerAlert(false)}>
                You cannot book your own stay.
              </Alert>
            )}

            {loginPrompt && status !== 'authenticated' && (
              <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setLoginPrompt(false)}>
                Please{' '}
                <Link
                  href={`/auth/signin?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
                  style={{ fontWeight: 700 }}
                >
                  sign in
                </Link>
                {' '}to place an order.
              </Alert>
            )}

              {stay.description && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>About this stay</Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>{stay.description}</Typography>
                </Box>
              )}

              <Divider sx={{ mb: 4 }} />

              {/* Room Options */}
              <Box id="room-options" sx={{ mb: 4, scrollMarginTop: 96 }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Room Options</Typography>
                {groupedMenu.rooms.length === 0 ? (
                  <Typography color="text.secondary">No room options listed yet.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {groupedMenu.rooms.map((item, index) => {
                      const isUnavailable = item.available === false;
                      return (
                        <Card
                          key={`room-${index}`}
                          sx={(theme) => ({
                            display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, borderRadius: 2,
                            overflow: 'hidden', border: `1px solid ${theme.palette.divider}`,
                            opacity: isUnavailable ? 0.62 : 1,
                          })}
                          elevation={0}
                        >
                          <CardMedia
                            component="img"
                            image={item.imageUrl || DEFAULT_MENU_IMAGE}
                            alt={item.name}
                            sx={{ width: { xs: '100%', sm: 210 }, height: { xs: 210, sm: 168 }, objectFit: 'cover', flexShrink: 0, filter: isUnavailable ? 'grayscale(0.9) blur(1px)' : 'none' }}
                          />
                          <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2 }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, mb: 1.2 }}>{item.description}</Typography>
                              {isUnavailable && (
                                <Chip size="small" color="default" label="Unavailable" sx={{ mb: 1 }} />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body1" fontWeight={700} color="primary.main">
                                NPR {Number(item.price).toLocaleString()}
                              </Typography>
                              <AppButton variant="contained" size="small" disabled={isUnavailable} onClick={() => handleAddToCart(item)}>
                                {isUnavailable ? 'Unavailable' : 'Add to order'}
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

              {/* Food Menu */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Food Menu</Typography>
                {groupedMenu.foods.length === 0 ? (
                  <Typography color="text.secondary">No food options listed yet.</Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid', gap: 2,
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' },
                    }}
                  >
                    {groupedMenu.foods.map((item, index) => (
                      <Card
                        key={`food-${index}`}
                          sx={(theme) => ({ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden', borderRadius: 2 })}
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
                          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.4 }}>{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>{item.description}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography variant="body1" fontWeight={700} color="primary.main">
                              NPR {Number(item.price).toLocaleString()}
                            </Typography>
                            <AppButton variant="outlined" size="small" onClick={() => handleAddToCart(item)}>
                              Add to order
                            </AppButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    </Box>
                  )}
                </Box>

                <ReviewsSection initialReviews={reviews} targetId={stay.id} targetType="stay" />
          </Box>
          <Paper sx={{ display: { xs: 'none', lg: 'block' }, position: 'sticky', top: 88, p: 3, borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary">Plan your stay</Typography>
            {finalPrice ? (
              <>
                <Typography variant="h5" sx={{ mt: 0.4 }}>From NPR {finalPrice.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>/ night, room only</Typography>
              </>
            ) : (
              <Typography variant="h6" sx={{ mt: 0.4 }}>Choose a room below</Typography>
            )}
            <Divider sx={{ my: 2.25 }} />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, mb: 2.25 }}>
              Select a room or meal below. Your order is sent directly to the host for confirmation.
            </Typography>
            <AppButton fullWidth onClick={() => document.getElementById('room-options')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>View rooms</AppButton>
          </Paper>
          </Box>
        </Container>
      </Box>
    </>
  );
}

function TrekDetailView({ trek }) {
  const [hoveredStayId, setHoveredStayId] = useState(null);

  return (
    <>
      <Head>
        <title>{trek.name} | NepalTrex</title>
        <meta name="description" content={trek.description || `${trek.name} detailed itinerary, route and nearby stays.`} />
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
          <Card sx={{ mb: 4, overflow: 'hidden', borderRadius: { xs: 0, sm: 2 }, boxShadow: '0 22px 54px rgba(2, 62, 138, 0.22)' }}>
            <CardMedia
              component="img"
              height="460"
              image={getTrekImage(trek.name)}
              alt={trek.name}
              sx={{ objectFit: 'cover', objectPosition: 'center', height: { xs: 300, sm: 390, md: 460 } }}
            />
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Typography variant="overline" color="text.secondary">Guided route overview</Typography>
              <Typography variant="h3" sx={{ mt: 0.4, mb: 1.5, fontSize: { xs: '2rem', md: '3rem' } }}>
                {trek.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Chip label={trek.region} color="secondary" />
                <Chip label={trek.level} variant="outlined" />
                <Chip label={`${trek.durationDays} days`} variant="outlined" />
                {trek.elevationMinM && trek.elevationMaxM && (
                  <Chip label={`${trek.elevationMinM.toLocaleString()}m - ${trek.elevationMaxM.toLocaleString()}m`} variant="outlined" />
                )}
              </Stack>
              <Typography color="text.secondary" sx={{ maxWidth: 820, lineHeight: 1.75, fontSize: { md: '1.05rem' } }}>
                {trek.description || 'Detailed trek description is coming soon.'}
              </Typography>
            </CardContent>
          </Card>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, mb: 4 }}>
            {[
              ['Duration', `${trek.durationDays} days`],
              ['Difficulty', trek.level],
              ['Elevation', trek.elevationMinM && trek.elevationMaxM ? `${trek.elevationMinM.toLocaleString()}–${trek.elevationMaxM.toLocaleString()}m` : 'Not listed'],
            ].map(([label, value]) => (
              <Paper key={label} sx={{ p: 2.25, borderRadius: 2, boxShadow: 'none' }}>
                <Typography variant="overline" color="text.secondary">{label}</Typography>
                <Typography variant="h6" sx={{ mt: 0.25, textTransform: label === 'Difficulty' ? 'capitalize' : 'none' }}>{value}</Typography>
              </Paper>
            ))}
          </Box>

          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary">Interactive trail map</Typography>
            <Typography variant="h5" sx={{ mt: 0.25, mb: 0.8 }}>
              Route Map
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Hover over a nearby stay card below to highlight it on the map.
            </Typography>
            <Box sx={(theme) => ({ borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' })}>
              <TrekRouteMap
                selectedTrek={{ name: trek.name, routeGeojson: trek.routeGeojson }}
                nearbyStays={trek.nearbyStays}
                hoveredStayId={hoveredStayId}
              />
            </Box>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 2 }}>
            <ReviewsSection initialReviews={trek.reviews || []} targetId={trek.id} targetType="trek" title="Trekker Reviews" />
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary">Rest along the route</Typography>
            <Typography variant="h5" sx={{ mt: 0.25, mb: 0.8 }}>
              Nearby Stays ({trek.nearbyStays.length} within {NEARBY_THRESHOLD_KM} km)
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              Hover a card to pin it on the route map above.
            </Typography>

            {trek.nearbyStays.length === 0 ? (
              <Alert severity="info">No mapped stays are currently near this route.</Alert>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                  },
                }}
              >
                {trek.nearbyStays.map((stay) => (
                  <Card
                    key={stay.id}
                    onMouseEnter={() => setHoveredStayId(stay.id)}
                    onMouseLeave={() => setHoveredStayId(null)}
                    sx={(theme) => ({
                      cursor: 'pointer',
                      overflow: 'hidden', borderRadius: 2,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease, outline-color 0.2s ease',
                      outline: hoveredStayId === stay.id ? '2px solid' : '2px solid transparent',
                      outlineColor: hoveredStayId === stay.id ? theme.palette.primary.main : 'transparent',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 16px 40px rgba(18, 44, 33, 0.18)',
                      },
                    })}
                  >
                    <Link href={`/stays/${stay.slug}`}>
                      <CardMedia
                        component="img"
                        height="210"
                        image={stay.imageUrl || DEFAULT_STAY_IMAGE}
                        alt={stay.name}
                        sx={{ objectFit: 'cover', objectPosition: 'center' }}
                      />
                    </Link>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Link href={`/stays/${stay.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography
                          variant="h6"
                          sx={{ mb: 1, fontSize: '1.08rem', letterSpacing: '-0.018em', '&:hover': { color: 'primary.main' } }}
                        >
                          {stay.name}
                        </Typography>
                      </Link>
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.8 }}>
                        <Chip label={stay.stayType} size="small" color="secondary" />
                        <Chip
                          icon={<PlaceIcon />}
                          label={`${stay.distanceKm.toFixed(1)} km`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {stay.location}
                      </Typography>
                    </CardContent>
                  </Card>
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

    const [stayRows, reviews] = await Promise.all([query(
      `
        SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url, s.contact_phone, s.latitude, s.longitude,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', m.id, 'category', m.category, 'name', m.name, 'description', m.description,
                     'price', m.price, 'imageUrl', m.image_url, 'available', m.available
                   ) ORDER BY m.sort_order, m.created_at
                 ) FILTER (WHERE m.id IS NOT NULL),
                 '[]'::json
               ) AS menu_items
        FROM stays s
        LEFT JOIN menu_items m ON m.stay_id = s.id
        WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
        GROUP BY s.id
      `
    ), getReviews('trek', row.id)]);

    const nearbyStays = stayRows.rows
      .map((stay) => {
        const distanceKm = minDistanceToRouteKm(routeWaypoints, Number(stay.latitude), Number(stay.longitude));
        return {
          id: stay.id,
          name: stay.name,
          slug: stay.slug,
          stayType: stay.stay_type,
          location: stay.location,
          description: stay.description,
          imageUrl: stay.image_url || DEFAULT_STAY_IMAGE,
          menuItems: Array.isArray(stay.menu_items) ? stay.menu_items : [],
          contactPhone: stay.contact_phone || '',
          latitude: stay.latitude,
          longitude: stay.longitude,
          distanceKm,
        };
      })
      .filter((stay) => Number.isFinite(stay.distanceKm) && stay.distanceKm <= NEARBY_THRESHOLD_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      props: {
        pageType: 'trek',
        trek: {
          id: row.id,
          name: row.name,
          durationDays: row.duration_days,
          level: row.level,
          region: row.region,
          description: row.description || '',
          routeGeojson: row.route_geojson,
          elevationMinM: row.elevation_min_m || null,
          elevationMaxM: row.elevation_max_m || null,
          nearbyStays,
          reviews,
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
        ) AS menu_items
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
  const reviews = await getReviews('stay', row.id);

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
        contactPhone: row.contact_phone || '',
        ownerUserId: row.owner_user_id,
        pricePerNight: row.price_per_night ? Number(row.price_per_night) : null,
        isFeatured: Boolean(row.is_featured),
        discountPercent: Number(row.discount_percent || 0),
        avgRating: averageRating(reviews),
        reviews,
      },
    },
  };

}
