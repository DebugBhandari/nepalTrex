import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import {
  Alert,
  AppBar,
  Box,
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
import AppButton from '../components/AppButton';

const STAY_TYPES = ['hotel', 'homestay'];
const MENU_CATEGORIES = ['room', 'food'];
const DEFAULT_STAY_IMAGE = 'https://placehold.co/1000x620?text=NepalTrex+Stay';
const DEFAULT_MENU_IMAGE = 'https://placehold.co/600x380?text=Menu+Item';

function makeSlug(input) {
  return input
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .replace(/-+/g, '-');
}

function newMenuItem(category = 'room') {
  return {
    category,
    name: '',
    description: '',
    price: 0,
    imageUrl: DEFAULT_MENU_IMAGE,
  };
}

function normalizeMenuItems(items) {
  return (items || []).map((item) => ({
    category: item.category,
    name: item.name,
    description: item.description || '',
    price: Number(item.price || 0),
    imageUrl: item.imageUrl || DEFAULT_MENU_IMAGE,
  }));
}

export default function AdminPage({ user, initialStays }) {
  const [stays, setStays] = useState(initialStays);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingById, setEditingById] = useState({});

  const [newStay, setNewStay] = useState({
    name: '',
    slug: '',
    stayType: 'homestay',
    location: '',
    latitude: '',
    longitude: '',
    description: '',
    imageUrl: DEFAULT_STAY_IMAGE,
    contactPhone: '',
    menuItems: [newMenuItem('room'), newMenuItem('food')],
  });

  const updateDraft = (id, field, value) => {
    setStays((prev) => prev.map((stay) => (stay.id === id ? { ...stay, [field]: value } : stay)));
  };

  const updateStayMenuItem = (stayId, index, field, value) => {
    setStays((prev) =>
      prev.map((stay) => {
        if (stay.id !== stayId) {
          return stay;
        }

        const nextMenu = [...(stay.menuItems || [])];
        nextMenu[index] = {
          ...nextMenu[index],
          [field]: value,
        };

        return { ...stay, menuItems: nextMenu };
      })
    );
  };

  const addStayMenuItem = (stayId, category) => {
    setStays((prev) =>
      prev.map((stay) =>
        stay.id === stayId
          ? {
              ...stay,
              menuItems: [...(stay.menuItems || []), newMenuItem(category)],
            }
          : stay
      )
    );
  };

  const removeStayMenuItem = (stayId, index) => {
    setStays((prev) =>
      prev.map((stay) => {
        if (stay.id !== stayId) {
          return stay;
        }

        const nextMenu = (stay.menuItems || []).filter((_, itemIndex) => itemIndex !== index);
        return { ...stay, menuItems: nextMenu.length > 0 ? nextMenu : [newMenuItem('room')] };
      })
    );
  };

  const updateNewMenuItem = (index, field, value) => {
    setNewStay((prev) => {
      const nextMenu = [...prev.menuItems];
      nextMenu[index] = {
        ...nextMenu[index],
        [field]: value,
      };

      return { ...prev, menuItems: nextMenu };
    });
  };

  const addNewMenuItem = (category) => {
    setNewStay((prev) => ({
      ...prev,
      menuItems: [...prev.menuItems, newMenuItem(category)],
    }));
  };

  const removeNewMenuItem = (index) => {
    setNewStay((prev) => {
      const nextMenu = prev.menuItems.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        menuItems: nextMenu.length > 0 ? nextMenu : [newMenuItem('room')],
      };
    });
  };

  const createStay = async () => {
    setCreating(true);
    setMessage('');

    try {
      const payload = {
        ...newStay,
        slug: newStay.slug.trim() || makeSlug(newStay.name),
        latitude: newStay.latitude === '' ? null : Number(newStay.latitude),
        longitude: newStay.longitude === '' ? null : Number(newStay.longitude),
        menuItems: normalizeMenuItems(newStay.menuItems),
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
          latitude: data.stay.latitude ?? '',
          longitude: data.stay.longitude ?? '',
          description: data.stay.description,
          imageUrl: data.stay.image_url || DEFAULT_STAY_IMAGE,
          menuItems: data.stay.menu_items || [],
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
        latitude: '',
        longitude: '',
        description: '',
        imageUrl: DEFAULT_STAY_IMAGE,
        contactPhone: '',
        menuItems: [newMenuItem('room'), newMenuItem('food')],
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
        body: JSON.stringify({
          ...stay,
          latitude: stay.latitude === '' ? null : Number(stay.latitude),
          longitude: stay.longitude === '' ? null : Number(stay.longitude),
          menuItems: normalizeMenuItems(stay.menuItems),
        }),
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
                latitude: data.stay.latitude ?? '',
                longitude: data.stay.longitude ?? '',
                description: data.stay.description,
                imageUrl: data.stay.image_url || DEFAULT_STAY_IMAGE,
                menuItems: data.stay.menu_items || [],
                contactPhone: data.stay.contact_phone || '',
              }
            : entry
        )
      );
      setEditingById((prev) => ({ ...prev, [stay.id]: false }));
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
        sx={{}}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <AppButton component={Link} href="/" startIcon={<HomeIcon />} variant="outlined" sx={{ mr: 1 }}>
            Home
          </AppButton>
          <AppButton onClick={() => signOut({ callbackUrl: '/' })} startIcon={<LogoutIcon />} variant="outlined">
            Sign out
          </AppButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper
          sx={(theme) => ({
            p: { xs: 2, md: 3 },
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f2fbf9 100%)',
          })}
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Latitude"
                    type="number"
                    value={newStay.latitude}
                    onChange={(event) => setNewStay((prev) => ({ ...prev, latitude: event.target.value }))}
                  />
                  <TextField
                    label="Longitude"
                    type="number"
                    value={newStay.longitude}
                    onChange={(event) => setNewStay((prev) => ({ ...prev, longitude: event.target.value }))}
                  />
                </Stack>
                <TextField
                  label="Description"
                  multiline
                  minRows={3}
                  value={newStay.description}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, description: event.target.value }))}
                />
                <TextField
                  label="Generic Stay Image URL"
                  value={newStay.imageUrl}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, imageUrl: event.target.value }))}
                />
                <TextField
                  label="Contact phone"
                  value={newStay.contactPhone}
                  onChange={(event) => setNewStay((prev) => ({ ...prev, contactPhone: event.target.value }))}
                />

                <Typography variant="subtitle1" sx={{ mt: 1 }}>
                  Rooms and Foods Menu
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <AppButton variant="outlined" startIcon={<AddIcon />} onClick={() => addNewMenuItem('room')}>
                    Add Room Option
                  </AppButton>
                  <AppButton variant="outlined" startIcon={<AddIcon />} onClick={() => addNewMenuItem('food')}>
                    Add Food Item
                  </AppButton>
                </Stack>

                {(newStay.menuItems || []).map((item, index) => (
                  <Paper key={`new-menu-${index}`} sx={{ p: 1.5, border: '1px solid #e5e7eb' }}>
                    <Stack spacing={1}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                        <Chip size="small" color="secondary" label={`Menu #${index + 1}`} />
                        <AppButton
                          size="small"
                          color="error"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => removeNewMenuItem(index)}
                        >
                          Remove
                        </AppButton>
                      </Stack>
                      <FormControl size="small">
                        <InputLabel id={`new-menu-cat-${index}`}>Category</InputLabel>
                        <Select
                          labelId={`new-menu-cat-${index}`}
                          label="Category"
                          value={item.category}
                          onChange={(event) => updateNewMenuItem(index, 'category', event.target.value)}
                        >
                          {MENU_CATEGORIES.map((category) => (
                            <MenuItem key={category} value={category}>
                              {category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Item Name"
                        value={item.name}
                        onChange={(event) => updateNewMenuItem(index, 'name', event.target.value)}
                      />
                      <TextField
                        label="Description"
                        value={item.description}
                        onChange={(event) => updateNewMenuItem(index, 'description', event.target.value)}
                      />
                      <TextField
                        label="Price (NPR)"
                        type="number"
                        value={item.price}
                        onChange={(event) => updateNewMenuItem(index, 'price', Number(event.target.value || 0))}
                      />
                      <TextField
                        label="Generic Menu Image URL"
                        value={item.imageUrl || DEFAULT_MENU_IMAGE}
                        onChange={(event) => updateNewMenuItem(index, 'imageUrl', event.target.value)}
                      />
                    </Stack>
                  </Paper>
                ))}

                <AppButton variant="contained" onClick={createStay} disabled={creating}>
                  {creating ? 'Registering...' : 'Register Stay'}
                </AppButton>
              </Stack>
            </CardContent>
          </Card>

          <Typography variant="h6" sx={{ mt: 3, mb: 1.5 }}>
            Your Registered Stays
          </Typography>

          <Stack spacing={2}>
            {stays.map((stay) => {
              const isEditing = Boolean(editingById[stay.id]);
              const isSaving = savingId === stay.id;

              return (
                <Card key={stay.id}>
                  <CardContent>
                    {!isEditing ? (
                      /* ── Collapsed summary ── */
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ sm: 'center' }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {stay.name}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.8}
                            sx={{ mt: 0.8, flexWrap: 'wrap', gap: 0.5 }}
                          >
                            <Chip size="small" color="secondary" label={stay.stayType} />
                            {stay.location && <Chip size="small" variant="outlined" label={stay.location} />}
                            {stay.latitude !== '' && stay.longitude !== '' && (
                              <Chip size="small" variant="outlined" label={`${stay.latitude}, ${stay.longitude}`} />
                            )}
                            {stay.ownerEmail && (
                              <Chip size="small" variant="outlined" label={stay.ownerEmail} />
                            )}
                          </Stack>
                        </Box>
                        <AppButton
                          variant="outlined"
                          onClick={() => setEditingById((prev) => ({ ...prev, [stay.id]: true }))}
                        >
                          Edit
                        </AppButton>
                      </Stack>
                    ) : (
                      /* ── Expanded edit form ── */
                      <Stack spacing={1.5}>
                        <TextField
                          label="Name"
                          value={stay.name}
                          onChange={(event) => updateDraft(stay.id, 'name', event.target.value)}
                          disabled={isSaving}
                        />
                        <TextField
                          label="Slug"
                          value={stay.slug}
                          onChange={(event) => updateDraft(stay.id, 'slug', event.target.value)}
                          disabled={isSaving}
                        />
                        <FormControl size="small" disabled={isSaving}>
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
                          disabled={isSaving}
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <TextField
                            label="Latitude"
                            type="number"
                            value={stay.latitude}
                            onChange={(event) => updateDraft(stay.id, 'latitude', event.target.value)}
                            disabled={isSaving}
                          />
                          <TextField
                            label="Longitude"
                            type="number"
                            value={stay.longitude}
                            onChange={(event) => updateDraft(stay.id, 'longitude', event.target.value)}
                            disabled={isSaving}
                          />
                        </Stack>
                        <TextField
                          label="Description"
                          multiline
                          minRows={3}
                          value={stay.description}
                          onChange={(event) => updateDraft(stay.id, 'description', event.target.value)}
                          disabled={isSaving}
                        />
                        <TextField
                          label="Generic Stay Image URL"
                          value={stay.imageUrl || DEFAULT_STAY_IMAGE}
                          onChange={(event) => updateDraft(stay.id, 'imageUrl', event.target.value)}
                          disabled={isSaving}
                        />
                        <TextField
                          label="Contact phone"
                          value={stay.contactPhone || ''}
                          onChange={(event) => updateDraft(stay.id, 'contactPhone', event.target.value)}
                          disabled={isSaving}
                        />

                        <Typography variant="subtitle2">Menu Options</Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <AppButton
                            variant="outlined"
                            size="small"
                            onClick={() => addStayMenuItem(stay.id, 'room')}
                            disabled={isSaving}
                          >
                            Add Room Option
                          </AppButton>
                          <AppButton
                            variant="outlined"
                            size="small"
                            onClick={() => addStayMenuItem(stay.id, 'food')}
                            disabled={isSaving}
                          >
                            Add Food Item
                          </AppButton>
                        </Stack>

                        {(stay.menuItems || []).map((item, index) => (
                          <Paper
                            key={`${stay.id}-menu-${index}`}
                            sx={{ p: 1.5, border: '1px solid #e5e7eb' }}
                          >
                            <Stack spacing={1}>
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1}
                                justifyContent="space-between"
                              >
                                <Chip size="small" label={`Item #${index + 1}`} />
                                <AppButton
                                  size="small"
                                  color="error"
                                  startIcon={<DeleteOutlineIcon />}
                                  onClick={() => removeStayMenuItem(stay.id, index)}
                                  disabled={isSaving}
                                >
                                  Remove
                                </AppButton>
                              </Stack>
                              <FormControl size="small" disabled={isSaving}>
                                <InputLabel id={`${stay.id}-menu-cat-${index}`}>Category</InputLabel>
                                <Select
                                  labelId={`${stay.id}-menu-cat-${index}`}
                                  label="Category"
                                  value={item.category}
                                  onChange={(event) =>
                                    updateStayMenuItem(stay.id, index, 'category', event.target.value)
                                  }
                                >
                                  {MENU_CATEGORIES.map((category) => (
                                    <MenuItem key={category} value={category}>
                                      {category}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <TextField
                                label="Item Name"
                                value={item.name}
                                onChange={(event) =>
                                  updateStayMenuItem(stay.id, index, 'name', event.target.value)
                                }
                                disabled={isSaving}
                              />
                              <TextField
                                label="Description"
                                value={item.description || ''}
                                onChange={(event) =>
                                  updateStayMenuItem(stay.id, index, 'description', event.target.value)
                                }
                                disabled={isSaving}
                              />
                              <TextField
                                label="Price (NPR)"
                                type="number"
                                value={item.price}
                                onChange={(event) =>
                                  updateStayMenuItem(
                                    stay.id,
                                    index,
                                    'price',
                                    Number(event.target.value || 0)
                                  )
                                }
                                disabled={isSaving}
                              />
                              <TextField
                                label="Generic Menu Image URL"
                                value={item.imageUrl || DEFAULT_MENU_IMAGE}
                                onChange={(event) =>
                                  updateStayMenuItem(stay.id, index, 'imageUrl', event.target.value)
                                }
                                disabled={isSaving}
                              />
                            </Stack>
                          </Paper>
                        ))}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <AppButton
                            variant="contained"
                            onClick={() => updateStay(stay)}
                            disabled={isSaving}
                          >
                            {isSaving ? 'Saving...' : 'Save Stay'}
                          </AppButton>
                          <AppButton
                            component={Link}
                            href={`/${stay.slug}`}
                            variant="outlined"
                            target="_blank"
                          >
                            View Public Page
                          </AppButton>
                          <AppButton
                            variant="outlined"
                            onClick={() =>
                              setEditingById((prev) => ({ ...prev, [stay.id]: false }))
                            }
                            disabled={isSaving}
                          >
                            Cancel
                          </AppButton>
                        </Stack>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {stays.length === 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography color="text.secondary">
                  No stays yet. Register your first stay above.
                </Typography>
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
          SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description,
               s.image_url, s.menu_items, s.contact_phone, s.latitude, s.longitude, u.email AS owner_email
          FROM stays s
          JOIN users u ON u.id = s.owner_user_id
          ORDER BY s.created_at DESC
        `
      )
    : await query(
        `
          SELECT id, name, slug, stay_type, location, description, image_url, menu_items, contact_phone
               , latitude, longitude
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
    latitude: row.latitude ?? '',
    longitude: row.longitude ?? '',
    description: row.description,
    imageUrl: row.image_url || DEFAULT_STAY_IMAGE,
    menuItems: Array.isArray(row.menu_items) ? row.menu_items : [],
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
