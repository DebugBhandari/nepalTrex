import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Avatar, Box, Card, CardContent, Chip, Container, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { getServerSession } from 'next-auth/next';
import SiteHeader from '../../components/SiteHeader';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import RatingStars from '../../components/RatingStars';
import { formatCurrency } from '../../lib/formatters';
import { authOptions } from '../../lib/auth-options';
import { query } from '../../lib/db';

const bookingStatusColor = { pending: 'warning', confirmed: 'success', declined: 'error', cancelled: 'default', completed: 'primary' };

function formatDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function GuideDetailPage({ guide, packages, bookings, signedIn, isSuperUser }) {
  const availablePackages = packages.filter((item) => item.isActive);
  const [selected, setSelected] = useState(availablePackages[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedPackage = availablePackages.find((item) => item.id === selected);
  const estimatedPrice = selectedPackage ? Number(selectedPackage.priceAmount) * (selectedPackage.priceUnit === 'per_person' ? Number(travelers || 0) : selectedPackage.priceUnit === 'per_day' ? selectedPackage.durationDays : 1) : 0;

  const requestBooking = async () => {
    if (!selected || !startDate) return setMessage('Choose a package and requested start date.');
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/guide-bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId: selected, startDate, travelerCount: Number(travelers), customerNote: note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage('Booking request sent. The guide can now confirm availability and pricing.');
    } catch (error) { setMessage(error.message || 'Unable to request booking'); } finally { setSaving(false); }
  };

  return <>
    <Head><title>{guide.name} | NepalTrex Guides</title><meta name="description" content={guide.headline} /></Head>
    <SiteHeader />
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.35fr .65fr' }, gap: 3 }}>
        <Stack spacing={3}>
          <Paper sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack direction="row" spacing={2} alignItems="center"><Avatar src={guide.profileImageUrl || undefined} sx={{ width: 80, height: 80, fontSize: 30 }}>{guide.name?.slice(0, 1)}</Avatar><Box><Typography variant="overline" color="primary.main">{isSuperUser ? `Guide application · ${guide.approvalStatus}` : 'Approved local guide'}</Typography><Typography variant="h2" sx={{ fontSize: { xs: '2.1rem', md: '3rem' } }}>{guide.name}</Typography><Typography color="text.secondary">Based in {guide.homeRegion} · {guide.yearsExperience} years of experience</Typography><Box component={Link} href={`/reviews/guide/${guide.slug}`} sx={{ display: 'inline-flex', color: 'inherit', textDecoration: 'none', borderRadius: 1, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }} aria-label={`View reviews for ${guide.name}`}><RatingStars rating={guide.avgRating} count={guide.reviewCount} /></Box></Box></Stack>
            <Typography variant="h5" sx={{ mt: 3 }}>{guide.headline}</Typography><Typography color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.8 }}>{guide.bio}</Typography><Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1, rowGap: 1, mt: 2.5 }}>{guide.languages.map((language) => <Chip key={language} label={language} />)}</Box>
            {isSuperUser && <><Divider sx={{ my: 3 }} /><Typography variant="h6">Application details</Typography><Stack spacing={0.75} sx={{ mt: 1.25 }}><Typography variant="body2"><strong>Approval:</strong> {guide.approvalStatus}</Typography>{guide.moderationNote && <Typography variant="body2"><strong>Moderation note:</strong> {guide.moderationNote}</Typography>}<Typography variant="body2"><strong>License number:</strong> {guide.licenseNumber || 'Not provided'}</Typography><Typography variant="body2"><strong>Applied:</strong> {formatDate(guide.createdAt)}</Typography><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{guide.licenseDocumentUrl && <AppButton component="a" href={guide.licenseDocumentUrl} target="_blank" rel="noreferrer" size="small" variant="outlined">View license document</AppButton>}{guide.citizenshipDocumentUrl && <AppButton component="a" href={guide.citizenshipDocumentUrl} target="_blank" rel="noreferrer" size="small" variant="outlined">View citizenship document</AppButton>}</Stack></Stack></>}
          </Paper>
          <Box><Typography variant="h4" sx={{ mb: 2 }}>{isSuperUser ? 'Guide packages' : 'Guided packages'}</Typography>{packages.length === 0 ? <EmptyState title="No packages yet" description={isSuperUser ? 'This guide has not created any packages.' : 'This guide has not published packages yet.'} /> : <Stack spacing={1.5}>{packages.map((pkg) => <Card key={pkg.id} variant="outlined"><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Box><Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={800}>{pkg.title}</Typography>{isSuperUser && !pkg.isActive && <Chip label="Inactive" size="small" />}</Stack><Typography variant="body2" color="text.secondary">{pkg.trekName} · {pkg.region} · {pkg.durationDays} days · {pkg.groupSizeMin}–{pkg.groupSizeMax} people</Typography><Typography variant="body2" sx={{ mt: 0.8 }}>{pkg.summary}</Typography></Box><Box textAlign={{ sm: 'right' }}><Typography fontWeight={800}>{formatCurrency(pkg.priceAmount, pkg.currency)}</Typography><Typography variant="caption" color="text.secondary">{pkg.priceUnit.replace('_', ' ')}</Typography></Box></Stack></CardContent></Card>)}</Stack>}</Box>
          {isSuperUser && <Box><Typography variant="h4" sx={{ mb: 2 }}>Reservations</Typography>{bookings.length === 0 ? <EmptyState title="No reservations yet" description="No travelers have requested this guide's packages." /> : <Stack spacing={1.5}>{bookings.map((booking) => <Card key={booking.id} variant="outlined"><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Box><Typography fontWeight={800}>{booking.packageTitle}</Typography><Typography variant="body2" color="text.secondary">Requested by {booking.customerName} · {formatDate(booking.startDate)} · {booking.travelerCount} travelers</Typography>{booking.customerNote && <Typography variant="body2" sx={{ mt: 0.75 }}>Traveler note: {booking.customerNote}</Typography>}{booking.guideNote && <Typography variant="body2" sx={{ mt: 0.5 }}>Guide note: {booking.guideNote}</Typography>}</Box><Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5}><Chip label={booking.status} color={bookingStatusColor[booking.status] || 'default'} size="small" /><Typography fontWeight={800}>{formatCurrency(booking.quotedAmount, booking.currency)}</Typography></Stack></Stack></CardContent></Card>)}</Stack>}</Box>}
        </Stack>
        {isSuperUser ? <Paper sx={{ p: 2.5, height: 'fit-content', position: { md: 'sticky' }, top: 92 }}><Typography variant="h5">Platform review</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>You are viewing the complete guide profile, including private application documents, all packages, and reservations.</Typography><AppButton component={Link} href="/guides/manage" variant="outlined" sx={{ mt: 2 }}>View all guide bookings</AppButton></Paper> : <Paper sx={{ p: 2.5, height: 'fit-content', position: { md: 'sticky' }, top: 92 }}><Typography variant="h5">Request a booking</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>No payment is taken online. The guide confirms availability directly.</Typography>{!signedIn ? <AppButton component={Link} href={`/auth/signin?callbackUrl=${encodeURIComponent(`/guides/${guide.slug}`)}`} fullWidth>Sign in to request</AppButton> : <Stack spacing={1.5}><TextField select label="Package" value={selected} onChange={(event) => { setSelected(event.target.value); const pkg = availablePackages.find((item) => item.id === event.target.value); if (pkg) setTravelers(pkg.groupSizeMin); }}>{availablePackages.map((pkg) => <MenuItem key={pkg.id} value={pkg.id}>{pkg.title}</MenuItem>)}</TextField><TextField type="date" label="Requested start date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(event) => setStartDate(event.target.value)} /><TextField type="number" label="Travelers" inputProps={{ min: selectedPackage?.groupSizeMin || 1, max: selectedPackage?.groupSizeMax || 99 }} value={travelers} onChange={(event) => setTravelers(event.target.value)} />{selectedPackage && <Typography variant="caption" color="text.secondary">Group size: {selectedPackage.groupSizeMin}–{selectedPackage.groupSizeMax}. Estimated price: {formatCurrency(estimatedPrice, selectedPackage.currency)}.</Typography>}<TextField multiline minRows={3} label="Message for guide (optional)" value={note} onChange={(event) => setNote(event.target.value)} />{message && <Alert severity={message.startsWith('Booking') ? 'success' : 'error'}>{message}</Alert>}<AppButton onClick={requestBooking} disabled={saving || availablePackages.length === 0}>{saving ? 'Sending…' : 'Send booking request'}</AppButton></Stack>}</Paper>}
      </Box>
    </Container>
  </>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  const isSuperUser = session?.user?.role === 'superUser';
  const result = await query(`SELECT gp.*, COALESCE(NULLIF(u.display_name,''), NULLIF(u.username,''), split_part(u.email,'@',1)) AS guide_name, COALESCE(AVG(r.rating),0)::numeric(3,1) AS avg_rating, COUNT(r.id)::int AS review_count FROM guide_profiles gp JOIN users u ON u.id=gp.user_id LEFT JOIN reviews r ON r.target_type='guide' AND r.target_id=gp.id WHERE gp.slug=$1 ${isSuperUser ? '' : "AND gp.approval_status='approved'"} GROUP BY gp.id,u.id LIMIT 1`, [context.params.slug]);
  const row = result.rows[0]; if (!row) return { notFound: true };
  const packageResult = await query(`SELECT id,slug,title,trek_name,region,summary,duration_days,group_size_min,group_size_max,price_amount,price_unit,currency,is_active FROM guide_packages WHERE guide_profile_id=$1 ${isSuperUser ? '' : 'AND is_active=true'} ORDER BY created_at DESC`, [row.id]);
  const bookingsResult = isSuperUser ? await query(`SELECT b.id,b.start_date,b.traveler_count,b.status,b.customer_note,b.guide_note,b.quoted_amount,b.currency,p.title AS package_title,COALESCE(NULLIF(customer.display_name,''),NULLIF(customer.username,''),split_part(customer.email,'@',1)) AS customer_name FROM guide_bookings b JOIN guide_packages p ON p.id=b.guide_package_id JOIN users customer ON customer.id=b.customer_user_id WHERE b.guide_profile_id=$1 ORDER BY b.created_at DESC`, [row.id]) : { rows: [] };
  return { props: { guide: { id: row.id, slug: row.slug, name: row.guide_name, headline: row.headline, bio: row.bio, homeRegion: row.home_region, languages: row.languages || [], yearsExperience: row.years_experience, profileImageUrl: row.profile_image_url || '', avgRating: Number(row.avg_rating), reviewCount: Number(row.review_count), approvalStatus: row.approval_status, moderationNote: row.moderation_note || '', licenseNumber: row.license_number || '', licenseDocumentUrl: row.license_document_url || '', citizenshipDocumentUrl: row.citizenship_document_url || '', createdAt: row.created_at }, packages: packageResult.rows.map((pkg) => ({ id: pkg.id, slug: pkg.slug, title: pkg.title, trekName: pkg.trek_name, region: pkg.region, summary: pkg.summary, durationDays: pkg.duration_days, groupSizeMin: pkg.group_size_min, groupSizeMax: pkg.group_size_max, priceAmount: Number(pkg.price_amount), priceUnit: pkg.price_unit, currency: pkg.currency, isActive: pkg.is_active })), bookings: bookingsResult.rows.map((booking) => ({ id: booking.id, startDate: booking.start_date, travelerCount: Number(booking.traveler_count), status: booking.status, customerNote: booking.customer_note || '', guideNote: booking.guide_note || '', quotedAmount: Number(booking.quoted_amount), currency: booking.currency, packageTitle: booking.package_title, customerName: booking.customer_name })), signedIn: Boolean(session?.user?.id), isSuperUser } };
}