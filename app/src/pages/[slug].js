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
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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

function StarRow({ rating, count }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {stars.map((s) => (
        <StarRoundedIcon
          key={s}
          sx={{ fontSize: 18, color: s <= Math.round(Number(rating)) ? '#f59e0b' : 'text.disabled' }}
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

function StayDetailView({ stay }) {
  const router = useRouter();
  const { status, data: session } = useSession();
  const { cart, addToCart, updateItemQuantity, removeFromCart } = useCart();
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [ownerAlert, setOwnerAlert] = useState(false);

  const stayCart = cart[stay.slug] || { items: [] };
  const cartItems = stayCart.items;

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

  const handleUpdateQuantity = (index, quantity) => {
    updateItemQuantity(stay.slug, index, quantity);
  };

  const handleRemoveFromCart = (index) => {
    removeFromCart(stay.slug, index);
  };

  const handleCheckout = () => {
    if (status !== 'authenticated') {
      setLoginPrompt(true);
      return;
    }
    if (session?.user?.id && stay.ownerUserId && session.user.id === stay.ownerUserId) {
      setOwnerAlert(true);
      return;
    }
    if (cartItems.length === 0) return;
    router.push('/stays/checkout');
  };

  const groupedMenu = useMemo(() => {
    const items = Array.isArray(stay.menuItems) ? stay.menuItems : [];
    return {
      rooms: items.filter((item) => item.category === 'room' && item.available !== false),
      foods: items.filter((item) => item.category === 'food' && item.available !== false),
    };
  }, [stay.menuItems]);

  const finalPrice = stay.pricePerNight && stay.discountPercent > 0
    ? Math.round(stay.pricePerNight * (1 - stay.discountPercent / 100))
    : stay.pricePerNight;

  const reviews = Array.isArray(stay.reviews) ? stay.reviews : [];

  return (
    <>
      <Head>
        <title>{stay.name} | NepalTrex</title>
        <meta name="description" content={stay.description} />
      </Head>

      <SiteHeader />

      {/* Hero image */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: 260, sm: 360, md: 460 },
          overflow: 'hidden',
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
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.05) 100%)',
          }}
        />
        {/* Text on hero */}
        <Box
          sx={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            px: { xs: 2, md: 6 }, pb: { xs: 3, md: 4 },
          }}
        >
          {/* Badges */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.2, flexWrap: 'wrap' }}>
            <Box
              sx={{
                px: 1.4, py: 0.4, borderRadius: 999,
                bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize' }}>
                {stay.stayType}
              </Typography>
            </Box>
            {stay.isFeatured && (
              <Box sx={{ px: 1.4, py: 0.4, borderRadius: 999, bgcolor: 'primary.main' }}>
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>Featured</Typography>
              </Box>
            )}
            {stay.discountPercent > 0 && (
              <Box
                sx={{
                  px: 1.4, py: 0.4, borderRadius: 999,
                  bgcolor: '#dc2626', display: 'flex', alignItems: 'center', gap: 0.5,
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
              color: '#fff', fontWeight: 900, lineHeight: 1.15,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.8rem' },
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
                <StarRoundedIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
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
          py: { xs: 3, md: 5 },
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 18% 12%, rgba(64,138,113,0.2) 0%, transparent 38%), linear-gradient(160deg, #1f2937 0%, #1e293b 100%)'
            : theme.palette.background.default,
        })}
      >
        <Container maxWidth="lg">
          {/* Quick stats row */}
          <Box
            sx={(theme) => ({
              display: 'flex', gap: { xs: 2, md: 4 }, flexWrap: 'wrap',
              alignItems: 'center', pb: 2.5, mb: 3.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
            })}
          >
            {finalPrice && (
              <Box>
                <Typography variant="caption" color="text.secondary">From</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
                  {stay.discountPercent > 0 && (
                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                      NPR {stay.pricePerNight.toLocaleString()}
                    </Typography>
                  )}
                  <Typography variant="h5" fontWeight={800} color="primary.main">
                    NPR {finalPrice.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">/night</Typography>
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

          {/* Two-column layout */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} alignItems="flex-start">
            {/* Left column */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {stay.description && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>About this stay</Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>{stay.description}</Typography>
                </Box>
              )}

              <Divider sx={{ mb: 4 }} />

              {/* Room Options */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Room Options</Typography>
                {groupedMenu.rooms.length === 0 ? (
                  <Typography color="text.secondary">No room options listed yet.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {groupedMenu.rooms.map((item, index) => (
                      <Card
                        key={`room-${index}`}
                        sx={(theme) => ({
                          display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                          overflow: 'hidden', border: `1px solid ${theme.palette.divider}`,
                        })}
                        elevation={0}
                      >
                        <CardMedia
                          component="img"
                          image={item.imageUrl || DEFAULT_MENU_IMAGE}
                          alt={item.name}
                          sx={{ width: { xs: '100%', sm: 160 }, height: { xs: 180, sm: 140 }, objectFit: 'cover', flexShrink: 0 }}
                        />
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, mb: 1.2 }}>{item.description}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body1" fontWeight={700} color="primary.main">
                              NPR {Number(item.price).toLocaleString()}
                            </Typography>
                            <AppButton variant="contained" size="small" onClick={() => handleAddToCart(item)}>
                              Add to order
                            </AppButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
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
                        sx={(theme) => ({ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' })}
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
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight={700}>NPR {Number(item.price).toLocaleString()}</Typography>
                            <AppButton variant="outlined" size="small" onClick={() => handleAddToCart(item)}>Add</AppButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Reviews */}
              {reviews.length > 0 && (
                <>
                  <Divider sx={{ mb: 4 }} />
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Typography variant="h5" fontWeight={800}>Guest Reviews</Typography>
                      {stay.avgRating && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <StarRoundedIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                          <Typography variant="h6" fontWeight={700}>{Number(stay.avgRating).toFixed(1)}</Typography>
                          <Typography variant="body2" color="text.secondary">/ 5</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: 'grid', gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' },
                      }}
                    >
                      {reviews.map((review, i) => (
                        <Box
                          key={i}
                          sx={(theme) => ({
                            p: 2.5, borderRadius: 3,
                            border: `1px solid ${theme.palette.divider}`,
                            bgcolor: theme.palette.background.paper,
                          })}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Avatar
                              sx={(theme) => ({
                                width: 44, height: 44, fontWeight: 700,
                                bgcolor: theme.palette.primary.main,
                                fontSize: '1rem',
                              })}
                            >
                              {review.reviewerInitials}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>{review.reviewerName}</Typography>
                              <Box sx={{ display: 'flex', gap: 0.3, mt: 0.2 }}>
                                {[1,2,3,4,5].map((s) => (
                                  <StarRoundedIcon
                                    key={s}
                                    sx={{ fontSize: 14, color: s <= review.rating ? '#f59e0b' : 'text.disabled' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                            &ldquo;{review.comment}&rdquo;
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </>
              )}
            </Box>

            {/* Right column: sticky booking card */}
            <Card
              sx={(theme) => ({
                width: { xs: '100%', lg: 400 },
                flexShrink: 0,
                position: { lg: 'sticky' }, top: 88,
                border: `1px solid ${theme.palette.divider}`,
              })}
              elevation={0}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                {finalPrice && (
                  <Box sx={{ mb: 2.5, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
                      {stay.discountPercent > 0 && (
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                          NPR {stay.pricePerNight.toLocaleString()}
                        </Typography>
                      )}
                      <Typography variant="h5" fontWeight={800} color="primary.main">
                        NPR {finalPrice.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">/night</Typography>
                    </Box>
                    {stay.discountPercent > 0 && (
                      <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600 }}>
                        {stay.discountPercent}% off — limited time
                      </Typography>
                    )}
                  </Box>
                )}

                <Typography variant="h6" sx={{ mb: 0.3 }}>Book / Purchase</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add items from the menu, then confirm your order.
                </Typography>

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

                <Stack spacing={1.5}>
                  {cartItems.length > 0 && (
                    <Stack spacing={1} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        Items in your cart
                      </Typography>
                      {cartItems.map((item, index) => (
                        <Paper key={`${item.menuItemCategory}-${item.menuItemName}-${index}`} variant="outlined" sx={{ p: 1.2 }}>
                          <Typography variant="subtitle2">{item.menuItemName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.menuItemCategory} — NPR {Number(item.unitPrice).toLocaleString()} each
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.8 }}>
                            <TextField
                              label="Qty"
                              type="number"
                              size="small"
                              inputProps={{ min: 1 }}
                              value={item.quantity}
                              onChange={(event) => handleUpdateQuantity(index, event.target.value)}
                              sx={{ width: 90 }}
                            />
                            <AppButton size="small" variant="outlined" color="error" onClick={() => handleRemoveFromCart(index)}>
                              Remove
                            </AppButton>
                          </Stack>
                        </Paper>
                      ))}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">Subtotal for this stay</Typography>
                        <Typography variant="body1" fontWeight={700}>
                          NPR {cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                  
                  <AppButton
                    variant="contained"
                    disabled={cartItems.length === 0}
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout{cartItems.length > 0 ? ` (${cartItems.length} items)` : ''}
                  </AppButton>
                  </AppButton>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
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
          py: 5,
          background:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 18% 12%, rgba(64,138,113,0.34) 0%, transparent 38%), radial-gradient(circle at 82% -6%, rgba(110,142,173,0.34) 0%, transparent 32%), linear-gradient(160deg, #1f2937 0%, #334155 46%, #1e293b 100%)'
              : theme.palette.background.default,
        })}
      >
        <Container maxWidth="lg">
          <Card sx={{ mb: 3 }}>
            <CardMedia
              component="img"
              height="360"
              image={getTrekImage(trek.name)}
              alt={trek.name}
              sx={{ objectFit: 'cover', objectPosition: 'center' }}
            />
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>
                {trek.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1.2, flexWrap: 'wrap' }}>
                <Chip label={trek.region} color="secondary" />
                <Chip label={trek.level} variant="outlined" />
                <Chip label={`${trek.durationDays} days`} variant="outlined" />
                {trek.elevationMinM && trek.elevationMaxM && (
                  <Chip label={`${trek.elevationMinM.toLocaleString()}m - ${trek.elevationMaxM.toLocaleString()}m`} variant="outlined" />
                )}
              </Stack>
              <Typography color="text.secondary">
                {trek.description || 'Detailed trek description is coming soon.'}
              </Typography>
            </CardContent>
          </Card>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 0.8 }}>
              Route Map
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.2 }}>
              Hover over a nearby stay card below to highlight it on the map.
            </Typography>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <TrekRouteMap
                selectedTrek={{ name: trek.name, routeGeojson: trek.routeGeojson }}
                nearbyStays={trek.nearbyStays}
                hoveredStayId={hoveredStayId}
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ mb: 0.8 }}>
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
                  gap: 2,
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
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      outline: hoveredStayId === stay.id ? '2px solid' : '2px solid transparent',
                      outlineColor: hoveredStayId === stay.id ? theme.palette.primary.main : 'transparent',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                      },
                    })}
                  >
                    <Link href={`/stays/${stay.slug}`}>
                      <CardMedia
                        component="img"
                        height="180"
                        image={stay.imageUrl || DEFAULT_STAY_IMAGE}
                        alt={stay.name}
                        sx={{ objectFit: 'cover', objectPosition: 'center' }}
                      />
                    </Link>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Link href={`/stays/${stay.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography
                          variant="h6"
                          sx={{ mb: 0.8, fontSize: '1rem', '&:hover': { textDecoration: 'underline' } }}
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

    const stayRows = await query(
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
    );

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
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'reviewerName', r.reviewer_name, 'reviewerInitials', r.reviewer_initials,
              'rating', r.rating, 'comment', r.comment
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::jsonb
        ) AS reviews,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating
      FROM stays s
      LEFT JOIN menu_items m ON m.stay_id = s.id
      LEFT JOIN stay_reviews r ON r.stay_id = s.id
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
        avgRating: row.avg_rating ? Number(row.avg_rating).toFixed(1) : null,
        reviews: Array.isArray(row.reviews) ? row.reviews : [],
      },
    },
  };

}
