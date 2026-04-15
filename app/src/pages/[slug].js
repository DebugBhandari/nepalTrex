import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
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
import { getTrekImage, minDistanceToRouteKm, parseRouteWaypoints } from '../lib/treks';

const TrekRouteMap = dynamic(() => import('../components/TrekRouteMap'), { ssr: false });

const DEFAULT_STAY_IMAGE = '/stays/lodge-exterior.jpg';
const DEFAULT_MENU_IMAGE = '/stays/food-thukpa.jpg';
const NEARBY_THRESHOLD_KM = 35;

function StayDetailView({ stay }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    quantity: 1,
    notes: '',
  });

  const groupedMenu = useMemo(() => {
    const items = Array.isArray(stay.menuItems) ? stay.menuItems : [];
    return {
      rooms: items.filter((item) => item.category === 'room' && item.available !== false),
      foods: items.filter((item) => item.category === 'food' && item.available !== false),
    };
  }, [stay.menuItems]);

  const handleBook = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    setBookingStatus('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stayId: stay.id,
          menuItemName: selectedItem.name,
          menuItemCategory: selectedItem.category,
          unitPrice: selectedItem.price,
          quantity: Number(bookingForm.quantity || 1),
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
      setBookingForm({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        quantity: 1,
        notes: '',
      });
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
                        <AppButton variant="contained" onClick={() => setSelectedItem(item)}>
                          Book this room
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
                        <AppButton variant="contained" onClick={() => setSelectedItem(item)}>
                          Order this item
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
                  {selectedItem
                    ? `${selectedItem.name} (${selectedItem.category}) - NPR ${Number(selectedItem.price).toFixed(0)}`
                    : 'Select a room or food item to continue.'}
                </Typography>

                {bookingStatus && (
                  <Alert sx={{ mb: 2 }} severity="info">
                    {bookingStatus}
                  </Alert>
                )}

                <Stack spacing={1.2}>
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
                    label="Quantity"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={bookingForm.quantity}
                    onChange={(event) =>
                      setBookingForm((prev) => ({ ...prev, quantity: Number(event.target.value || 1) }))
                    }
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
                    disabled={!selectedItem || !bookingForm.customerName || submitting}
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
  return (
    <>
      <Head>
        <title>{trek.name} | NepalTrex</title>
        <meta name="description" content={trek.description || `${trek.name} detailed itinerary, route and nearby stays.`} />
      </Head>

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
              GeoJSON waypoints for this trek are always displayed below.
            </Typography>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <TrekRouteMap selectedTrek={{ name: trek.name, routeGeojson: trek.routeGeojson }} />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ mb: 0.8 }}>
              Nearby Stays (within {NEARBY_THRESHOLD_KM} km of route)
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              Only stays around this trek's route coordinates are shown.
            </Typography>

            <Stack spacing={1.5}>
              {trek.nearbyStays.map((stay) => (
                <Card key={stay.id}>
                  <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'center' }}>
                      <Box>
                        <Typography variant="h6">{stay.name}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={stay.stayType} size="small" color="secondary" />
                          <Chip icon={<PlaceIcon />} label={`${stay.distanceKm.toFixed(1)} km from ${stay.location}`} size="small" variant="outlined" />
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <AppButton component={Link} href={`/${stay.slug}`} variant="outlined" size="small" sx={{ height: 36, whiteSpace: 'nowrap' }}>
                          View Stay
                        </AppButton>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {trek.nearbyStays.length === 0 && (
                <Alert severity="info">No mapped stays are currently near this route.</Alert>
              )}
            </Stack>
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
        SELECT id, name, slug, stay_type, location, description, image_url, menu_items, contact_phone, latitude, longitude
        FROM stays
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
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
      SELECT id, name, slug, stay_type, location, description, image_url, menu_items, contact_phone
      FROM stays
      WHERE slug = $1
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
      },
    },
  };
}
