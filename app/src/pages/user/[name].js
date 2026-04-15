import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Alert, Avatar, Box, Card, CardContent, Chip, Container, Stack, TextField, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AppButton from '../../components/AppButton';
import { query } from '../../lib/db';

function normalizeHandle(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

export default function UserProfilePage({ profile, wishlistItems }) {
  const { data: session } = useSession();
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile.name || '');
  const [imageUrl, setImageUrl] = useState(profile.imageUrl || '');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`/api/users/${profile.email}/orders`);
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [profile.email]);

  const ownProfile = session?.user?.id && session.user.id === profile.id;
  const defaultGoogleImage = profile.provider === 'google' ? session?.user?.image || '' : '';
  const effectiveImage = imageUrl || defaultGoogleImage || '';

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    setStatusMessage('');

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          imageDataUrl: imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setImageUrl(data.profile.imageUrl || '');
      setDisplayName(data.profile.name || displayName);
      setStatusMessage('Profile updated successfully.');
    } catch (error) {
      setStatusMessage(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>{profile.name || profile.username || 'User'} | NepalTrex</title>
      </Head>

      <Box sx={(theme) => ({ minHeight: '100vh', py: 4, background: theme.palette.background.default })}>
        <Container maxWidth="md">
          <AppButton component={Link} href="/" startIcon={<HomeIcon />} variant="outlined" sx={{ mb: 2 }}>
            Back to Home
          </AppButton>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Avatar src={effectiveImage || undefined} sx={{ width: 88, height: 88 }}>
                  {(profile.name || profile.username || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4">{displayName || profile.username || 'User'}</Typography>
                  <Typography color="text.secondary">@{profile.handle}</Typography>
                  <Typography color="text.secondary">{profile.email}</Typography>
                </Box>
              </Stack>

              {statusMessage && (
                <Alert sx={{ mt: 2 }} severity="info">
                  {statusMessage}
                </Alert>
              )}

              {ownProfile && (
                <Stack spacing={1.2} sx={{ mt: 2 }}>
                  <TextField
                    label="Display Name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    fullWidth
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                    <AppButton variant="outlined" component="label">
                      Upload Profile Picture
                      <input hidden type="file" accept="image/*" onChange={uploadImage} />
                    </AppButton>
                    {profile.provider === 'google' && (
                      <Typography variant="caption" color="text.secondary">
                        Google photo is used by default until you upload your own.
                      </Typography>
                    )}
                  </Stack>

                  <AppButton variant="contained" onClick={saveProfile} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
                    {saving ? 'Saving...' : 'Save Profile'}
                  </AppButton>
                </Stack>
              )}
            </CardContent>
          </Card>

          {orders.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 1.5 }}>Your Orders</Typography>

                <Stack spacing={1.5}>
                  {orders.map((order) => (
                    <Card key={order.id} variant="outlined">
                      <CardContent>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={1.5}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1">{order.stayName || 'N/A'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </Typography>
                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                              {order.items.map((item, idx) => (
                                <Typography key={idx} variant="body2" color="text.secondary">
                                  {item.menuItemName} × {item.quantity}
                                </Typography>
                              ))}
                            </Stack>
                          </Box>

                          <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
                            <Chip 
                              label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              color={order.status === 'completed' ? 'success' : 'default'}
                              variant="outlined"
                              size="small"
                            />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Rs. {order.totalPrice.toLocaleString()}
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 1.2 }}>Wishlist</Typography>

              <Stack spacing={1.1}>
                {wishlistItems.map((item) => (
                  <Card key={item.slug} variant="outlined">
                    <CardContent sx={{ py: 1.2, '&:last-child': { pb: 1.2 } }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                        <Box>
                          <Typography variant="subtitle1">{item.name || item.slug}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.region ? `${item.region} · ` : ''}{item.level || 'Unknown difficulty'}{item.durationDays ? ` · ${item.durationDays} days` : ''}
                          </Typography>
                        </Box>
                        <AppButton component={Link} href={`/treks/${item.slug}`} variant="outlined" size="small">
                          Open Trek
                        </AppButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                {wishlistItems.length === 0 && (
                  <Typography color="text.secondary">No wishlist items yet.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}

export async function getServerSideProps(context) {
  const requestedHandle = normalizeHandle(context.params?.name || '');

  if (!requestedHandle) {
    return { notFound: true };
  }

  const userResult = await query(
    `
      SELECT id, username, email, display_name, role, provider, profile_image_url
      FROM users
      WHERE trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(username, ''), NULLIF(display_name, ''), split_part(COALESCE(email, ''), '@', 1))), '[^a-z0-9]+', '-', 'g')) = $1
      LIMIT 1
    `,
    [requestedHandle]
  );

  if (userResult.rows.length === 0) {
    return { notFound: true };
  }

  const row = userResult.rows[0];
  const baseName = row.username || row.display_name || (row.email || '').split('@')[0] || 'user';
  const handle = normalizeHandle(baseName);

  const wishlistResult = await query(
    `
      SELECT
        w.trek_slug,
        t.name,
        t.duration_days,
        t.level,
        t.region
      FROM user_trek_wishlists w
      LEFT JOIN treks t ON trim(both '-' from regexp_replace(lower(t.name), '[^a-z0-9]+', '-', 'g')) = w.trek_slug
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `,
    [row.id]
  );

  return {
    props: {
      profile: {
        id: row.id,
        username: row.username || '',
        name: row.display_name || row.username || '',
        email: row.email || '',
        role: row.role || 'user',
        provider: row.provider || 'credentials',
        imageUrl: row.profile_image_url || '',
        handle,
      },
      wishlistItems: wishlistResult.rows.map((item) => ({
        slug: item.trek_slug,
        name: item.name || item.trek_slug,
        durationDays: item.duration_days || null,
        level: item.level || '',
        region: item.region || '',
      })),
    },
  };
}
