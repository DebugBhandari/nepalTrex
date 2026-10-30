import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Avatar, Box, Card, CardContent, Chip, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { getServerSession } from 'next-auth/next';
import SiteHeader from '../../components/SiteHeader';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import RatingStars from '../../components/RatingStars';
import { formatCurrency } from '../../lib/formatters';
import { authOptions } from '../../lib/auth-options';
import { query } from '../../lib/db';

export default function GuideDetailPage({ guide, packages, signedIn }) {
  const [selected, setSelected] = useState(packages[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedPackage = packages.find((item) => item.id === selected);
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
            <Stack direction="row" spacing={2} alignItems="center"><Avatar src={guide.profileImageUrl || undefined} sx={{ width: 80, height: 80, fontSize: 30 }}>{guide.name?.slice(0, 1)}</Avatar><Box><Typography variant="overline" color="primary.main">Approved local guide</Typography><Typography variant="h2" sx={{ fontSize: { xs: '2.1rem', md: '3rem' } }}>{guide.name}</Typography><Typography color="text.secondary">Based in {guide.homeRegion} · {guide.yearsExperience} years of experience</Typography><Box component={Link} href={`/reviews/guide/${guide.slug}`} sx={{ display: 'inline-flex', color: 'inherit', textDecoration: 'none', borderRadius: 1, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }} aria-label={`View reviews for ${guide.name}`}><RatingStars rating={guide.avgRating} count={guide.reviewCount} /></Box></Box></Stack>
            <Typography variant="h5" sx={{ mt: 3 }}>{guide.headline}</Typography><Typography color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.8 }}>{guide.bio}</Typography><Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2.5 }}>{guide.languages.map((language) => <Chip key={language} label={language} />)}</Stack>
          </Paper>
          <Box><Typography variant="h4" sx={{ mb: 2 }}>Guided packages</Typography>{packages.length === 0 ? <EmptyState title="Packages are coming soon" description="This guide has not published an active package yet." /> : <Stack spacing={1.5}>{packages.map((pkg) => <Card key={pkg.id} variant="outlined"><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Box><Typography variant="h6">{pkg.title}</Typography><Typography color="text.secondary">{pkg.trekName} · {pkg.region} · {pkg.durationDays} days</Typography><Typography variant="body2" sx={{ mt: 0.8 }}>{pkg.summary}</Typography></Box><Box textAlign={{ sm: 'right' }}><Typography fontWeight={800}>{formatCurrency(pkg.priceAmount, pkg.currency)}</Typography><Typography variant="caption" color="text.secondary">{pkg.priceUnit.replace('_', ' ')}</Typography></Box></Stack></CardContent></Card>)}</Stack>}</Box>
        </Stack>
        <Paper sx={{ p: 2.5, height: 'fit-content', position: { md: 'sticky' }, top: 92 }}>
          <Typography variant="h5">Request a booking</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>No payment is taken online. The guide confirms availability directly.</Typography>
          {!signedIn ? <AppButton component={Link} href={`/auth/signin?callbackUrl=${encodeURIComponent(`/guides/${guide.slug}`)}`} fullWidth>Sign in to request</AppButton> : <Stack spacing={1.5}><TextField select label="Package" value={selected} onChange={(event) => { setSelected(event.target.value); const pkg = packages.find((item) => item.id === event.target.value); if (pkg) setTravelers(pkg.groupSizeMin); }}>{packages.map((pkg) => <MenuItem key={pkg.id} value={pkg.id}>{pkg.title}</MenuItem>)}</TextField><TextField type="date" label="Requested start date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(event) => setStartDate(event.target.value)} /><TextField type="number" label="Travelers" inputProps={{ min: selectedPackage?.groupSizeMin || 1, max: selectedPackage?.groupSizeMax || 99 }} value={travelers} onChange={(event) => setTravelers(event.target.value)} />{selectedPackage && <Typography variant="caption" color="text.secondary">Group size: {selectedPackage.groupSizeMin}–{selectedPackage.groupSizeMax}. Estimated price: {formatCurrency(estimatedPrice, selectedPackage.currency)}.</Typography>}<TextField multiline minRows={3} label="Message for guide (optional)" value={note} onChange={(event) => setNote(event.target.value)} />{message && <Alert severity={message.startsWith('Booking') ? 'success' : 'error'}>{message}</Alert>}<AppButton onClick={requestBooking} disabled={saving || packages.length === 0}>{saving ? 'Sending…' : 'Send booking request'}</AppButton></Stack>}
        </Paper>
      </Box>
    </Container>
  </>;
}

export async function getServerSideProps(context) {
  const result = await query(`SELECT gp.*, COALESCE(NULLIF(u.display_name,''), NULLIF(u.username,''), split_part(u.email,'@',1)) AS guide_name, COALESCE(AVG(r.rating),0)::numeric(3,1) AS avg_rating, COUNT(r.id)::int AS review_count FROM guide_profiles gp JOIN users u ON u.id=gp.user_id LEFT JOIN reviews r ON r.target_type='guide' AND r.target_id=gp.id WHERE gp.slug=$1 AND gp.approval_status='approved' GROUP BY gp.id,u.id LIMIT 1`, [context.params.slug]);
  const row = result.rows[0]; if (!row) return { notFound: true };
  const packageResult = await query('SELECT id,slug,title,trek_name,region,summary,duration_days,group_size_min,group_size_max,price_amount,price_unit,currency FROM guide_packages WHERE guide_profile_id=$1 AND is_active=true ORDER BY created_at DESC', [row.id]);
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: { guide: { id: row.id, slug: row.slug, name: row.guide_name, headline: row.headline, bio: row.bio, homeRegion: row.home_region, languages: row.languages || [], yearsExperience: row.years_experience, profileImageUrl: row.profile_image_url || '', avgRating: Number(row.avg_rating), reviewCount: Number(row.review_count) }, packages: packageResult.rows.map((pkg) => ({ id: pkg.id, slug: pkg.slug, title: pkg.title, trekName: pkg.trek_name, region: pkg.region, summary: pkg.summary, durationDays: pkg.duration_days, groupSizeMin: pkg.group_size_min, groupSizeMax: pkg.group_size_max, priceAmount: Number(pkg.price_amount), priceUnit: pkg.price_unit, currency: pkg.currency })), signedIn: Boolean(session?.user?.id) } };
}