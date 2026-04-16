import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useMemo } from 'react';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import DoneAllIcon from '@mui/icons-material/TaskAlt';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { authOptions } from '../lib/auth-options';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';
import NepalTrexLogo from '../components/NepalTrexLogo';

const STAY_TYPES = ['hotel', 'homestay'];
const MENU_CATEGORIES = ['room', 'food'];
const DEFAULT_STAY_IMAGE = 'https://placehold.co/1000x620?text=NepalTrex+Stay';
const DEFAULT_MENU_IMAGE = 'https://placehold.co/600x380?text=Menu+Item';
const ADMIN_ORDER_FILTERS_STORAGE_KEY = 'nepaltrex-admin-order-filters';
const ADMIN_ORDER_COLLAPSE_STORAGE_KEY = 'nepaltrex-admin-order-collapsed';

function normalizeHandle(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

function initialsFromName(value) {
  const text = String(value || '').trim();
  if (!text) return 'NT';
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase() || first.toUpperCase() || 'NT';
}

function makeSlug(input) {
  return input
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .replace(/-+/g, '-');
}

function newMenuItem(category = 'room') {
  return { category, name: '', description: '', price: 0, imageUrl: DEFAULT_MENU_IMAGE, available: true };
}

function normalizeMenuItems(items) {
  return (items || []).map((item) => ({
    category: item.category,
    name: item.name,
    description: item.description || '',
    price: Number(item.price || 0),
    imageUrl: item.imageUrl || DEFAULT_MENU_IMAGE,
    available: item.available !== false,
  }));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export default function AdminPage({ user, initialStays }) {
  const router = useRouter();
  const [stays, setStays] = useState(initialStays);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingById, setEditingById] = useState({});
  const [menuOpenById, setMenuOpenById] = useState({});

  const [orders, setOrders] = useState([]);
  const [orderFilterByStayId, setOrderFilterByStayId] = useState({});
  const [orderCollapsedByStayId, setOrderCollapsedByStayId] = useState({});
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [staySearch, setStaySearch] = useState('');
  const [showStayFilters, setShowStayFilters] = useState(false);
  const [showOrderFilters, setShowOrderFilters] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);

  const isUserMenuOpen = Boolean(userMenuAnchor);
  const isNotificationsOpen = Boolean(notificationsAnchor);
  const isSuperUser = user?.role === 'superUser';
  const isAdminOrSuperUser = ['admin', 'superUser'].includes(user?.role || '');
  const profileHandle = normalizeHandle(user?.name || (user?.email || '').split('@')[0]);
  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const visibleStays = useMemo(() => {
    if (!isSuperUser) {
      return stays;
    }

    const needle = staySearch.trim().toLowerCase();
    if (!needle) {
      return stays;
    }

    return stays.filter((stay) => {
      const stayName = String(stay.name || '').toLowerCase();
      const ownerValue = String(stay.ownerEmail || '').toLowerCase();
      return stayName.includes(needle) || ownerValue.includes(needle);
    });
  }, [isSuperUser, stays, staySearch]);

  const openOrderFromMenu = (orderId) => {
    setNotificationsAnchor(null);
    router.push(`/admin?orderId=${encodeURIComponent(orderId)}`);
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      const fetchedOrders = data.orders || [];

      setOrders(fetchedOrders);
      if (!ordersLoaded) {
        setOrdersLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      if (!ordersLoaded) {
        setOrdersLoaded(true);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [ordersLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedOrderFilters = window.localStorage.getItem(ADMIN_ORDER_FILTERS_STORAGE_KEY);
      if (savedOrderFilters) {
        const parsed = JSON.parse(savedOrderFilters);
        if (parsed && typeof parsed === 'object') {
          setOrderFilterByStayId(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to parse saved admin order filters:', error);
    }

    try {
      const savedCollapsed = window.localStorage.getItem(ADMIN_ORDER_COLLAPSE_STORAGE_KEY);
      if (savedCollapsed) {
        const parsed = JSON.parse(savedCollapsed);
        if (parsed && typeof parsed === 'object') {
          setOrderCollapsedByStayId(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to parse saved admin order collapse state:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADMIN_ORDER_FILTERS_STORAGE_KEY, JSON.stringify(orderFilterByStayId));
  }, [orderFilterByStayId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADMIN_ORDER_COLLAPSE_STORAGE_KEY, JSON.stringify(orderCollapsedByStayId));
  }, [orderCollapsedByStayId]);

  useEffect(() => {
    const queryOrderId = router.query?.orderId;
    if (!queryOrderId || !orders.length) return;

    const targetOrder = orders.find((order) => String(order.id) === String(queryOrderId));
    if (targetOrder?.stayId) {
      setOrderCollapsedByStayId((prev) => ({
        ...prev,
        [targetOrder.stayId]: false,
      }));
    }

    const timer = setTimeout(() => {
      const targetElement = document.getElementById(`order-${String(queryOrderId)}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [router.query?.orderId, orders]);

  const [newStay, setNewStay] = useState({
    name: '', slug: '', stayType: 'homestay', location: '', latitude: '', longitude: '',
    description: '', imageUrl: DEFAULT_STAY_IMAGE, contactPhone: '',
    menuItems: [newMenuItem('room'), newMenuItem('food')],
  });

  const updateDraft = (id, field, value) =>
    setStays((prev) => prev.map((stay) => (stay.id === id ? { ...stay, [field]: value } : stay)));

  const updateStayMenuItem = (stayId, index, field, value) =>
    setStays((prev) =>
      prev.map((stay) => {
        if (stay.id !== stayId) return stay;
        const nextMenu = [...(stay.menuItems || [])];
        nextMenu[index] = { ...nextMenu[index], [field]: value };
        return { ...stay, menuItems: nextMenu };
      })
    );

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    setMessage('');
    try {
      const r = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.error || 'Failed to update order status');
      }

      if (r.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: data.order.status } : o)));
        setMessage(`Order status updated to ${data.order.status}.`);
      }
    } catch (error) {
      setMessage(error.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId('');
    }
  };

  const toggleMenuItemAvailable = (stayId, index) =>
    setStays((prev) =>
      prev.map((stay) => {
        if (stay.id !== stayId) return stay;
        const nextMenu = [...(stay.menuItems || [])];
        nextMenu[index] = { ...nextMenu[index], available: nextMenu[index].available === false };
        return { ...stay, menuItems: nextMenu };
      })
    );

  const addStayMenuItem = (stayId, category) =>
    setStays((prev) =>
      prev.map((stay) =>
        stay.id === stayId
          ? { ...stay, menuItems: [...(stay.menuItems || []), newMenuItem(category)] }
          : stay
      )
    );

  const removeStayMenuItem = (stayId, index) =>
    setStays((prev) =>
      prev.map((stay) => {
        if (stay.id !== stayId) return stay;
        const nextMenu = (stay.menuItems || []).filter((_, i) => i !== index);
        return { ...stay, menuItems: nextMenu.length > 0 ? nextMenu : [newMenuItem('room')] };
      })
    );

  const updateNewMenuItem = (index, field, value) =>
    setNewStay((prev) => {
      const nextMenu = [...prev.menuItems];
      nextMenu[index] = { ...nextMenu[index], [field]: value };
      return { ...prev, menuItems: nextMenu };
    });

  const addNewMenuItem = (category) =>
    setNewStay((prev) => ({ ...prev, menuItems: [...prev.menuItems, newMenuItem(category)] }));

  const removeNewMenuItem = (index) =>
    setNewStay((prev) => {
      const nextMenu = prev.menuItems.filter((_, i) => i !== index);
      return { ...prev, menuItems: nextMenu.length > 0 ? nextMenu : [newMenuItem('room')] };
    });

  const handleNewStayImageUpload = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) return;
      setNewStay((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch (error) {
      setMessage(error.message || 'Failed to upload stay image');
    }
  };

  const handleStayImageUpload = async (stayId, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) return;
      updateDraft(stayId, 'imageUrl', dataUrl);
    } catch (error) {
      setMessage(error.message || 'Failed to upload stay image');
    }
  };

  const handleNewMenuImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) return;
      updateNewMenuItem(index, 'imageUrl', dataUrl);
    } catch (error) {
      setMessage(error.message || 'Failed to upload menu image');
    }
  };

  const handleStayMenuImageUpload = async (stayId, index, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) return;
      updateStayMenuItem(stayId, index, 'imageUrl', dataUrl);
    } catch (error) {
      setMessage(error.message || 'Failed to upload menu image');
    }
  };

  const createStay = async () => {
    setCreating(true);
    setMessage('');
    try {
      const payload = {
        ...newStay,
        slug: newStay.slug.trim() || makeSlug(newStay.name),
        latitude: newStay.latitude === '' ? null : Number(newStay.latitude),
        longitude: newStay.longitude === '' ? null : Number(newStay.longitude),
        menuItems: normalizeMenuItems(newStay.menuItems),
      };
      const response = await fetch('/api/stays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create stay');
      setStays((prev) => [
        {
          id: data.stay.id, name: data.stay.name, slug: data.stay.slug, stayType: data.stay.stay_type,
          location: data.stay.location, latitude: data.stay.latitude ?? '', longitude: data.stay.longitude ?? '',
          description: data.stay.description, imageUrl: data.stay.image_url || DEFAULT_STAY_IMAGE,
          menuItems: data.stay.menu_items || [], contactPhone: data.stay.contact_phone || '',
          ownerEmail: data.stay.owner_email || null,
        },
        ...prev,
      ]);
      setMessage('Stay registered successfully.');
      setShowNewForm(false);
      setNewStay({ name: '', slug: '', stayType: 'homestay', location: '', latitude: '', longitude: '', description: '', imageUrl: DEFAULT_STAY_IMAGE, contactPhone: '', menuItems: [newMenuItem('room'), newMenuItem('food')] });
    } catch (error) {
      setMessage(error.message || 'Failed to create stay');
    } finally {
      setCreating(false);
    }
  };

  const updateStay = async (stay) => {
    setSavingId(stay.id);
    setMessage('');
    try {
      const response = await fetch(`/api/stays/${stay.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...stay, latitude: stay.latitude === '' ? null : Number(stay.latitude), longitude: stay.longitude === '' ? null : Number(stay.longitude), menuItems: normalizeMenuItems(stay.menuItems) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update stay');
      setStays((prev) =>
        prev.map((entry) =>
          entry.id === stay.id
            ? { ...entry, name: data.stay.name, slug: data.stay.slug, stayType: data.stay.stay_type, location: data.stay.location, latitude: data.stay.latitude ?? '', longitude: data.stay.longitude ?? '', description: data.stay.description, imageUrl: data.stay.image_url || DEFAULT_STAY_IMAGE, menuItems: data.stay.menu_items || [], contactPhone: data.stay.contact_phone || '' }
            : entry
        )
      );
      setEditingById((prev) => ({ ...prev, [stay.id]: false }));
      setMessage(`Updated ${data.stay.name}.`);
    } catch (error) {
      setMessage(error.message || 'Failed to update stay');
    } finally {
      setSavingId('');
    }
  };

  return (
    <>
      <Head><title>Admin Dashboard | NepalTrex</title></Head>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Box
            component={Link}
            href="/"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.3,
              minWidth: 0,
              textDecoration: 'none',
              mr: 'auto',
            }}
          >
            <NepalTrexLogo width={180} />
          </Box>
          <IconButton
            color="inherit"
            onClick={(event) => setNotificationsAnchor(event.currentTarget)}
            sx={(theme) => ({
              border: '1px solid',
              borderColor: theme.palette.divider,
              borderRadius: 999,
              p: 0.25,
              width: 42,
              height: 42,
              mr: 1,
            })}
            aria-label="Open order notifications"
          >
            <Badge badgeContent={pendingOrders.length} color="error" max={99}>
              <NotificationsNoneIcon sx={{ fontSize: 24 }} />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notificationsAnchor}
            open={isNotificationsOpen}
            onClose={() => setNotificationsAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: 340, maxWidth: 'calc(100vw - 24px)' } }}
          >
            <MenuItem disabled sx={{ opacity: 1, fontWeight: 700 }}>
              Pending Orders ({pendingOrders.length})
            </MenuItem>
            <Divider />
            {pendingOrders.length === 0 ? (
              <MenuItem disabled>No pending orders.</MenuItem>
            ) : (
              pendingOrders.map((order) => (
                <MenuItem key={order.id} onClick={() => openOrderFromMenu(order.id)} sx={{ whiteSpace: 'normal', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{order.stayName}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {order.customerName} · {order.quantity} item{order.quantity === 1 ? '' : 's'} · NPR {Number(order.totalPrice).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {new Date(order.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Menu>
          <IconButton
            color="inherit"
            onClick={(event) => setUserMenuAnchor(event.currentTarget)}
            sx={(theme) => ({
              border: '1px solid',
              borderColor: theme.palette.divider,
              borderRadius: 999,
              p: 0.25,
              width: 42,
              height: 42,
            })}
            aria-label="Open user menu"
          >
            <Avatar
              src={user?.image || ''}
              alt={user?.name || user?.email || 'User'}
              sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}
            >
              {initialsFromName(user?.name || user?.email)}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={userMenuAnchor}
            open={isUserMenuOpen}
            onClose={() => setUserMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem component={Link} href="/" onClick={() => setUserMenuAnchor(null)}>
              <HomeIcon fontSize="small" style={{ marginRight: 8 }} />
              Home
            </MenuItem>
            <MenuItem component={Link} href={`/user/${profileHandle}`} onClick={() => setUserMenuAnchor(null)}>
              <PersonIcon fontSize="small" style={{ marginRight: 8 }} />
              Profile
            </MenuItem>
            {isSuperUser && (
              <MenuItem component={Link} href="/dashboard" onClick={() => setUserMenuAnchor(null)}>
                <DashboardIcon fontSize="small" style={{ marginRight: 8 }} />
                Super Dashboard
              </MenuItem>
            )}
            {isAdminOrSuperUser && (
              <MenuItem component={Link} href="/admin" onClick={() => setUserMenuAnchor(null)}>
                <DashboardIcon fontSize="small" style={{ marginRight: 8 }} />
                Admin Dashboard
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setUserMenuAnchor(null);
                signOut({ callbackUrl: '/' });
              }}
            >
              <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper sx={(theme) => ({ p: { xs: 2, md: 3 }, background: theme.palette.mode === 'dark' ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f2fbf9 100%)' })}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
            <Box>
              <Typography variant="h4">Manage Your Hotels and Homestays</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>Signed in as {user.email} ({user.role})</Typography>
            </Box>
          </Stack>

          {message && <Alert sx={{ mb: 2 }} severity="info">{message}</Alert>}

          {/* Add New Stay */}
          <Box sx={{ mt: 3 }}>
            <AppButton variant={showNewForm ? 'outlined' : 'contained'} startIcon={<AddIcon />} onClick={() => setShowNewForm((f) => !f)}>
              {showNewForm ? 'Cancel' : 'Add New Stay'}
            </AppButton>
          </Box>

          {showNewForm && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Register New Stay</Typography>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField label="Name" value={newStay.name} onChange={(e) => setNewStay((p) => ({ ...p, name: e.target.value }))} fullWidth />
                    <TextField label="Slug (optional)" helperText="Auto-generated from name if empty" value={newStay.slug} onChange={(e) => setNewStay((p) => ({ ...p, slug: e.target.value }))} fullWidth />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="new-stay-type">Type</InputLabel>
                      <Select labelId="new-stay-type" label="Type" value={newStay.stayType} onChange={(e) => setNewStay((p) => ({ ...p, stayType: e.target.value }))}>
                        {STAY_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField label="Location" value={newStay.location} onChange={(e) => setNewStay((p) => ({ ...p, location: e.target.value }))} fullWidth />
                    <TextField label="Contact Phone" value={newStay.contactPhone} onChange={(e) => setNewStay((p) => ({ ...p, contactPhone: e.target.value }))} fullWidth />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField label="Latitude" type="number" value={newStay.latitude} onChange={(e) => setNewStay((p) => ({ ...p, latitude: e.target.value }))} fullWidth inputProps={{ step: 'any' }} />
                    <TextField label="Longitude" type="number" value={newStay.longitude} onChange={(e) => setNewStay((p) => ({ ...p, longitude: e.target.value }))} fullWidth inputProps={{ step: 'any' }} />
                  </Stack>
                  <TextField label="Description" multiline minRows={3} value={newStay.description} onChange={(e) => setNewStay((p) => ({ ...p, description: e.target.value }))} fullWidth />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                    <TextField
                      label="Stay Image URL"
                      value={newStay.imageUrl}
                      onChange={(e) => setNewStay((p) => ({ ...p, imageUrl: e.target.value }))}
                      fullWidth
                    />
                    <AppButton component="label" variant="outlined" sx={{ whiteSpace: 'nowrap' }}>
                      Upload Stay Image
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          handleNewStayImageUpload(file);
                          event.target.value = '';
                        }}
                      />
                    </AppButton>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Menu Items</Typography>
                    <Stack direction="row" spacing={1}>
                      <AppButton size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addNewMenuItem('room')}>Room</AppButton>
                      <AppButton size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addNewMenuItem('food')}>Food</AppButton>
                    </Stack>
                  </Stack>
                  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
                    {(newStay.menuItems || []).map((item, index) => (
                      <Card key={`new-menu-${index}`} elevation={1}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Chip size="small" color="secondary" label={`${item.category} #${index + 1}`} />
                            <AppButton size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={() => removeNewMenuItem(index)} sx={{ minWidth: 'auto', px: 1 }}>Remove</AppButton>
                          </Stack>
                          <Stack spacing={0.8}>
                            <FormControl size="small" fullWidth>
                              <InputLabel id={`new-menu-cat-${index}`}>Category</InputLabel>
                              <Select labelId={`new-menu-cat-${index}`} label="Category" value={item.category} onChange={(e) => updateNewMenuItem(index, 'category', e.target.value)}>
                                {MENU_CATEGORIES.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                              </Select>
                            </FormControl>
                            <TextField label="Item Name" value={item.name} size="small" fullWidth onChange={(e) => updateNewMenuItem(index, 'name', e.target.value)} />
                            <TextField label="Description" value={item.description} size="small" fullWidth onChange={(e) => updateNewMenuItem(index, 'description', e.target.value)} />
                            <TextField label="Price (NPR)" type="number" value={item.price} size="small" fullWidth onChange={(e) => updateNewMenuItem(index, 'price', Number(e.target.value || 0))} />
                            <TextField
                              label="Image URL"
                              value={item.imageUrl || DEFAULT_MENU_IMAGE}
                              size="small"
                              fullWidth
                              onChange={(e) => updateNewMenuItem(index, 'imageUrl', e.target.value)}
                            />
                            <AppButton component="label" size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
                              Upload Image
                              <input
                                hidden
                                type="file"
                                accept="image/*"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  handleNewMenuImageUpload(index, file);
                                  event.target.value = '';
                                }}
                              />
                            </AppButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                  <AppButton variant="contained" onClick={createStay} disabled={creating} sx={{ alignSelf: 'flex-start' }}>
                    {creating ? 'Registering...' : 'Register Stay'}
                  </AppButton>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>Your Registered Stays ({stays.length})</Typography>

          {isSuperUser && (
            <Box sx={{ mb: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                <AppButton variant="outlined" onClick={() => setShowStayFilters((prev) => !prev)}>
                  {showStayFilters ? 'Hide Filters' : 'Filters'}
                </AppButton>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Showing {visibleStays.length} stay{visibleStays.length === 1 ? '' : 's'}
                </Typography>
              </Stack>
              {showStayFilters && (
                <TextField
                  fullWidth
                  size="small"
                  label="Search stays by owner or stay name"
                  placeholder="Type stay name or owner email"
                  value={staySearch}
                  onChange={(event) => setStaySearch(event.target.value)}
                  sx={{ mt: 1.2 }}
                />
              )}
            </Box>
          )}

          <Stack spacing={3}>
            {visibleStays.map((stay) => {
              const isEditing = Boolean(editingById[stay.id]);
              const isMenuOpen = Boolean(menuOpenById[stay.id]);
              const isSaving = savingId === stay.id;
              const isOrdersCollapsed = Boolean(orderCollapsedByStayId[stay.id]);
              const availableCount = (stay.menuItems || []).filter((m) => m.available !== false).length;
              const totalCount = (stay.menuItems || []).length;
              const stayOrderFilter = orderFilterByStayId[stay.id] || 'all';
              const stayOrders = orders.filter((order) => String(order.stayId) === String(stay.id));
              const visibleStayOrders =
                stayOrderFilter === 'active'
                  ? stayOrders.filter((order) => !['completed', 'declined', 'cancelled'].includes(order.status))
                  : stayOrders;

              return (
                <Card key={stay.id} sx={(theme) => ({ background: theme.palette.mode === 'dark' ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)' : 'linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(242,251,249,0.98) 100%)', color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary, border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 24px rgba(15,23,42,0.1)' })}>

                  <CardMedia component="img" height="220" image={stay.imageUrl || DEFAULT_STAY_IMAGE} alt={stay.name} sx={{ objectFit: 'cover' }} />

                  <CardContent>
                    <Typography variant="h5" sx={{ mb: 1 }}>{stay.name}</Typography>
                    <Stack direction="row" spacing={0.8} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.6 }}>
                      <Chip color="secondary" size="small" label={stay.stayType} sx={{ textTransform: 'capitalize' }} />
                      {stay.location && <Chip variant="outlined" size="small" label={stay.location} />}
                      {stay.contactPhone && <Chip variant="outlined" size="small" label={stay.contactPhone} />}
                      {stay.ownerEmail && <Chip variant="outlined" size="small" label={stay.ownerEmail} />}
                    </Stack>
                    <Typography color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {stay.description}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <AppButton variant={isEditing ? 'contained' : 'outlined'} startIcon={<EditIcon />} onClick={() => setEditingById((prev) => ({ ...prev, [stay.id]: !isEditing }))} sx={{ height: 40 }}>
                        {isEditing ? 'Close Edit' : 'Edit Details'}
                      </AppButton>
                      <AppButton variant={isMenuOpen ? 'contained' : 'outlined'} startIcon={<MenuBookIcon />} onClick={() => setMenuOpenById((prev) => ({ ...prev, [stay.id]: !isMenuOpen }))}>
                        {isMenuOpen ? 'Close Menu' : 'Manage Menu'}
                        <Chip size="small" label={`${availableCount}/${totalCount}`} variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.68rem', color: 'inherit', borderColor: 'currentColor' }} />
                      </AppButton>
                      <AppButton component={Link} href={`/stays/${stay.slug}`} variant="outlined" startIcon={<VisibilityIcon />} target="_blank">View Page</AppButton>
                    </Stack>
                  </CardContent>

                  {isEditing && (
                    <>
                      <Divider />
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Edit Details</Typography>
                        <Stack spacing={1.5}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField label="Name" value={stay.name} onChange={(e) => updateDraft(stay.id, 'name', e.target.value)} disabled={isSaving} fullWidth />
                            <TextField label="Slug" value={stay.slug} onChange={(e) => updateDraft(stay.id, 'slug', e.target.value)} disabled={isSaving} fullWidth />
                          </Stack>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <FormControl size="small" fullWidth disabled={isSaving}>
                              <InputLabel id={`type-${stay.id}`}>Type</InputLabel>
                              <Select labelId={`type-${stay.id}`} label="Type" value={stay.stayType} onChange={(e) => updateDraft(stay.id, 'stayType', e.target.value)}>
                                {STAY_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                              </Select>
                            </FormControl>
                            <TextField label="Location" value={stay.location} onChange={(e) => updateDraft(stay.id, 'location', e.target.value)} disabled={isSaving} fullWidth />
                            <TextField label="Contact Phone" value={stay.contactPhone || ''} onChange={(e) => updateDraft(stay.id, 'contactPhone', e.target.value)} disabled={isSaving} fullWidth />
                          </Stack>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField label="Latitude" type="number" value={stay.latitude} onChange={(e) => updateDraft(stay.id, 'latitude', e.target.value)} disabled={isSaving} fullWidth inputProps={{ step: 'any' }} />
                            <TextField label="Longitude" type="number" value={stay.longitude} onChange={(e) => updateDraft(stay.id, 'longitude', e.target.value)} disabled={isSaving} fullWidth inputProps={{ step: 'any' }} />
                          </Stack>
                          <TextField label="Description" multiline minRows={3} value={stay.description} onChange={(e) => updateDraft(stay.id, 'description', e.target.value)} disabled={isSaving} fullWidth />
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                            <TextField
                              label="Stay Image URL"
                              value={stay.imageUrl || DEFAULT_STAY_IMAGE}
                              onChange={(e) => updateDraft(stay.id, 'imageUrl', e.target.value)}
                              disabled={isSaving}
                              fullWidth
                            />
                            <AppButton component="label" variant="outlined" disabled={isSaving} sx={{ whiteSpace: 'nowrap' }}>
                              Upload Stay Image
                              <input
                                hidden
                                type="file"
                                accept="image/*"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  handleStayImageUpload(stay.id, file);
                                  event.target.value = '';
                                }}
                              />
                            </AppButton>
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <AppButton variant="contained" onClick={() => updateStay(stay)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Details'}</AppButton>
                            <AppButton variant="outlined" onClick={() => setEditingById((prev) => ({ ...prev, [stay.id]: false }))} disabled={isSaving}>Cancel</AppButton>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </>
                  )}

                  {isMenuOpen && (
                    <>
                      <Divider />
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Menu Items</Typography>
                            <Typography variant="caption" color="text.secondary">Toggle to show or hide items on the public page</Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <AppButton size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addStayMenuItem(stay.id, 'room')} disabled={isSaving}>Room</AppButton>
                            <AppButton size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addStayMenuItem(stay.id, 'food')} disabled={isSaving}>Food</AppButton>
                          </Stack>
                        </Stack>

                        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>
                          {(stay.menuItems || []).map((item, index) => (
                            <Card key={`${stay.id}-menu-${index}`} elevation={1} sx={{ opacity: item.available === false ? 0.55 : 1, transition: 'opacity 0.2s', border: '1px solid', borderColor: item.available === false ? 'error.main' : 'divider' }}>
                              <CardMedia component="img" height="110" image={item.imageUrl || DEFAULT_MENU_IMAGE} alt={item.name || 'Menu item'} sx={{ objectFit: 'cover' }} />
                              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                                  <Chip size="small" label={item.category} color={item.category === 'room' ? 'secondary' : 'default'} />
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Typography variant="caption" color={item.available === false ? 'error' : 'success.main'}>
                                      {item.available === false ? 'Hidden' : 'Visible'}
                                    </Typography>
                                    <Switch size="small" checked={item.available !== false} onChange={() => toggleMenuItemAvailable(stay.id, index)} color="success" />
                                  </Stack>
                                </Stack>
                                <Stack spacing={0.8}>
                                  <TextField label="Item Name" value={item.name} size="small" fullWidth onChange={(e) => updateStayMenuItem(stay.id, index, 'name', e.target.value)} disabled={isSaving} />
                                  <TextField label="Description" value={item.description || ''} size="small" fullWidth onChange={(e) => updateStayMenuItem(stay.id, index, 'description', e.target.value)} disabled={isSaving} />
                                  <TextField label="Price (NPR)" type="number" value={item.price} size="small" fullWidth onChange={(e) => updateStayMenuItem(stay.id, index, 'price', Number(e.target.value || 0))} disabled={isSaving} />
                                  <TextField
                                    label="Image URL"
                                    value={item.imageUrl || DEFAULT_MENU_IMAGE}
                                    size="small"
                                    fullWidth
                                    onChange={(e) => updateStayMenuItem(stay.id, index, 'imageUrl', e.target.value)}
                                    disabled={isSaving}
                                  />
                                  <AppButton component="label" size="small" variant="outlined" disabled={isSaving} sx={{ alignSelf: 'flex-start' }}>
                                    Upload Image
                                    <input
                                      hidden
                                      type="file"
                                      accept="image/*"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        handleStayMenuImageUpload(stay.id, index, file);
                                        event.target.value = '';
                                      }}
                                    />
                                  </AppButton>
                                  <AppButton size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={() => removeStayMenuItem(stay.id, index)} disabled={isSaving}>Remove</AppButton>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Box>

                        {(stay.menuItems || []).length === 0 && (
                          <Typography color="text.secondary" sx={{ mb: 1.5 }}>No menu items yet. Add rooms or food above.</Typography>
                        )}
                        <Box sx={{ mt: 2 }}>
                          <AppButton variant="contained" onClick={() => updateStay(stay)} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Menu Changes'}</AppButton>
                        </Box>
                      </CardContent>
                    </>
                  )}

                  <Divider />
                  <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.2} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Orders{ordersLoaded ? ` (${visibleStayOrders.length})` : ''}
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <AppButton size="small" variant="outlined" onClick={() => setShowOrderFilters((prev) => !prev)}>
                          {showOrderFilters ? 'Hide Filters' : 'Filters'}
                        </AppButton>
                        {showOrderFilters && (
                          <FormControl size="small" sx={{ minWidth: 170 }}>
                            <InputLabel id={`admin-order-filter-${stay.id}`}>Order Filter</InputLabel>
                            <Select
                              labelId={`admin-order-filter-${stay.id}`}
                              label="Order Filter"
                              value={stayOrderFilter}
                              onChange={(event) =>
                                setOrderFilterByStayId((prev) => ({
                                  ...prev,
                                  [stay.id]: event.target.value,
                                }))
                              }
                            >
                              <MenuItem value="all">All Orders</MenuItem>
                              <MenuItem value="active">Active Orders</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                        <AppButton
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            setOrderCollapsedByStayId((prev) => ({
                              ...prev,
                              [stay.id]: !isOrdersCollapsed,
                            }))
                          }
                        >
                          {isOrdersCollapsed ? 'Expand Orders' : 'Collapse Orders'}
                        </AppButton>
                      </Stack>
                    </Stack>

                    {!isOrdersCollapsed && !ordersLoaded && <Typography color="text.secondary">Loading orders...</Typography>}

                    {!isOrdersCollapsed && ordersLoaded && visibleStayOrders.length === 0 && (
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="text.secondary">No orders for this stay.</Typography>
                      </Paper>
                    )}

                    {!isOrdersCollapsed && (
                      <Stack spacing={2}>
                        {visibleStayOrders.map((order) => {
                        const isUpdating = updatingOrderId === order.id;
                        const statusColor =
                          order.status === 'completed'
                            ? 'success'
                            : order.status === 'accepted'
                              ? 'primary'
                              : order.status === 'declined'
                                ? 'error'
                                : order.status === 'cancelled'
                                  ? 'warning'
                                  : 'default';
                        return (
                          <Card key={order.id} id={`order-${order.id}`}>
                            <CardContent>
                              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={1.5}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography fontWeight={700}>{order.stayName}</Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.8 }}>
                                    {order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'} in this order
                                  </Typography>
                                  {Array.isArray(order.items) && order.items.length > 0 && (
                                    <Stack spacing={0.6} sx={{ mb: 1.1 }}>
                                      {order.items.map((entry) => (
                                        <Typography key={entry.id} variant="body2" color="text.secondary">
                                          {entry.menuItemName} ({entry.menuItemCategory}) &times; {entry.quantity} - NPR {Number(entry.totalPrice).toLocaleString()}
                                        </Typography>
                                      ))}
                                    </Stack>
                                  )}
                                  <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                    <Chip size="small" label={order.customerName} />
                                    {order.customerPhone && <Chip size="small" variant="outlined" label={order.customerPhone} />}
                                    {order.customerEmail && <Chip size="small" variant="outlined" label={order.customerEmail} />}
                                    <Chip size="small" variant="outlined" label={`Created by: ${order.createdBy || 'Unknown'}`} />
                                    <Chip size="small" variant="outlined" label={`Assigned to: ${order.assignedTo || 'Unassigned'}`} />
                                    <Chip size="small" variant="outlined" label={`NPR ${Number(order.totalPrice).toLocaleString()} (qty ${order.quantity})`} />
                                  </Stack>
                                  {order.notes && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                      Note: {order.notes}
                                    </Typography>
                                  )}
                                </Box>
                                <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5}>
                                  <Chip size="small" color={statusColor} label={order.status} sx={{ textTransform: 'capitalize' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </Typography>
                                </Stack>
                              </Stack>
                              {!['completed', 'declined', 'cancelled'].includes(order.status) && (
                                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                  {order.status === 'pending' && (
                                    <AppButton size="small" variant="outlined" startIcon={<CheckCircleOutlineIcon />} onClick={() => updateOrderStatus(order.id, 'accepted')} disabled={isUpdating}>
                                      Accept Order
                                    </AppButton>
                                  )}
                                  <AppButton size="small" color="error" variant="outlined" startIcon={<HighlightOffIcon />} onClick={() => updateOrderStatus(order.id, 'declined')} disabled={isUpdating}>
                                    Decline Order
                                  </AppButton>
                                  <AppButton size="small" variant="outlined" startIcon={<DoneAllIcon />} onClick={() => updateOrderStatus(order.id, 'completed')} disabled={isUpdating}>
                                    Mark Order Complete
                                  </AppButton>
                                </Stack>
                              )}
                            </CardContent>
                          </Card>
                        );
                        })}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {visibleStays.length === 0 && (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {isSuperUser && staySearch.trim()
                    ? 'No stays match your search.'
                    : 'No stays yet. Click “Add New Stay” to register your first property.'}
                </Typography>
              </Paper>
            )}
          </Stack>

          <Divider sx={{ my: 4 }} />
        </Paper>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: '/auth/signin?callbackUrl=%2Fadmin', permanent: false } };
  if (!['admin', 'superUser'].includes(session.user.role || '')) return { redirect: { destination: '/', permanent: false } };

  const isSuper = session.user.role === 'superUser';
  const rows = isSuper
    ? await query(`SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url, s.contact_phone, s.latitude, s.longitude, u.email AS owner_email,
        COALESCE(json_agg(json_build_object('id', m.id, 'category', m.category, 'name', m.name, 'description', m.description, 'price', m.price, 'imageUrl', m.image_url, 'available', m.available) ORDER BY m.sort_order, m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS menu_items
        FROM stays s JOIN users u ON u.id = s.owner_user_id LEFT JOIN menu_items m ON m.stay_id = s.id GROUP BY s.id, u.email ORDER BY s.created_at DESC`)
    : await query(`SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url, s.contact_phone, s.latitude, s.longitude,
        COALESCE(json_agg(json_build_object('id', m.id, 'category', m.category, 'name', m.name, 'description', m.description, 'price', m.price, 'imageUrl', m.image_url, 'available', m.available) ORDER BY m.sort_order, m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS menu_items
        FROM stays s LEFT JOIN menu_items m ON m.stay_id = s.id WHERE s.owner_user_id = $1 GROUP BY s.id ORDER BY s.created_at DESC`, [session.user.id]);

  const initialStays = rows.rows.map((row) => ({
    id: row.id, name: row.name, slug: row.slug, stayType: row.stay_type, location: row.location,
    latitude: row.latitude ?? '', longitude: row.longitude ?? '', description: row.description,
    imageUrl: row.image_url || DEFAULT_STAY_IMAGE,
    menuItems: Array.isArray(row.menu_items) ? row.menu_items : [],
    contactPhone: row.contact_phone || '', ownerEmail: row.owner_email || null,
  }));

  return {
    props: {
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        name: session.user.name || '',
        image: session.user.image || '',
      },
      initialStays,
    },
  };
}
