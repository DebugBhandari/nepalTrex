import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { Alert, Avatar, Box, Chip, CircularProgress, Container, IconButton, List, ListItemButton, ListItemIcon, Menu, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import { authOptions } from '../lib/auth-options';
import AppButton from '../components/AppButton';
import SiteHeader from '../components/SiteHeader';

function formatTime(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

function initials(value) {
  return String(value || 'NepalTrex').trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function ChatsPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [startingDirectChat, setStartingDirectChat] = useState(false);
  const [chatMenu, setChatMenu] = useState(null);

  const loadConversations = useCallback(async () => {
    const response = await fetch('/api/chats');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load chats');
    setConversations(data.conversations || []);
    return data.conversations || [];
  }, []);

  const refreshConversation = useCallback(async (id, showErrors = true) => {
    try {
      const response = await fetch(`/api/chats/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load messages');
      setSelected(data.conversation);
      setCurrentUserId(data.currentUserId || '');
      setMessages(data.messages || []);
      setConversations((items) => items.map((item) => item.id === id ? { ...item, unread_count: 0 } : item));
      window.dispatchEvent(new Event('nepaltrex:chat-read'));
    } catch (loadError) { if (showErrors) setError(loadError.message || 'Could not load messages'); }
  }, []);

  const openConversation = useCallback(async (id) => {
    setSelectedId(id);
    await refreshConversation(id);
  }, [refreshConversation]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const loaded = await loadConversations();
        const requested = new URLSearchParams(window.location.search).get('conversation');
        const initial = loaded.find((item) => item.id === requested)?.id || loaded[0]?.id;
        if (active && initial) await openConversation(initial);
      } catch (loadError) { if (active) setError(loadError.message || 'Could not load chats'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [loadConversations, openConversation]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') loadConversations().catch(() => {});
    };
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible') refreshConversation(selectedId, false);
    };
    const interval = window.setInterval(refresh, 3000);
    return () => window.clearInterval(interval);
  }, [selectedId, refreshConversation]);

  useEffect(() => {
    const search = contactSearch.trim();
    if (search.length < 2) { setContactResults([]); setSearchingContacts(false); return undefined; }
    let active = true;
    const timeout = window.setTimeout(async () => {
      setSearchingContacts(true);
      try {
        const response = await fetch(`/api/chats/contacts?search=${encodeURIComponent(search)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not search users');
        if (active) setContactResults(data.contacts || []);
      } catch (searchError) {
        if (active) { setContactResults([]); setError(searchError.message || 'Could not search users'); }
      } finally { if (active) setSearchingContacts(false); }
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [contactSearch]);

  const contactSupport = async () => {
    try {
      const response = await fetch('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationType: 'support' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not open support chat');
      await loadConversations();
      await openConversation(data.conversation.id);
    } catch (requestError) { setError(requestError.message || 'Could not open support chat'); }
  };

  const startDirectChat = async (contact) => {
    setStartingDirectChat(true);
    try {
      const response = await fetch('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationType: 'direct', userId: contact.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start chat');
      setContactSearch('');
      setContactResults([]);
      await loadConversations();
      await openConversation(data.conversation.id);
    } catch (startError) { setError(startError.message || 'Could not start chat'); }
    finally { setStartingDirectChat(false); }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedId || !body.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`/api/chats/${selectedId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send message');
      setMessages((items) => [...items, data.message]);
      setBody('');
      await loadConversations();
    } catch (sendError) { setError(sendError.message || 'Could not send message'); }
    finally { setSending(false); }
  };

  const removeConversation = async (conversationId = selectedId) => {
    if (!conversationId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/chats/${conversationId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not remove chat');
      const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
      setConversations(remaining);
      if (selectedId === conversationId) {
        setSelectedId('');
        setSelected(null);
        setMessages([]);
        if (remaining[0]) await openConversation(remaining[0].id);
      }
    } catch (removeError) { setError(removeError.message || 'Could not remove chat'); }
    finally { setDeleting(false); }
  };

  const markConversationRead = async (conversationId = selectedId) => {
    if (!conversationId) return;
    try {
      const response = await fetch(`/api/chats/${conversationId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markRead: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not mark chat as read');
      setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, unread_count: 0 } : item));
      window.dispatchEvent(new Event('nepaltrex:chat-read'));
    } catch (readError) { setError(readError.message || 'Could not mark chat as read'); }
    finally { setChatMenu(null); }
  };

  const sendOnEnter = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!sending && body.trim()) sendMessage(event);
    }
  };

  const selectedConversation = conversations.find((item) => item.id === selectedId);
  const pinnedReservations = conversations.filter((conversation) => conversation.conversation_type === 'reservation' && conversation.reservation_status !== 'completed');
  const regularConversations = conversations.filter((conversation) => !pinnedReservations.some((reservation) => reservation.id === conversation.id));
  const renderConversation = (conversation) => (
    <ListItemButton key={conversation.id} selected={conversation.id === selectedId} onClick={() => openConversation(conversation.id)} divider sx={(theme) => Number(conversation.unread_count) > 0 && conversation.id !== selectedId ? { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1) } : undefined}>
      <Avatar src={conversation.contact_image_url || undefined} sx={{ mr: 1.25, width: 40, height: 40 }}>{initials(conversation.contact_name)}</Avatar>
      <Stack flex={1} spacing={0.5} minWidth={0}>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Typography fontWeight={800} noWrap sx={{ flex: 1 }}>{conversation.contact_name || conversation.title}</Typography>
          {conversation.conversation_type === 'reservation' && <PushPinRoundedIcon color="primary" sx={{ fontSize: 16 }} />}
          {Number(conversation.unread_count) > 0 && <Chip label={conversation.unread_count} size="small" color="primary" />}
        </Box>
        <Typography variant="caption" color="text.secondary" noWrap>{conversation.title}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap>{conversation.last_message || (conversation.conversation_type === 'reservation' ? `Reservation ${conversation.reservation_status || 'pending'}` : 'Start the conversation')}</Typography>
      </Stack>
      <IconButton size="small" aria-label={`Options for ${conversation.contact_name || conversation.title}`} sx={{ ml: 0.5 }} onClick={(event) => { event.stopPropagation(); setChatMenu({ anchor: event.currentTarget, conversationId: conversation.id }); }}><MoreVertRoundedIcon fontSize="small" /></IconButton>
    </ListItemButton>
  );

  return (
    <>
      <Head><title>Chats | NepalTrex</title></Head>
      <SiteHeader />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Box>
              <Typography variant="h3">Chats</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>Message people, hosts, guides, and NepalTrex support. Reservation chats stay pinned until the reservation is completed.</Typography>
            </Box>
            <AppButton startIcon={<SupportAgentRoundedIcon />} onClick={contactSupport}>Contact NepalTrex</AppButton>
          </Box>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={800}>Start a conversation</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>Search by a user’s name or username.</Typography>
            <TextField value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} label="Search users" placeholder="Start typing a name…" fullWidth size="small" sx={{ mt: 1.5 }} InputProps={{ endAdornment: searchingContacts ? <CircularProgress size={18} /> : null }} />
            {contactSearch.trim().length >= 2 && !searchingContacts && contactResults.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>No matching users found.</Typography>}
            {contactResults.length > 0 && <List disablePadding sx={{ mt: 1 }}>
              {contactResults.map((contact) => <ListItemButton key={contact.id} onClick={() => startDirectChat(contact)} disabled={startingDirectChat} sx={{ borderRadius: 1.25, gap: 1.25 }}>
                <Avatar src={contact.image_url || undefined}>{initials(contact.name)}</Avatar>
                <Box minWidth={0}><Typography fontWeight={700} noWrap>{contact.name}</Typography>{contact.handle && <Typography variant="caption" color="text.secondary">@{contact.handle}</Typography>}</Box>
                {startingDirectChat && <CircularProgress size={18} sx={{ ml: 'auto' }} />}
              </ListItemButton>)}
            </List>}
          </Paper>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px minmax(0, 1fr)' }, gap: 2 }}>
            <Paper sx={{ overflow: 'hidden' }}>
              {loading ? <Typography sx={{ p: 3 }} color="text.secondary">Loading chats…</Typography> : conversations.length === 0 ? (
                <Stack alignItems="center" spacing={1} sx={{ p: 4, textAlign: 'center' }}>
                  <ChatRoundedIcon color="disabled" sx={{ fontSize: 40 }} />
                  <Typography fontWeight={800}>No chats yet</Typography>
                  <Typography variant="body2" color="text.secondary">Reservation chats and conversations will appear here.</Typography>
                </Stack>
              ) : (
                <List disablePadding>
                  {pinnedReservations.length > 0 && <><Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 2, pt: 1.25, pb: 0.5, fontWeight: 800 }}>Pinned reservations</Typography>{pinnedReservations.map(renderConversation)}</>}
                  {regularConversations.length > 0 && <><Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 2, pt: pinnedReservations.length ? 1.75 : 1.25, pb: 0.5, fontWeight: 800 }}>{pinnedReservations.length ? 'All chats' : 'Chats'}</Typography>{regularConversations.map(renderConversation)}</>}
                </List>
              )}
            </Paper>
            <Paper sx={{ minHeight: 460, display: 'flex', flexDirection: 'column' }}>
              {selected ? (
                <>
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar component={selectedConversation?.contact_handle ? Link : 'div'} href={selectedConversation?.contact_handle ? `/user/${selectedConversation.contact_handle}` : undefined} src={selectedConversation?.contact_image_url || undefined} sx={{ width: 44, height: 44, cursor: selectedConversation?.contact_handle ? 'pointer' : 'default' }}>{initials(selectedConversation?.contact_name)}</Avatar>
                      <Box minWidth={0}>
                        {selectedConversation?.contact_handle ? (
                          <Typography component={Link} href={`/user/${selectedConversation.contact_handle}`} fontWeight={800} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}>{selectedConversation.contact_name}</Typography>
                        ) : <Typography fontWeight={800}>{selectedConversation?.contact_name || selectedConversation?.title || 'Chat'}</Typography>}
                        <Typography variant="caption" color="text.secondary">{selected.status === 'active' ? 'Private booking conversation' : 'Chat becomes available after acceptance'}</Typography>
                      </Box>
                    </Stack>
                    {selectedConversation?.conversation_type === 'reservation' && selectedConversation.stay_slug && <Typography component={Link} href={`/stays/${selectedConversation.stay_slug}`} variant="body2" sx={{ display: 'inline-block', mt: 1.25, color: 'primary.main', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>View stay: {selectedConversation.title}</Typography>}
                  </Box>
                  <Stack spacing={1.25} sx={{ flex: 1, p: 2, overflowY: 'auto', maxHeight: 480 }}>
                    {messages.length === 0 && <Typography color="text.secondary" textAlign="center" sx={{ py: 5 }}>No messages yet.</Typography>}
                    {messages.map((message) => <Box key={message.id} sx={{ alignSelf: message.sender_user_id === currentUserId ? 'flex-end' : 'flex-start', maxWidth: '82%' }}><Paper variant="outlined" title={formatTime(message.created_at)} aria-label={`Message from ${message.sender_name || 'You'}, sent ${formatTime(message.created_at)}`} sx={{ p: 1.25, bgcolor: 'background.default', cursor: 'default' }}><Typography variant="caption" color="text.secondary">{message.sender_name || 'You'}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.body}</Typography></Paper></Box>)}
                  </Stack>
                  {selected.status === 'active' ? <Box component="form" onSubmit={sendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}><TextField value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={sendOnEnter} placeholder="Write a message…" helperText="Enter to send · Shift+Enter for a new line" multiline maxRows={4} fullWidth inputProps={{ maxLength: 4000 }} /><AppButton type="submit" disabled={sending || !body.trim()} sx={{ alignSelf: 'flex-start', height: 40, minWidth: 76 }}>{sending ? 'Sending…' : 'Send'}</AppButton></Box> : <Alert severity="info" sx={{ m: 2 }}>The provider must accept this booking before messaging is enabled.</Alert>}
                </>
              ) : <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, p: 5 }}><ChatRoundedIcon color="disabled" sx={{ fontSize: 48 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>Choose a chat to view messages.</Typography></Stack>}
            </Paper>
          </Box>
          <Menu id="chat-options-menu" anchorEl={chatMenu?.anchor} open={Boolean(chatMenu)} onClose={() => setChatMenu(null)}>
            <MenuItem onClick={() => markConversationRead(chatMenu?.conversationId)}><ListItemIcon><DoneAllRoundedIcon fontSize="small" /></ListItemIcon>Mark as read</MenuItem>
            <MenuItem onClick={() => { const conversationId = chatMenu?.conversationId; setChatMenu(null); removeConversation(conversationId); }} disabled={deleting} sx={{ color: 'error.main' }}><ListItemIcon sx={{ color: 'error.main' }}><DeleteOutlineRoundedIcon fontSize="small" /></ListItemIcon>{deleting ? 'Deleting…' : 'Delete chat'}</MenuItem>
          </Menu>
        </Stack>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.id) return { redirect: { destination: '/auth/signin?callbackUrl=/chats', permanent: false } };
  return { props: {} };
}