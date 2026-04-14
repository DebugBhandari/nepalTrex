import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { query } from '../lib/db';

const DEFAULT_STAY_IMAGE = 'https://placehold.co/1000x620?text=NepalTrex+Stay';
const DEFAULT_MENU_IMAGE = 'https://placehold.co/600x380?text=Menu+Item';

export default function StayDetailPage({ stay }) {
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
      rooms: items.filter((item) => item.category === 'room'),
      foods: items.filter((item) => item.category === 'food'),
    };
  }, [stay.menuItems]);

  const handleBook = async () => {
    if (!selectedItem) {
      return;
    }

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
              ? 'radial-gradient(circle at 18% 12%, rgba(195,122,84,0.34) 0%, transparent 38%), radial-gradient(circle at 82% -6%, rgba(110,142,173,0.34) 0%, transparent 32%), linear-gradient(160deg, #1f2937 0%, #334155 46%, #1e293b 100%)'
              : theme.palette.background.default,
        })}
      >
        <Container maxWidth="lg">
          <Button
            component={Link}
            href="/"
            startIcon={<HomeIcon />}
            variant="outlined"
            sx={(theme) => ({
              mb: 2,
              color: theme.palette.mode === 'dark' ? '#fff7ed' : theme.palette.text.primary,
              borderColor: theme.palette.mode === 'dark' ? '#fff7ed' : 'rgba(148,163,184,0.45)',
            })}
          >
            Back to Home
          </Button>

          <Card
            sx={(theme) => ({
              mb: 2,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(242,251,249,0.98) 100%)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 22px 44px rgba(15, 23, 42, 0.24)',
            })}
          >
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
                        <Button variant="contained" onClick={() => setSelectedItem(item)}>
                          Book this room
                        </Button>
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
                        <Button variant="contained" onClick={() => setSelectedItem(item)}>
                          Order this item
                        </Button>
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
                  <Button
                    variant="contained"
                    disabled={!selectedItem || !bookingForm.customerName || submitting}
                    onClick={handleBook}
                  >
                    {submitting ? 'Submitting...' : 'Confirm Booking'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

export async function getServerSideProps(context) {
  const slug = context.params?.slug;

  if (!slug) {
    return { notFound: true };
  }

  const result = await query(
    `
      SELECT id, name, slug, stay_type, location, description, image_url, menu_items, contact_phone
      FROM stays
      WHERE slug = $1
      LIMIT 1
    `,
    [slug]
  );

  if (result.rows.length === 0) {
    return { notFound: true };
  }

  const row = result.rows[0];

  return {
    props: {
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
