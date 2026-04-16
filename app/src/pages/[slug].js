import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PlaceIcon from '@mui/icons-material/Place';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';
import { getTrekImage, minDistanceToRouteKm, parseRouteWaypoints } from '../lib/treks';

const TrekRouteMap = dynamic(() => import('../components/TrekRouteMap'), { ssr: false });

const DEFAULT_STAY_IMAGE = '/stays/lodge-exterior.jpg';
const DEFAULT_MENU_IMAGE = '/stays/food-thukpa.jpg';
const NEARBY_THRESHOLD_KM = 35;

function StayDetailView({ stay }) {
  const { status, data: session } = useSession();
  const [cartItems, setCartItems] = useState([]);
  const [bookingStatus, setBookingStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [ownerAlert, setOwnerAlert] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });

  useEffect(() => {
    if (status !== 'authenticated') return;

    let active = true;
    fetch('/api/users/profile')
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        const profile = data?.profile || {};
        setBookingForm((prev) => ({
          ...prev,
          customerName: profile.name || prev.customerName,
          customerEmail: profile.email || prev.customerEmail,
        }));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [status]);

  const groupedMenu = useMemo(() => {
    const items = Array.isArray(stay.menuItems) ? stay.menuItems : [];
    return {
      rooms: items.filter((item) => item.category === 'room' && item.available !== false),
      foods: items.filter((item) => item.category === 'food' && item.available !== false),
    };
  }, [stay.menuItems]);

  const addToCart = (item) => {
    if (status !== 'authenticated') {
      setLoginPrompt(true);
      return;
    }
    if (session?.user?.id && stay.ownerUserId && session.user.id === stay.ownerUserId) {
      setOwnerAlert(true);
      return;
    }
    setCartItems((prev) => {
      const idx = prev.findIndex((entry) => entry.menuItemName === item.name && entry.menuItemCategory === item.category);
      if (idx === -1) {
        return [
          ...prev,
          {
            menuItemId: item.id || null,
            menuItemName: item.name,
            menuItemCategory: item.category,
            unitPrice: Number(item.price),
            quantity: 1,
          },
        ];
      }

      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
  };

  const updateCartQuantity = (index, quantity) => {
    setCartItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: Math.max(1, Number(quantity || 1)) };
      return next;
    });
  };

  const removeFromCart = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBook = async () => {
    if (status !== 'authenticated') {
      setLoginPrompt(true);
      return;
    }
    if (session?.user?.id && stay.ownerUserId && session.user.id === stay.ownerUserId) {
      setOwnerAlert(true);
      return;
    }
    if (cartItems.length === 0) return;

    setSubmitting(true);
    setBookingStatus('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stayId: stay.id,
          items: cartItems,
          customerName: bookingForm.customerName,
          customerEmail: bookingForm.customerEmail,
          customerPhone: bookingForm.customerPhone,
          notes: bookingForm.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place booking');
      }

      setBookingStatus('Booking placed successfully. The host will contact you soon.');
      setCartItems([]);
      setBookingForm((prev) => ({
        ...prev,
        customerPhone: '',
        notes: '',
      }));
    } catch (error) {
      setBookingStatus(error.message || 'Failed to place booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{stay.name} | NepalTrex</title>
        <meta name="description" content={stay.description} />
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
          <AppButton component={Link} href="/" startIcon={<HomeIcon />} variant="outlined" sx={{ mb: 2 }}>
            Back to Home
          </AppButton>

          <Card sx={{ mb: 2 }}>
            <CardMedia component="img" height="340" image={stay.imageUrl || DEFAULT_STAY_IMAGE} alt={stay.name} />
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Typography variant="h3" sx={{ mb: 1.5 }}>
                {stay.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Chip color="secondary" label={stay.stayType} />
                <Chip variant="outlined" label={stay.location} />
              </Stack>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {stay.description}
              </Typography>
              {stay.contactPhone && (
                <Typography>
                  <strong>Contact:</strong> {stay.contactPhone}
                </Typography>
              )}
            </CardContent>
          </Card>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" color="text.primary" sx={{ mb: 1 }}>
                Room Options
              </Typography>
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                {groupedMenu.rooms.map((item, index) => (
                  <Card key={`room-${index}`}>
                    <CardMedia component="img" height="180" image={item.imageUrl || DEFAULT_MENU_IMAGE} alt={item.name} />
                    <CardContent>
                      <Typography variant="h6">{item.name}</Typography>
                      <Typography color="text.secondary" sx={{ mb: 1 }}>
                        {item.description}
                      </Typography>
                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                        <Chip label={`NPR ${Number(item.price).toFixed(0)}`} color="secondary" />
                        <AppButton variant="contained" onClick={() => addToCart(item)}>
                          Add to order
                        </AppButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
                {groupedMenu.rooms.length === 0 && (
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary">No room options listed yet.</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>

              <Typography variant="h5" color="text.primary" sx={{ mb: 1 }}>
                Food Menu
              </Typography>
              <Stack spacing={1.5}>
                {groupedMenu.foods.map((item, index) => (
                  <Card key={`food-${index}`}>
                    <CardMedia component="img" height="180" image={item.imageUrl || DEFAULT_MENU_IMAGE} alt={item.name} />
                    <CardContent>
                      <Typography variant="h6">{item.name}</Typography>
                      <Typography color="text.secondary" sx={{ mb: 1 }}>
                        {item.description}
                      </Typography>
                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                        <Chip label={`NPR ${Number(item.price).toFixed(0)}`} color="secondary" />
                        <AppButton variant="contained" onClick={() => addToCart(item)}>
                          Add to order
                        </AppButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
                {groupedMenu.foods.length === 0 && (
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary">No food options listed yet.</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Box>

            <Card sx={{ width: { xs: '100%', lg: 390 }, position: { lg: 'sticky' }, top: 88 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Book / Purchase
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Add one or more items from this stay, then confirm in one order.
                </Typography>

                {ownerAlert && (
                  <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    onClose={() => setOwnerAlert(false)}
                  >
                    You cannot create orders in your own stay.
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
                      href={`/auth/signin?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
                      style={{ fontWeight: 700 }}
                    >
                      sign in
                    </Link>
                    {' '}to place an order.
                  </Alert>
                )}

                {bookingStatus && (
                  <Alert sx={{ mb: 2 }} severity="info">
                    {bookingStatus}
                  </Alert>
                )}

                <Stack spacing={1.2}>
                  {cartItems.length > 0 && (
                    <Stack spacing={1} sx={{ mb: 0.6 }}>
                      {cartItems.map((item, index) => (
                        <Paper key={`${item.menuItemCategory}-${item.menuItemName}-${index}`} variant="outlined" sx={{ p: 1.1 }}>
                          <Typography variant="subtitle2">{item.menuItemName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.menuItemCategory} - NPR {Number(item.unitPrice).toFixed(0)} each
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.8 }}>
                            <TextField
                              label="Qty"
                              type="number"
                              size="small"
                              inputProps={{ min: 1 }}
                              value={item.quantity}
                              onChange={(event) => updateCartQuantity(index, event.target.value)}
                              sx={{ width: 90 }}
                            />
                            <AppButton size="small" variant="outlined" color="error" onClick={() => removeFromCart(index)}>
                              Remove
                            </AppButton>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}

                  <TextField
                    label="Your Name"
                    value={bookingForm.customerName}
                    onChange={(event) => setBookingForm((prev) => ({ ...prev, customerName: event.target.value }))}
                  />
                  <TextField
                    label="Email (optional)"
                    value={bookingForm.customerEmail}
                    onChange={(event) => setBookingForm((prev) => ({ ...prev, customerEmail: event.target.value }))}
                  />
                  <TextField
                    label="Phone"
                    value={bookingForm.customerPhone}
                    onChange={(event) => setBookingForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                  />
                  <TextField
                    label="Notes (optional)"
                    multiline
                    minRows={3}
                    value={bookingForm.notes}
                    onChange={(event) => setBookingForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                  <AppButton
                    variant="contained"
                    disabled={cartItems.length === 0 || !bookingForm.customerName || submitting}
                    onClick={handleBook}
                  >
                    {submitting ? 'Submitting...' : 'Confirm Booking'}
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
          <AppButton component={Link} href="/" startIcon={<HomeIcon />} variant="outlined" sx={{ mb: 2 }}>
            Back to Home
          </AppButton>

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
      SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url, s.contact_phone, s.owner_user_id,
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
      },
    },
  };
}
