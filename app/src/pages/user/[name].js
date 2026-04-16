import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import { signOut, useSession } from 'next-auth/react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import AppButton from '../../components/AppButton';
import { authOptions } from '../../lib/auth-options';
import NepalTrexLogo from '../../components/NepalTrexLogo';
import { query } from '../../lib/db';
import SiteHeader from '../../components/SiteHeader';

function normalizeHandle(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

function initialsFromName(value) {
  const text = String(value || '').trim();
  if (!text) return 'NT';
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase() || first.toUpperCase() || 'NT';
}

function orderChipColor(status) {
  if (status === 'completed') return 'success';
  if (status === 'accepted') return 'primary';
  if (status === 'declined') return 'error';
  if (status === 'cancelled') return 'warning';
  return 'default';
}

export default function UserProfilePage({ profile, wishlistItems, initialOrders }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile.name || '');
  const [imageUrl, setImageUrl] = useState(profile.imageUrl || '');
  const [orders, setOrders] = useState(initialOrders || []);
  const [orderFilter, setOrderFilter] = useState('all');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'purchases';
    const saved = window.localStorage.getItem('nepaltrex-profile-active-tab');
    return ['purchases', 'wishlist'].includes(saved) ? saved : 'purchases';
  });

  const ownProfile = session?.user?.id && session.user.id === profile.id;
  const isAdminOrSuperUser = ['admin', 'superUser'].includes(session?.user?.role || '');
  const isSuperUser = session?.user?.role === 'superUser';
  const isUserMenuOpen = Boolean(userMenuAnchor);
  const profileHandle = normalizeHandle(session?.user?.name || (session?.user?.email || '').split('@')[0]);

  const effectiveImage = imageUrl || (ownProfile && profile.provider === 'google' ? session?.user?.image || '' : '');
  const filteredOrders = useMemo(
    () =>
      orderFilter === 'active'
        ? orders.filter((order) => !['completed', 'declined', 'cancelled'].includes(order.status))
        : orders,
    [orderFilter, orders]
  );

  useEffect(() => {
    const queryOrderId = router.query?.orderId;
    if (!queryOrderId || !orders.length) return;

    setActiveTab('purchases');

    const timer = setTimeout(() => {
      const targetElement = document.getElementById(`order-${String(queryOrderId)}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [router.query?.orderId, orders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('nepaltrex-profile-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!ownProfile && activeTab === 'purchases') {
      setActiveTab('wishlist');
    }
  }, [activeTab, ownProfile]);

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

  const cancelOrder = async (orderId) => {
    if (!ownProfile) return;

    setUpdatingOrderId(orderId);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: 'cancelled' } : order)));
      setStatusMessage('Order cancelled successfully.');
    } catch (error) {
      setStatusMessage(error.message || 'Failed to cancel order');
    } finally {
      setUpdatingOrderId('');
    }
  };

  return (
    <>
      <Head>
        <title>{profile.name || profile.username || 'User'} | NepalTrex</title>
      </Head>

      <SiteHeader />

      <Box sx={(theme) => ({ minHeight: '100vh', py: 4, background: theme.palette.background.default })}>
        <Container maxWidth="md">
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Avatar
                  src={effectiveImage}
                  sx={{ width: 88, height: 88, bgcolor: effectiveImage ? 'transparent' : 'primary.main', color: effectiveImage ? 'inherit' : 'white', fontSize: 32, fontWeight: 700 }}
                >
                  {!effectiveImage && (profile.name || profile.username || 'U').charAt(0).toUpperCase()}
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

          <Card>
            <CardContent sx={{ pb: 0 }}>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                variant="scrollable"
                allowScrollButtonsMobile
              >
                {ownProfile && <Tab value="purchases" label="Purchases" />}
                <Tab value="wishlist" label="Wishlist" />
              </Tabs>
            </CardContent>

            <Divider />

            <CardContent>
              {activeTab === 'purchases' && (
                <>
                  <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <InputLabel id="profile-order-filter-label">Order Filter</InputLabel>
                      <Select
                        labelId="profile-order-filter-label"
                        label="Order Filter"
                        value={orderFilter}
                        onChange={(event) => setOrderFilter(event.target.value)}
                      >
                        <MenuItem value="all">All Orders</MenuItem>
                        <MenuItem value="active">Active Orders</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <Stack spacing={1.5}>
                    {filteredOrders.map((order) => (
                      <Card key={order.id} id={`order-${order.id}`} variant="outlined">
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
                                    {item.menuItemName} x {item.quantity}
                                  </Typography>
                                ))}
                              </Stack>
                            </Box>

                            <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
                              <Chip
                                label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                color={orderChipColor(order.status)}
                                variant="outlined"
                                size="small"
                              />
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Rs. {order.totalPrice.toLocaleString()}
                              </Typography>
                              {ownProfile && !['completed', 'cancelled'].includes(order.status) && (
                                <AppButton
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  disabled={updatingOrderId === order.id}
                                  onClick={() => cancelOrder(order.id)}
                                >
                                  {updatingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                                </AppButton>
                              )}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}

                    {filteredOrders.length === 0 && (
                      <Typography color="text.secondary">No purchases yet.</Typography>
                    )}
                  </Stack>
                </>
              )}

              {activeTab === 'wishlist' && (
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
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
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

  const groupedOrders = new Map();
  if (session?.user?.id && String(session.user.id) === String(row.id) && row.email) {
    const ordersResult = await query(
      `
        SELECT o.id, o.order_group_id, o.menu_item_name, o.menu_item_category, o.unit_price, o.quantity, o.total_price, o.customer_name, o.customer_email, o.customer_phone, o.notes, o.status, o.created_at, s.name AS stay_name, s.id AS stay_id
        FROM orders o JOIN stays s ON s.id = o.stay_id
        WHERE LOWER(COALESCE(o.customer_email, '')) = LOWER($1)
        ORDER BY o.created_at DESC
      `,
      [row.email]
    );

    for (const orderRow of ordersResult.rows) {
      const groupId = orderRow.order_group_id || orderRow.id;
      const groupKey = String(groupId);

      if (!groupedOrders.has(groupKey)) {
        groupedOrders.set(groupKey, {
          id: groupKey,
          orderGroupId: orderRow.order_group_id || null,
          stayId: orderRow.stay_id,
          stayName: orderRow.stay_name,
          customerName: orderRow.customer_name,
          customerEmail: orderRow.customer_email || '',
          customerPhone: orderRow.customer_phone || '',
          notes: orderRow.notes || '',
          createdAt: orderRow.created_at,
          status: orderRow.status,
          totalPrice: 0,
          quantity: 0,
          items: [],
        });
      }

      const group = groupedOrders.get(groupKey);
      group.items.push({
        id: orderRow.id,
        menuItemName: orderRow.menu_item_name,
        menuItemCategory: orderRow.menu_item_category,
        unitPrice: Number(orderRow.unit_price),
        quantity: Number(orderRow.quantity),
        totalPrice: Number(orderRow.total_price),
        status: orderRow.status,
      });
      group.totalPrice += Number(orderRow.total_price);
      group.quantity += Number(orderRow.quantity);

      if (orderRow.status === 'completed') {
        group.status = 'completed';
      } else if (orderRow.status === 'declined' && !['completed'].includes(group.status)) {
        group.status = 'declined';
      } else if (orderRow.status === 'cancelled' && !['completed', 'declined'].includes(group.status)) {
        group.status = 'cancelled';
      } else if (orderRow.status === 'accepted' && group.status === 'pending') {
        group.status = 'accepted';
      }
    }
  }

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
      initialOrders: Array.from(groupedOrders.values()),
    },
  };
}
