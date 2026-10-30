import Head from 'next/head';
import { useEffect, useState } from 'react';
import { Alert, Card, CardContent, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { getServerSession } from 'next-auth/next';
import SiteHeader from '../../components/SiteHeader';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { authOptions } from '../../lib/auth-options';
import { query } from '../../lib/db';
import { formatCurrency } from '../../lib/formatters';

const blankPackage = { slug: '', title: '', trekId: '', region: '', summary: '', durationDays: 1, groupSizeMin: 1, groupSizeMax: 6, priceAmount: '', priceUnit: 'package', currency: 'NPR', inclusions: '', exclusions: '' };
const normalizeList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function GuideManagePage({ guide, treks }) {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(blankPackage);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  useEffect(() => {
    if (guide.approvalStatus !== 'approved') return;
    fetch(`/api/guides/${guide.slug}/packages`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load packages');
      setPackages(data.packages || []);
    }).catch((error) => setMessage(error.message));
  }, [guide.approvalStatus, guide.slug]);

  const createPackage = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const response = await fetch(`/api/guides/${guide.slug}/packages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, durationDays: Number(form.durationDays), groupSizeMin: Number(form.groupSizeMin), groupSizeMax: Number(form.groupSizeMax), priceAmount: Number(form.priceAmount), inclusions: normalizeList(form.inclusions), exclusions: normalizeList(form.exclusions) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create package');
      setPackages((current) => [data.package, ...current]); setForm(blankPackage); setMessage('Package published.');
    } catch (error) { setMessage(error.message || 'Could not create package'); } finally { setSaving(false); }
  };

  const approved = guide.approvalStatus === 'approved';
  return <><Head><title>Guide workspace | NepalTrex</title></Head><SiteHeader /><Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}><Stack spacing={3}><Paper sx={{ p: { xs: 2.5, md: 4 } }}><Typography variant="overline" color="primary.main">Guide workspace</Typography><Typography variant="h2">{guide.name}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Application status: <strong>{guide.approvalStatus}</strong>{guide.moderationNote ? ` — ${guide.moderationNote}` : ''}</Typography>{!approved && <Alert severity={guide.approvalStatus === 'rejected' ? 'error' : 'info'} sx={{ mt: 2 }}>Your public profile and package tools unlock after SuperUser approval.</Alert>}</Paper>{message && <Alert severity={message === 'Package published.' ? 'success' : 'error'}>{message}</Alert>}{approved && <><Paper component="form" onSubmit={createPackage} sx={{ p: { xs: 2.5, md: 4 } }}><Typography variant="h4" sx={{ mb: 2 }}>Create a package</Typography><Stack spacing={2}><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required label="Package URL" value={form.slug} onChange={setField('slug')} fullWidth /><TextField required label="Package title" value={form.title} onChange={setField('title')} fullWidth /></Stack><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required select label="Trek" value={form.trekId} onChange={setField('trekId')} fullWidth><MenuItem value="" disabled>Select a trek</MenuItem>{treks.map((trek) => <MenuItem key={trek.id} value={trek.id}>{trek.name}</MenuItem>)}</TextField><TextField required label="Region" value={form.region} onChange={setField('region')} fullWidth /></Stack><TextField required multiline minRows={3} label="Summary" value={form.summary} onChange={setField('summary')} /><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required type="number" inputProps={{ min: 1 }} label="Days" value={form.durationDays} onChange={setField('durationDays')} fullWidth /><TextField required type="number" inputProps={{ min: 1 }} label="Minimum group size" value={form.groupSizeMin} onChange={setField('groupSizeMin')} fullWidth /><TextField required type="number" inputProps={{ min: 1 }} label="Maximum group size" value={form.groupSizeMax} onChange={setField('groupSizeMax')} fullWidth /></Stack><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField required type="number" inputProps={{ min: 0 }} label="Price (NPR)" value={form.priceAmount} onChange={setField('priceAmount')} fullWidth /><TextField select label="Price unit" value={form.priceUnit} onChange={setField('priceUnit')} fullWidth><MenuItem value="package">Per package</MenuItem><MenuItem value="per_person">Per person</MenuItem><MenuItem value="per_day">Per day</MenuItem></TextField></Stack><TextField label="Inclusions (comma separated)" value={form.inclusions} onChange={setField('inclusions')} /><TextField label="Exclusions (comma separated)" value={form.exclusions} onChange={setField('exclusions')} /><AppButton type="submit" disabled={saving || treks.length === 0}>{saving ? 'Publishing…' : 'Publish package'}</AppButton></Stack></Paper><Box><Typography variant="h4" sx={{ mb: 2 }}>Your packages</Typography>{packages.length === 0 ? <EmptyState title="No packages yet" description="Publish your first guided trek package above." /> : <Stack spacing={1.5}>{packages.map((pkg) => <Card key={pkg.id}><CardContent><Typography variant="h6">{pkg.title}</Typography><Typography color="text.secondary">{pkg.trek_name} · {pkg.duration_days} days · {formatCurrency(pkg.price_amount, pkg.currency)}</Typography></CardContent></Card>)}</Stack>}</Box></>}</Stack></Container></>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.id) return { redirect: { destination: '/auth/signin?callbackUrl=%2Fguides%2Fmanage', permanent: false } };
  const result = await query(`SELECT gp.slug, gp.approval_status, gp.moderation_note, COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS name FROM guide_profiles gp JOIN users u ON u.id = gp.user_id WHERE gp.user_id = $1 LIMIT 1`, [session.user.id]);
  const row = result.rows[0];
  if (!row) return { redirect: { destination: '/guides/apply', permanent: false } };
  const trekResult = await query('SELECT id, name FROM treks ORDER BY name ASC');
  return { props: { guide: { slug: row.slug, approvalStatus: row.approval_status, moderationNote: row.moderation_note || '', name: row.name }, treks: trekResult.rows } };
}