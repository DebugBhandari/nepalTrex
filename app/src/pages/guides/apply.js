import Head from 'next/head';
import { useState } from 'react';
import { Alert, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { getServerSession } from 'next-auth/next';
import SiteHeader from '../../components/SiteHeader';
import AppButton from '../../components/AppButton';
import { authOptions } from '../../lib/auth-options';

export default function GuideApplicationPage() {
  const [form, setForm] = useState({ slug: '', headline: '', bio: '', homeRegion: '', languages: 'English, Nepali', yearsExperience: '', licenseNumber: '', licenseDocumentUrl: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const change = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, languages: form.languages.split(',').map((item) => item.trim()).filter(Boolean), yearsExperience: Number(form.yearsExperience) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setMessage('Application submitted. A NepalTrex moderator will review it before your profile becomes public.');
    } catch (error) { setMessage(error.message || 'Could not submit application'); } finally { setSaving(false); }
  };
  return <><Head><title>Apply as a guide | NepalTrex</title></Head><SiteHeader /><Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}><Paper component="form" onSubmit={submit} sx={{ p: { xs: 2.5, md: 4 } }}><Typography variant="overline" color="primary.main">Guide marketplace</Typography><Typography variant="h3" sx={{ mb: 1 }}>Apply as a guide</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Provide your public profile details and license evidence. Your profile stays private until a moderator approves it.</Typography><Stack spacing={2}><TextField required label="Public profile URL" value={form.slug} onChange={change('slug')} helperText="Example: maya-sherpa" /><TextField required label="Headline" value={form.headline} onChange={change('headline')} placeholder="Licensed Annapurna and Everest trekking guide" /><TextField required multiline minRows={5} label="About you" value={form.bio} onChange={change('bio')} /><TextField required label="Home region" value={form.homeRegion} onChange={change('homeRegion')} /><TextField label="Languages" value={form.languages} onChange={change('languages')} helperText="Separate languages with commas" /><TextField required type="number" inputProps={{ min: 0 }} label="Years of experience" value={form.yearsExperience} onChange={change('yearsExperience')} /><TextField label="License or certification number" value={form.licenseNumber} onChange={change('licenseNumber')} /><TextField label="License document URL" value={form.licenseDocumentUrl} onChange={change('licenseDocumentUrl')} helperText="Use a secure document URL; public profiles will not expose it." />{message && <Alert severity={message.startsWith('Application') ? 'success' : 'error'}>{message}</Alert>}<AppButton type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit for review'}</AppButton></Stack></Paper></Container></>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return session?.user?.id ? { props: {} } : { redirect: { destination: '/auth/signin?callbackUrl=%2Fguides%2Fapply', permanent: false } };
}