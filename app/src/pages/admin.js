import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { authOptions } from '../lib/auth-options';
import { query } from '../lib/db';

const STAY_TYPES = ['hotel', 'homestay'];

function makeSlug(input) {
  return input
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .replace(/-+/g, '-');
}

export default function AdminPage({ user, initialStays }) {
  const [stays, setStays] = useState(initialStays);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');
  const [creating, setCreating] = useState(false);

  const [newStay, setNewStay] = useState({
    name: '',
    slug: '',
    stayType: 'homestay',
    location: '',
    description: '',
    pricePerNight: 0,
    contactPhone: '',
  });

  const updateDraft = (id, field, value) => {
    setStays((prev) => prev.map((stay) => (stay.id === id ? { ...stay, [field]: value } : stay)));
  };

  const createStay = async () => {
    setCreating(true);
    setMessage('');

    try {
      const payload = {
        ...newStay,
        slug: newStay.slug.trim() || makeSlug(newStay.name),
      };

      const response = await fetch('/api/stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create stay');
      }

      setStays((prev) => [
        {
          id: data.stay.id,
          name: data.stay.name,
          slug: data.stay.slug,
          stayType: data.stay.stay_type,
          location: data.stay.location,
          description: data.stay.description,
          pricePerNight: data.stay.price_per_night,
          contactPhone: data.stay.contact_phone || '',
          ownerEmail: data.stay.owner_email || null,
        },
        ...prev,
      ]);

      setMessage('Stay registered successfully.');
      setNewStay({
        name: '',
        slug: '',
        stayType: 'homestay',
        location: '',
        description: '',
        pricePerNight: 0,
        contactPhone: '',
      });
    } catch (error) {
      setMessage(error.message || 'Failed to create stay');
    } finally {
      setCreating(false);
    }
  };

  const updateStay = async (stay) => {
    setSavingId(stay.id);
    setMessage('');

    try {
      const response = await fetch(`/api/stays/${stay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stay),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update stay');
      }

      setStays((prev) =>
        prev.map((entry) =>
          entry.id === stay.id
            ? {
                ...entry,
                name: data.stay.name,
                slug: data.stay.slug,
                stayType: data.stay.stay_type,
                location: data.stay.location,
                description: data.stay.description,
                pricePerNight: data.stay.price_per_night,
                contactPhone: data.stay.contact_phone || '',
              }
            : entry
        )
      );
      setMessage(`Updated ${data.stay.name}.`);
    } catch (error) {
      setMessage(error.message || 'Failed to update stay');
    } finally {
      setSavingId('');
    }
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard | NepalTrex</title>
      </Head>

      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(90deg, rgba(10,34,37,0.94) 0%, rgba(19,59,63,0.94) 100%)',
          color: '#f8f4eb',
          borderBottom: '1px solid rgba(240,180,41,0.24)',
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <Button component={Link} href="/" startIcon={<HomeIcon />} variant="outlined" sx={{ mr: 1 }}>
            Home
          </Button>
          <Button onClick={() => signOut({ callbackUrl: '/' })} startIcon={<LogoutIcon />} variant="outlined">
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            background: 'linear-gradient(145deg, #ffffff 0%, #f2faf6 100%)',
            border: '1px solid rgba(23,59,63,0.14)',
          }}
        >
          <Typography variant="h4">Manage Your Hotels and Homestays</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Signed in as {user.email} ({user.role})
          </Typography>

          {message && (
            <Alert sx={{ mt: 2 }} severity="info">
              {message}
            </Alert>
          )}

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Register New Stay
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="Name"
                  value={newStay.name}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, name: event.target.value }))}
                />
                <TextField
                  label="Slug (optional)"
                  helperText="If empty, slug is auto-generated from name"
                  value={newStay.slug}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, slug: event.target.value }))}
                />
                <FormControl size="small">
                  <InputLabel id="new-stay-type">Type</InputLabel>
                  <Select
                    labelId="new-stay-type"
                    label="Type"
                    value={newStay.stayType}
                    onChange={(event) => setNewStay((prev) => ({ ...prev, stayType: event.target.value }))}
                  >
                    {STAY_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Location"
                  value={newStay.location}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, location: event.target.value }))}
                />
                <TextField
                  label="Description"
                  multiline
                  minRows={3}
                  value={newStay.description}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, description: event.target.value }))}
                />
                <TextField
                  label="Price per night (NPR)"
                  type="number"
                  value={newStay.pricePerNight}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, pricePerNight: Number(event.target.value || 0) }))}
                />
                <TextField
                  label="Contact phone"
                  value={newStay.contactPhone}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, contactPhone: event.target.value }))}
                />
                <Button variant="contained" onClick={createStay} disabled={creating}>
                  {creating ? 'Registering...' : 'Register Stay'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Typography variant="h6" sx={{ mt: 3, mb: 1.5 }}>
            Your Registered Stays
          </Typography>

          <Stack spacing={2}>
            {stays.map((stay) => (
              <Card key={stay.id}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                      <Typography variant="subtitle1">{stay.name}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip size="small" color="secondary" label={stay.stayType} />
                        {stay.ownerEmail && <Chip size="small" variant="outlined" label={stay.ownerEmail} />}
                      </Stack>
                    </Stack>
                    <TextField
                      label="Name"
                      value={stay.name}
                      onChange={(event) => updateDraft(stay.id, 'name', event.target.value)}
                    />
                    <TextField
                      label="Slug"
                      value={stay.slug}
                      onChange={(event) => updateDraft(stay.id, 'slug', event.target.value)}
                    />
                    <FormControl size="small">
                      <InputLabel id={`type-${stay.id}`}>Type</InputLabel>
                      <Select
                        labelId={`type-${stay.id}`}
                        label="Type"
                        value={stay.stayType}
                        onChange={(event) => updateDraft(stay.id, 'stayType', event.target.value)}
                      >
                        {STAY_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Location"
                      value={stay.location}
                      onChange={(event) => updateDraft(stay.id, 'location', event.target.value)}
                    />
                    <TextField
                      label="Description"
                      multiline
                      minRows={3}
                      value={stay.description}
                      onChange={(event) => updateDraft(stay.id, 'description', event.target.value)}
                    />
                    <TextField
                      label="Price per night (NPR)"
                      type="number"
                      value={stay.pricePerNight}
                      onChange={(event) => updateDraft(stay.id, 'pricePerNight', Number(event.target.value || 0))}
                    />
                    <TextField
                      label="Contact phone"
                      value={stay.contactPhone || ''}
                      onChange={(event) => updateDraft(stay.id, 'contactPhone', event.target.value)}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button variant="contained" onClick={() => updateStay(stay)} disabled={savingId === stay.id}>
                        {savingId === stay.id ? 'Saving...' : 'Save Stay'}
                      </Button>
                      <Button component={Link} href={`/${stay.slug}`} variant="outlined" target="_blank">
                        View Public Page
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {stays.length === 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography color="text.secondary">No stays yet. Register your first stay above.</Typography>
              </Paper>
            )}
          </Stack>
        </Paper>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=%2Fadmin',
        permanent: false,
      },
    };
  }

  if (!['admin', 'superUser'].includes(session.user.role || '')) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const isSuper = session.user.role === 'superUser';

  const rows = isSuper
    ? await query(
        `
          SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.price_per_night, s.contact_phone,
                 u.email AS owner_email
          FROM stays s
          JOIN users u ON u.id = s.owner_user_id
          ORDER BY s.created_at DESC
        `
      )
    : await query(
        `
          SELECT id, name, slug, stay_type, location, description, price_per_night, contact_phone
          FROM stays
          WHERE owner_user_id = $1
          ORDER BY created_at DESC
        `,
        [session.user.id]
      );

  const initialStays = rows.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    stayType: row.stay_type,
    location: row.location,
    description: row.description,
    pricePerNight: row.price_per_night,
    contactPhone: row.contact_phone || '',
    ownerEmail: row.owner_email || null,
  }));

  return {
    props: {
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      initialStays,
    },
  };
}
