import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Chip, Container, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../lib/auth-options';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';

function formattedDate(value) {
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load notifications');
      setNotifications(data.notifications || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAllRead = async () => {
    const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) });
    if (response.ok) setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  };

  const openNotification = async (notification) => {
    if (!notification.read_at) {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: notification.id }) });
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;
  return (
    <>
      <Head><title>Notifications | NepalTrex</title></Head>
      <SiteHeader />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Box><Typography variant="h3">Notifications</Typography><Typography color="text.secondary">Booking requests and platform tasks assigned to you.</Typography></Box>
            {unreadCount > 0 && <AppButton startIcon={<DoneAllRoundedIcon />} onClick={markAllRead}>Mark all read</AppButton>}
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Paper>
            {loading ? <Typography sx={{ p: 3 }} color="text.secondary">Loading notifications…</Typography> : notifications.length === 0 ? (
              <Stack alignItems="center" spacing={1.5} sx={{ py: 7, px: 3 }}><NotificationsNoneRoundedIcon color="disabled" sx={{ fontSize: 44 }} /><Typography variant="h6">You are all caught up</Typography><Typography color="text.secondary" textAlign="center">New stay and guide reservation requests will appear here.</Typography></Stack>
            ) : (
              <List disablePadding>
                {notifications.map((notification, index) => (
                  <ListItemButton key={notification.id} component={Link} href={notification.href || '/'} onClick={() => openNotification(notification)} divider={index < notifications.length - 1} sx={{ alignItems: 'flex-start', py: 2, bgcolor: notification.read_at ? 'transparent' : 'action.hover' }}>
                    <ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}><Typography fontWeight={notification.read_at ? 600 : 800}>{notification.title}</Typography>{!notification.read_at && <Chip size="small" label="New" color="primary" />}</Box>} secondary={<><Typography component="span" display="block" color="text.primary" sx={{ mt: 0.6 }}>{notification.body}</Typography><Typography component="span" display="block" variant="caption" color="text.secondary" sx={{ mt: 0.7 }}>{formattedDate(notification.created_at)}</Typography></>} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Stack>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.id) return { redirect: { destination: '/auth/signin?callbackUrl=/notifications', permanent: false } };
  return { props: {} };
}