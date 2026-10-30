import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';
import { authOptions } from '../lib/auth-options';

const STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'success',
  declined: 'error',
  cancelled: 'default',
  completed: 'primary',
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNights(reservation) {
  const checkIn = new Date(`${String(reservation.checkInDate).slice(0, 10)}T00:00:00.000Z`);
  const checkOut = new Date(`${String(reservation.checkOutDate).slice(0, 10)}T00:00:00.000Z`);
  const nights = Math.round((checkOut - checkIn) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : null;
}

function statusLabel(status) {
  return String(status || 'pending').charAt(0).toUpperCase() + String(status || 'pending').slice(1);
}

function ReservationCard({ reservation, onCancel, cancelling }) {
  const nights = getNights(reservation);
  const isPending = reservation.status === 'pending';
  const holdExpiry = reservation.holdExpiresAt ? new Date(reservation.holdExpiresAt) : null;
  const holdIsActive = isPending && holdExpiry && holdExpiry > new Date();
  const canCancel = reservation.status === 'confirmed' || holdIsActive;

  return (
      <Card variant="outlined" sx={(theme) => ({ borderRadius: 2.5, overflow: 'hidden', borderColor: reservation.status === 'confirmed' ? theme.palette.success.main : theme.palette.divider })}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2.5}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={800}>{reservation.stayName || 'Stay reservation'}</Typography>
              <Chip label={statusLabel(reservation.status)} color={STATUS_COLORS[reservation.status] || 'default'} size="small" variant="outlined" />
            </Stack>
            {reservation.stayLocation && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>{reservation.stayLocation}</Typography>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2.5 }} sx={{ mt: 2 }}>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <CalendarMonthRoundedIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {formatDate(reservation.checkInDate)} – {formatDate(reservation.checkOutDate)}{nights ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <PeopleAltRoundedIcon fontSize="small" color="action" />
                <Typography variant="body2">{reservation.guestCount} guest{reservation.guestCount === 1 ? '' : 's'}</Typography>
              </Stack>
            </Stack>

            <Stack spacing={0.55} sx={{ mt: 2 }}>
              {(reservation.items || []).map((item) => (
                <Stack key={item.roomId} direction="row" spacing={0.8} alignItems="center">
                  <HotelRoundedIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {item.roomName} · {item.units} room{item.units === 1 ? '' : 's'} · NPR {Number(item.nightlyPrice).toLocaleString()}/night
                  </Typography>
                </Stack>
              ))}
            </Stack>

            {holdIsActive && (
              <Alert severity="info" sx={{ mt: 2, py: 0 }}>
                Your request is held for the host until {holdExpiry.toLocaleString()}.
              </Alert>
            )}
            {isPending && !holdIsActive && (
              <Alert severity="warning" sx={{ mt: 2, py: 0 }}>
                This request is awaiting host review or its hold has expired.
              </Alert>
            )}
            {reservation.hostNote && (
              <Paper variant="outlined" sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">Host note</Typography>
                <Typography variant="body2" sx={{ mt: 0.35 }}>{reservation.hostNote}</Typography>
              </Paper>
            )}
          </Box>

          <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1.25} sx={{ minWidth: { md: 160 } }}>
            <Typography variant="h6" fontWeight={800} color="primary.main">NPR {Number(reservation.totalPrice || 0).toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">Requested {formatDate(reservation.createdAt)}</Typography>
            {reservation.staySlug && <AppButton component={Link} href={`/stays/${reservation.staySlug}`} variant="outlined" size="small">View stay</AppButton>}
            {canCancel && (
              <AppButton variant="outlined" color="error" size="small" disabled={cancelling} onClick={() => onCancel(reservation)}>
                {cancelling ? 'Cancelling…' : 'Cancel request'}
              </AppButton>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/reservations/my');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load reservations');
      setReservations(data.reservations || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const cancelReservation = async (reservation) => {
    if (!window.confirm(`Cancel your reservation request for ${reservation.stayName || 'this stay'}?`)) return;
    setCancellingId(reservation.id);
    setError('');
    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to cancel this reservation');
      setReservations((current) => current.map((item) => (item.id === reservation.id ? { ...item, status: data.reservation.status, updatedAt: data.reservation.updated_at || item.updatedAt } : item)));
    } catch (cancelError) {
      setError(cancelError.message || 'Unable to cancel this reservation');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <>
      <Head><title>My Reservations | NepalTrex</title></Head>
      <SiteHeader />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing="0.13em">Your trip base</Typography>
            <Typography variant="h2" component="h1" sx={{ mt: 0.35 }}>My stay requests</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.8, maxWidth: 620 }}>Track requested dates, host decisions, and your upcoming places to rest—all in one clear itinerary.</Typography>
          </Box>

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {loading ? (
            <Stack spacing={2}>{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} variant="rounded" height={210} />)}</Stack>
          ) : reservations.length === 0 ? (
            <Paper variant="outlined" sx={{ py: 7, px: 3, textAlign: 'center', borderRadius: 2 }}>
              <HotelRoundedIcon color="action" sx={{ fontSize: 44, mb: 1 }} />
              <Typography variant="h6" fontWeight={800}>Your next rest stop is waiting</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.7, mb: 2.25 }}>Find a stay, choose your dates, and send one booking request to the host.</Typography>
              <AppButton component={Link} href="/stays">Find a stay</AppButton>
            </Paper>
          ) : (
            <Stack spacing={2}>{reservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} onCancel={cancelReservation} cancelling={cancellingId === reservation.id} />)}</Stack>
          )}
        </Stack>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=%2Freservations',
        permanent: false,
      },
    };
  }
  return { props: {} };
}