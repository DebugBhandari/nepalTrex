import Head from 'next/head';
import Link from 'next/link';
import { Box, Container, Stack, Typography } from '@mui/material';
import SiteHeader from '../../components/SiteHeader';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import GuideCard from '../../components/GuideCard';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth-options';
import { query } from '../../lib/db';

export default function GuidesPage({ guides, canApply }) {
  const applyAction = canApply ? <AppButton component={Link} href="/guides/apply">Apply as a guide</AppButton> : null;
  return <><Head><title>Find trekking guides | NepalTrex</title><meta name="description" content="Browse approved local trekking guides and request a guided Nepal adventure." /></Head><SiteHeader /><Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}><Stack spacing={1} sx={{ mb: 4 }}><Typography variant="overline" color="primary.main">Local expertise</Typography><Typography variant="h2" sx={{ fontSize: { xs: '2.25rem', md: '3.2rem' } }}>Find a guide for your next trek</Typography><Typography color="text.secondary" maxWidth={680}>Compare approved independent guides, their local knowledge, and ready-to-request packages. Booking requests are confirmed directly by each guide.</Typography></Stack>{guides.length === 0 ? <EmptyState title="Guides are joining soon" description="We are reviewing guide applications. Check back soon." action={applyAction} /> : <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2.25 }}>{guides.map((guide) => <GuideCard key={guide.id} guide={guide} />)}</Box>{canApply && <Box sx={{ mt: 4, textAlign: 'center' }}>{applyAction}</Box>}</>}</Container></>;
}
export async function getServerSideProps(context) { const [result, session] = await Promise.all([query(`SELECT gp.*, COALESCE(NULLIF(u.display_name,''), NULLIF(u.username,''), split_part(u.email,'@',1)) AS guide_name, COALESCE(AVG(r.rating),0)::numeric(3,1) AS avg_rating, COUNT(r.id)::int AS review_count FROM guide_profiles gp JOIN users u ON u.id=gp.user_id LEFT JOIN reviews r ON r.target_type='guide' AND r.target_id=gp.id WHERE gp.approval_status='approved' GROUP BY gp.id,u.id ORDER BY COALESCE(AVG(r.rating),0) DESC, COUNT(r.id) DESC, gp.created_at DESC`), getServerSession(context.req, context.res, authOptions)]); return { props: { guides: result.rows, canApply: session?.user?.role === 'user' } }; }