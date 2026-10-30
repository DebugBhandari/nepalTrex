import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AppButton from '../../components/AppButton';
import { authOptions } from '../../lib/auth-options';
import { query } from '../../lib/db';
import SiteHeader from '../../components/SiteHeader';

const RESERVATION_STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'success',
  declined: 'error',
  cancelled: 'default',
  completed: 'primary',
};

function normalizeHandle(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

function initialsFromName(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'N'}${parts[1]?.[0] || 'T'}`.toUpperCase();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function UserProfilePage({ profile, wishlistItems, initialReservations }) {
  const { data: session } = useSession();
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile.name || '');
  const [imageUrl, setImageUrl] = useState(profile.imageUrl || '');
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'reservations';
    const saved = window.localStorage.getItem('nepaltrex-profile-active-tab');
    return ['reservations', 'wishlist'].includes(saved) ? saved : 'reservations';
  });

  const ownProfile = session?.user?.id && session.user.id === profile.id;
  const effectiveImage = imageUrl || (ownProfile && profile.provider === 'google' ? session?.user?.image || '' : '');
  const activeReservations = useMemo(
    () => (initialReservations || []).filter((reservation) => ['pending', 'confirmed'].includes(reservation.status)),
    [initialReservations]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('nepaltrex-profile-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!ownProfile && activeTab === 'reservations') setActiveTab('wishlist');
  }, [activeTab, ownProfile]);

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    setStatusMessage('');
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, imageDataUrl: imageUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');
      setDisplayName(data.profile.displayName || '');
      setImageUrl(data.profile.imageUrl || '');
      setStatusMessage('Profile saved.');
    } catch (error) {
      setStatusMessage(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head><title>{profile.name || 'Profile'} | NepalTrex</title></Head>
      <SiteHeader />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Card>
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
                <Avatar src={effectiveImage || undefined} sx={{ width: 88, height: 88, bgcolor: 'primary.main', fontWeight: 800, fontSize: 28 }}>
                  {initialsFromName(profile.name)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>{profile.name || profile.username}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.45 }}>@{profile.handle}</Typography>
                  {ownProfile && <Typography color="text.secondary" sx={{ mt: 0.8 }}>{profile.email}</Typography>}
                </Box>
                {ownProfile && <Chip label="Your profile" color="primary" variant="outlined" />}
              </Stack>

              {ownProfile && (
                <Stack spacing={1.5} sx={{ mt: 3 }}>
                  {statusMessage && <Alert severity={statusMessage === 'Profile saved.' ? 'success' : 'error'} onClose={() => setStatusMessage('')}>{statusMessage}</Alert>}
                  <TextField label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} fullWidth />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                    <AppButton variant="outlined" component="label">Upload profile picture<input hidden type="file" accept="image/*" onChange={uploadImage} /></AppButton>
                    {profile.provider === 'google' && <Typography variant="caption" color="text.secondary">Your Google image is used until you upload a replacement.</Typography>}
                  </Stack>
                  <AppButton onClick={saveProfile} disabled={saving} sx={{ alignSelf: 'flex-start' }}>{saving ? 'Saving…' : 'Save profile'}</AppButton>
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ pb: 0 }}>
              <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" allowScrollButtonsMobile>
                {ownProfile && <Tab value="reservations" label={`My reservations${activeReservations.length ? ` (${activeReservations.length})` : ''}`} />}
                <Tab value="wishlist" label="Wishlist" />
              </Tabs>
            </CardContent>
            <Divider />
            <CardContent>
              {activeTab === 'reservations' && (
                <Stack spacing={1.5}>
                  {initialReservations.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800}>No stay reservations yet</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>Find a place to rest along your route and send a request to its host.</Typography>
                      <AppButton component={Link} href="/stays">Find stays</AppButton>
                    </Box>
                  ) : initialReservations.map((reservation) => (
                    <Card key={reservation.id} variant="outlined">
                      <CardContent>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={800}>{reservation.stayName || 'Stay reservation'}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>{formatDate(reservation.checkInDate)} – {formatDate(reservation.checkOutDate)} · {reservation.guestCount} guest{reservation.guestCount === 1 ? '' : 's'}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{reservation.items.map((item) => `${item.roomName} × ${item.units}`).join(' · ')}</Typography>
                            {reservation.hostNote && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Host note: {reservation.hostNote}</Typography>}
                          </Box>
                          <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.75}>
                            <Chip label={reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)} color={RESERVATION_STATUS_COLORS[reservation.status] || 'default'} size="small" />
                            <Typography fontWeight={800}>NPR {Number(reservation.totalPrice || 0).toLocaleString()}</Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
              {activeTab === 'wishlist' && (
                <Stack spacing={1.5}>
                  {wishlistItems.length === 0 ? <Typography color="text.secondary">No saved treks yet.</Typography> : wishlistItems.map((item) => (
                    <Card key={item.slug} variant="outlined"><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Box><Typography variant="subtitle1" fontWeight={800}>{item.name}</Typography><Typography variant="body2" color="text.secondary">{[item.region, item.durationDays ? `${item.durationDays} days` : '', item.level].filter(Boolean).join(' · ')}</Typography></Box><AppButton size="small" variant="outlined" component={Link} href={`/treks/${item.slug}`}>View trek</AppButton></Stack></CardContent></Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  const handle = normalizeHandle(context.params?.name);
  const profileResult = await query(
    `SELECT id, username, display_name, email, role, provider, profile_image_url FROM users WHERE trim(both '-' from regexp_replace(lower(COALESCE(username, '')), '[^a-z0-9]+', '-', 'g')) = $1 OR trim(both '-' from regexp_replace(lower(COALESCE(display_name, '')), '[^a-z0-9]+', '-', 'g')) = $1 LIMIT 1`,
    [handle]
  );
  const row = profileResult.rows[0];
  if (!row) return { notFound: true };

  const wishlistResult = await query(
    `SELECT w.trek_slug, t.name, t.duration_days, t.level, t.region FROM user_trek_wishlists w LEFT JOIN treks t ON trim(both '-' from regexp_replace(lower(t.name), '[^a-z0-9]+', '-', 'g')) = w.trek_slug WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
    [row.id]
  );
  const reservationsResult = session?.user?.id && String(session.user.id) === String(row.id)
    ? await query(
      `SELECT r.id, r.check_in_date, r.check_out_date, r.guest_count, r.status, r.host_note, r.total_price, s.name AS stay_name, COALESCE(json_agg(json_build_object('roomName', ri.room_name, 'units', ri.units)) FILTER (WHERE ri.id IS NOT NULL), '[]'::json) AS items FROM reservations r JOIN stays s ON s.id = r.stay_id LEFT JOIN reservation_items ri ON ri.reservation_id = r.id WHERE r.customer_user_id = $1 GROUP BY r.id, s.id ORDER BY r.created_at DESC`,
      [row.id]
    )
    : { rows: [] };

  return {
    props: {
      profile: { id: row.id, username: row.username || '', name: row.display_name || row.username || '', email: row.email || '', role: row.role || 'user', provider: row.provider || 'credentials', imageUrl: row.profile_image_url || '', handle },
      wishlistItems: wishlistResult.rows.map((item) => ({ slug: item.trek_slug, name: item.name || item.trek_slug, durationDays: item.duration_days || null, level: item.level || '', region: item.region || '' })),
      initialReservations: reservationsResult.rows.map((reservation) => ({ id: reservation.id, stayName: reservation.stay_name, checkInDate: reservation.check_in_date, checkOutDate: reservation.check_out_date, guestCount: Number(reservation.guest_count), status: reservation.status, hostNote: reservation.host_note || '', totalPrice: Number(reservation.total_price), items: Array.isArray(reservation.items) ? reservation.items.map((item) => ({ roomName: item.roomName, units: Number(item.units) })) : [] })),
    },
  };
}
