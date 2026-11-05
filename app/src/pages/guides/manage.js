import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Alert, Box, Card, CardContent, Chip, Container, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';
import { getServerSession } from 'next-auth/next';
import SiteHeader from '../../components/SiteHeader';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { authOptions } from '../../lib/auth-options';
import { query } from '../../lib/db';
import { formatCurrency } from '../../lib/formatters';

const blankPackage = { slug: '', title: '', trekId: '', region: '', summary: '', durationDays: 1, groupSizeMin: 1, groupSizeMax: 6, priceAmount: '', priceUnit: 'package', currency: 'NPR', inclusions: '', exclusions: '' };
const normalizeList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
const statusColor = { pending: 'warning', confirmed: 'success', declined: 'error', cancelled: 'default', completed: 'primary' };

function formatDate(value) {
  if (!value) return '—';
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GuideManagePage({ guide, treks, initialBookings }) {
  const router = useRouter();
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState(initialBookings);
  const [form, setForm] = useState(blankPackage);
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState('');
  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const approved = guide.approvalStatus === 'approved';
  const pendingBookings = useMemo(() => bookings.filter((booking) => booking.status === 'pending'), [bookings]);
  const selectedBookingId = typeof router.query.booking === 'string' ? router.query.booking : '';

  useEffect(() => {
    if (!guide.canManagePackages) return;
    fetch(`/api/guides/${guide.slug}/packages`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load packages');
      setPackages(data.packages || []);
    }).catch((error) => setMessage(error.message));
  }, [guide.canManagePackages, guide.slug]);

  const createPackage = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const response = await fetch(`/api/guides/${guide.slug}/packages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, durationDays: Number(form.durationDays), groupSizeMin: Number(form.groupSizeMin), groupSizeMax: Number(form.groupSizeMax), priceAmount: Number(form.priceAmount), inclusions: normalizeList(form.inclusions), exclusions: normalizeList(form.exclusions) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create package');
      setPackages((current) => [data.package, ...current]); setForm(blankPackage); setMessage('Package published.');
    } catch (error) { setMessage(error.message || 'Could not create package'); } finally { setSaving(false); }
  };

  const updateBooking = async (bookingId, status) => {
    setUpdatingBookingId(bookingId); setMessage('');
    try {
      const response = await fetch(`/api/guide-bookings/${bookingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, guideNote: notes[bookingId] || '' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update guide booking');
      setBookings((current) => current.map((booking) => booking.id === bookingId ? { ...booking, status: data.booking.status, guideNote: data.booking.guide_note || booking.guideNote } : booking));
      setMessage(`Guide booking ${data.booking.status}.`);
    } catch (error) { setMessage(error.message || 'Could not update guide booking'); } finally { setUpdatingBookingId(''); }
  };

  return <><Head><title>{guide.isPlatformManager ? 'Platform guide bookings' : 'Guide workspace'} | NepalTrex</title></Head><SiteHeader /><Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}><Stack spacing={3}>
    <Paper sx={{ p: { xs: 2.5, md: 4 } }}><Typography variant="overline" color="primary.main">{guide.isPlatformManager ? 'Platform management' : 'Guide workspace'}</Typography><Typography variant="h2">{guide.isPlatformManager ? 'Guide booking requests' : guide.name}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{guide.isPlatformManager ? 'Review and update booking requests for every approved guide.' : <>Application status: <strong>{guide.approvalStatus}</strong>{guide.moderationNote ? ` — ${guide.moderationNote}` : ''}</>}</Typography>{pendingBookings.length > 0 && <Alert severity="warning" sx={{ mt: 2 }}><strong>{pendingBookings.length} booking request{pendingBookings.length === 1 ? '' : 's'} need{pendingBookings.length === 1 ? 's' : ''} action.</strong> Accepting a request enables the private traveler–guide chat.</Alert>}{!guide.isPlatformManager && !approved && <Alert severity={guide.approvalStatus === 'rejected' ? 'error' : 'info'} sx={{ mt: 2 }}>Your public profile and package tools unlock after SuperUser approval.</Alert>}</Paper>
    {message && <Alert severity={message === 'Package published.' || message.endsWith('confirmed.') ? 'success' : message.endsWith('declined.') ? 'warning' : 'error'} onClose={() => setMessage('')}>{message}</Alert>}
    <Box><Typography variant="h4" sx={{ mb: 2 }}>Booking requests</Typography>{bookings.length === 0 ? <EmptyState title="No guide bookings yet" description={guide.isPlatformManager ? 'Traveler requests for every guide will appear here.' : 'Traveler requests for your packages will appear here.'} /> : <Stack spacing={1.5}>{bookings.map((booking) => {
      const pending = booking.status === 'pending'; const isUpdating = updatingBookingId === booking.id;
      return <Card key={booking.id} variant="outlined" sx={booking.id === selectedBookingId ? { borderWidth: 2, borderColor: 'primary.main', boxShadow: (theme) => `0 0 0 4px ${theme.palette.primary.main}22` } : pending ? { borderWidth: 2, borderColor: 'warning.main', boxShadow: (theme) => `0 0 0 3px ${theme.palette.warning.main}1a` } : undefined}><CardContent><Stack spacing={2}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}><Box><Typography variant="h6">{booking.packageTitle}</Typography><Typography color="text.secondary">{guide.isPlatformManager ? `Guide: ${booking.guideName} · ` : ''}Traveler: {booking.customerName} · {formatDate(booking.startDate)} · {booking.travelerCount} traveler{booking.travelerCount === 1 ? '' : 's'}</Typography></Box><Stack direction="row" spacing={1} alignItems="center"><Chip label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)} color={statusColor[booking.status] || 'default'} /><Typography fontWeight={800}>{formatCurrency(booking.quotedAmount, booking.currency)}</Typography></Stack></Stack>{booking.customerNote && <Typography variant="body2" color="text.secondary"><strong>Traveler note:</strong> {booking.customerNote}</Typography>}{booking.guideNote && !pending && <Typography variant="body2" color="text.secondary"><strong>Guide response:</strong> {booking.guideNote}</Typography>}{pending && <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.light' }}><Stack spacing={1.5}><Typography fontWeight={800}>Reservation action required</Typography><TextField label="Response note (optional)" value={notes[booking.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [booking.id]: event.target.value }))} multiline minRows={2} placeholder="Add pickup, quote, availability, or other details for the traveler." /><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><AppButton startIcon={<CheckCircleOutlineRoundedIcon />} onClick={() => updateBooking(booking.id, 'confirmed')} disabled={isUpdating}>{isUpdating ? 'Updating…' : 'Accept booking & enable chat'}</AppButton><AppButton color="error" variant="outlined" startIcon={<HighlightOffRoundedIcon />} onClick={() => updateBooking(booking.id, 'declined')} disabled={isUpdating}>Decline booking</AppButton></Stack></Stack></Paper>}</Stack></CardContent></Card>;
    })}</Stack>}</Box>
    {guide.canManagePackages && <><Divider /><Paper component="form" onSubmit={createPackage} sx={{ p: { xs: 2.5, md: 4 } }}><Typography variant="h4" sx={{ mb: 2 }}>Create a package</Typography><Stack spacing={2}><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required label="Package URL" value={form.slug} onChange={setField('slug')} fullWidth /><TextField required label="Package title" value={form.title} onChange={setField('title')} fullWidth /></Stack><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required select label="Trek" value={form.trekId} onChange={setField('trekId')} fullWidth><MenuItem value="" disabled>Select a trek</MenuItem>{treks.map((trek) => <MenuItem key={trek.id} value={trek.id}>{trek.name}</MenuItem>)}</TextField><TextField required label="Region" value={form.region} onChange={setField('region')} fullWidth /></Stack><TextField required multiline minRows={3} label="Summary" value={form.summary} onChange={setField('summary')} /><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required type="number" inputProps={{ min: 1 }} label="Days" value={form.durationDays} onChange={setField('durationDays')} fullWidth /><TextField required type="number" inputProps={{ min: 1 }} label="Minimum group size" value={form.groupSizeMin} onChange={setField('groupSizeMin')} fullWidth /><TextField required type="number" inputProps={{ min: 1 }} label="Maximum group size" value={form.groupSizeMax} onChange={setField('groupSizeMax')} fullWidth /></Stack><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required type="number" inputProps={{ min: 0 }} label="Price (NPR)" value={form.priceAmount} onChange={setField('priceAmount')} fullWidth /><TextField select label="Price unit" value={form.priceUnit} onChange={setField('priceUnit')} fullWidth><MenuItem value="package">Per package</MenuItem><MenuItem value="per_person">Per person</MenuItem><MenuItem value="per_day">Per day</MenuItem></TextField></Stack><TextField label="Inclusions (comma separated)" value={form.inclusions} onChange={setField('inclusions')} /><TextField label="Exclusions (comma separated)" value={form.exclusions} onChange={setField('exclusions')} /><AppButton type="submit" disabled={saving || treks.length === 0}>{saving ? 'Publishing…' : 'Publish package'}</AppButton></Stack></Paper><Box><Typography variant="h4" sx={{ mb: 2 }}>Your packages</Typography>{packages.length === 0 ? <EmptyState title="No packages yet" description="Publish your first guided trek package above." /> : <Stack spacing={1.5}>{packages.map((pkg) => <Card key={pkg.id}><CardContent><Typography variant="h6">{pkg.title}</Typography><Typography color="text.secondary">{pkg.trek_name} · {pkg.duration_days} days · {formatCurrency(pkg.price_amount, pkg.currency)}</Typography></CardContent></Card>)}</Stack>}</Box></>}
  </Stack></Container></>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.id) return { redirect: { destination: '/auth/signin?callbackUrl=%2Fguides%2Fmanage', permanent: false } };
  const isPlatformManager = session.user.role === 'superUser';
  const profileResult = isPlatformManager ? { rows: [] } : await query(`SELECT gp.slug, gp.approval_status, gp.moderation_note, COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS name FROM guide_profiles gp JOIN users u ON u.id = gp.user_id WHERE gp.user_id = $1 LIMIT 1`, [session.user.id]);
  const row = profileResult.rows[0];
  if (!isPlatformManager && !row) return { redirect: { destination: '/guides/apply', permanent: false } };
  const bookingsResult = await query(`SELECT b.id, b.start_date, b.traveler_count, b.status, b.customer_note, b.guide_note, b.quoted_amount, b.currency, p.title AS package_title, COALESCE(NULLIF(customer.display_name, ''), NULLIF(customer.username, ''), split_part(customer.email, '@', 1)) AS customer_name, COALESCE(NULLIF(guide_user.display_name, ''), NULLIF(guide_user.username, ''), split_part(guide_user.email, '@', 1)) AS guide_name FROM guide_bookings b JOIN guide_packages p ON p.id=b.guide_package_id JOIN guide_profiles gp ON gp.id=b.guide_profile_id JOIN users customer ON customer.id=b.customer_user_id JOIN users guide_user ON guide_user.id=gp.user_id ${isPlatformManager ? '' : 'WHERE gp.user_id=$1'} ORDER BY CASE WHEN b.status = 'pending' THEN 0 ELSE 1 END, b.created_at DESC`, isPlatformManager ? [] : [session.user.id]);
  const trekResult = !isPlatformManager && row.approval_status === 'approved' ? await query('SELECT id, name FROM treks ORDER BY name ASC') : { rows: [] };
  return { props: { guide: isPlatformManager ? { name: 'NepalTrex platform', approvalStatus: 'approved', moderationNote: '', slug: '', isPlatformManager: true, canManagePackages: false } : { slug: row.slug, approvalStatus: row.approval_status, moderationNote: row.moderation_note || '', name: row.name, isPlatformManager: false, canManagePackages: row.approval_status === 'approved' }, treks: trekResult.rows, initialBookings: bookingsResult.rows.map((booking) => ({ id: booking.id, startDate: booking.start_date, travelerCount: Number(booking.traveler_count), status: booking.status, customerNote: booking.customer_note || '', guideNote: booking.guide_note || '', quotedAmount: Number(booking.quoted_amount), currency: booking.currency, packageTitle: booking.package_title, customerName: booking.customer_name, guideName: booking.guide_name })) } };
}