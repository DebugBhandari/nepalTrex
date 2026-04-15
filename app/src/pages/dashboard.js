import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { authOptions } from '../lib/auth-options';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';
import AppIconButton from '../components/AppIconButton';

const ROLE_OPTIONS = ['user', 'admin', 'superUser'];
const LEVEL_OPTIONS = ['easy', 'moderate', 'challenging'];
const DASHBOARD_TAB_STORAGE_KEY = 'nepaltrex-dashboard-active-tab';

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

function parseWaypointsFromGeojson(routeGeojson) {
  if (!routeGeojson) return [];
  const parsed =
    typeof routeGeojson === 'string'
      ? (() => {
          try {
            return JSON.parse(routeGeojson);
          } catch {
            return null;
          }
        })()
      : routeGeojson;
  if (!parsed) return [];
  if (parsed.type === 'RouteWaypoints' && Array.isArray(parsed.waypoints)) {
    return parsed.waypoints;
  }
  if (parsed.type === 'LineString' && Array.isArray(parsed.coordinates)) {
    return parsed.coordinates.map(([lng, lat]) => [lat, lng, '']);
  }
  if (parsed.type === 'Feature' && parsed.geometry?.type === 'LineString') {
    return parsed.geometry.coordinates.map(([lng, lat]) => [lat, lng, '']);
  }
  return [];
}

function waypointsToRouteGeojson(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) return null;
  const valid = waypoints.filter(
    ([lat, lng]) => lat !== '' && lng !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
  );
  if (valid.length === 0) return null;
  return { type: 'RouteWaypoints', waypoints: valid };
}

function normalizeRouteGeojson(routeGeojson) {
  if (!routeGeojson) {
    return null;
  }

  if (typeof routeGeojson === 'string') {
    try {
      return JSON.parse(routeGeojson);
    } catch {
      return null;
    }
  }

  if (typeof routeGeojson === 'object') {
    return routeGeojson;
  }

  return null;
}

function getRoutePointCount(routeGeojson) {
  const parsed = normalizeRouteGeojson(routeGeojson);

  if (!parsed || !parsed.type) {
    return 0;
  }

  if (parsed.type === 'RouteWaypoints' && Array.isArray(parsed.waypoints)) {
    return parsed.waypoints.length;
  }

  if (parsed.type === 'LineString') {
    return Array.isArray(parsed.coordinates) ? parsed.coordinates.length : 0;
  }

  if (parsed.type === 'MultiLineString') {
    return Array.isArray(parsed.coordinates)
      ? parsed.coordinates.reduce((count, line) => count + (Array.isArray(line) ? line.length : 0), 0)
      : 0;
  }

  return 0;
}

export default function DashboardPage({ user, treks, stays = [] }) {
  const [items, setItems] = useState(() =>
    treks.map((t) => ({ ...t, waypoints: parseWaypointsFromGeojson(t.routeGeojson) }))
  );
  const [editingById, setEditingById] = useState({});
  const [savingById, setSavingById] = useState({});
  const [trekMessage, setTrekMessage] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const [activeTab, setActiveTab] = useState('treks');
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState('');
  const [updatingRoleById, setUpdatingRoleById] = useState({});
  const [draftRolesById, setDraftRolesById] = useState({});

  // Stay management state
  const [stayItems, setStayItems] = useState(() => stays.map((s) => ({ ...s })));
  const [editingStayById, setEditingStayById] = useState({});
  const [savingStayById, setSavingStayById] = useState({});
  const [stayMessage, setStayMessage] = useState('');

  const [orders, setOrders] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [notification, setNotification] = useState('');
  const [lastOrderCount, setLastOrderCount] = useState(0);

  const canManage = useMemo(() => user?.role === 'superUser', [user?.role]);
  const isSuperUser = user?.role === 'superUser';
  const isAdminOrSuperUser = ['admin', 'superUser'].includes(user?.role || '');
  const isUserMenuOpen = Boolean(userMenuAnchor);
  const profileHandle = normalizeHandle(user?.name || (user?.email || '').split('@')[0]);

  // Fetch orders with notification on new arrivals
  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      const fetchedOrders = data.orders || [];
      
      // Show notification if new orders arrived
      if (ordersLoaded && fetchedOrders.length > lastOrderCount) {
        const newOrderCount = fetchedOrders.length - lastOrderCount;
        setNotification(`${newOrderCount} new order${newOrderCount > 1 ? 's' : ''} received!`);
        setTimeout(() => setNotification(''), 5000);
      }
      
      setOrders(fetchedOrders);
      setLastOrderCount(fetchedOrders.length);
      if (!ordersLoaded) {
        setOrdersLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      if (!ordersLoaded) {
        setOrdersLoaded(true);
      }
    }
  }, [ordersLoaded, lastOrderCount]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistedTab = window.localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);
    if (!persistedTab) return;

    const allowedTabs = canManage ? ['treks', 'stays', 'users'] : ['treks'];
    if (allowedTabs.includes(persistedTab)) {
      setActiveTab(persistedTab);
    }
  }, [canManage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const availableRegions = useMemo(
    () => Array.from(new Set(items.map((trek) => trek.region).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const visibleItems = useMemo(() => {
    const filtered = items.filter((trek) => {
      if (regionFilter !== 'all' && trek.region !== regionFilter) {
        return false;
      }

      if (levelFilter !== 'all' && trek.level !== levelFilter) {
        return false;
      }

      const routePoints = getRoutePointCount(trek.routeGeojson);
      if (routeFilter === 'with-route' && routePoints === 0) {
        return false;
      }

      if (routeFilter === 'missing-route' && routePoints > 0) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (sortBy === 'duration') {
        return ((Number(a.durationDays) || 0) - (Number(b.durationDays) || 0)) * direction;
      }

      if (sortBy === 'route') {
        return (getRoutePointCount(a.routeGeojson) - getRoutePointCount(b.routeGeojson)) * direction;
      }

      const left = String(a[sortBy] || '').toLowerCase();
      const right = String(b[sortBy] || '').toLowerCase();
      return left.localeCompare(right) * direction;
    });

    return sorted;
  }, [items, levelFilter, regionFilter, routeFilter, sortBy, sortDirection]);

  const fetchUsers = useCallback(
    async (search = '') => {
      if (!canManage) {
        return;
      }

      setUsersLoading(true);
      setUsersMessage('');

      try {
        const params = new URLSearchParams();
        if (search.trim()) {
          params.set('search', search.trim());
        }

        const response = await fetch(`/api/users?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to fetch users');
        }

        const fetchedUsers = payload.users || [];
        setUsers(fetchedUsers);
        setDraftRolesById(
          fetchedUsers.reduce((acc, current) => {
            acc[current.id] = current.role || 'user';
            return acc;
          }, {})
        );

        if (search.trim()) {
          setUsersMessage(`Found ${fetchedUsers.length} matching users.`);
        }
      } catch (error) {
        setUsersMessage(error.message || 'Failed to fetch users');
      } finally {
        setUsersLoading(false);
      }
    },
    [canManage]
  );

  useEffect(() => {
    if (canManage && activeTab === 'users' && users.length === 0 && !usersLoading) {
      fetchUsers('');
    }
  }, [activeTab, canManage, users.length, usersLoading, fetchUsers]);

  const handleTrekFieldChange = (id, field, value) => {
    setItems((prev) => prev.map((trek) => (trek.id === id ? { ...trek, [field]: value } : trek)));
  };

  const handleWaypointChange = (trekId, rowIdx, colIdx, value) => {
    setItems((prev) =>
      prev.map((trek) => {
        if (trek.id !== trekId) return trek;
        const wps = [...(trek.waypoints || [])];
        const row = [...(wps[rowIdx] || ['', '', ''])];
        row[colIdx] = value;
        wps[rowIdx] = row;
        return { ...trek, waypoints: wps };
      })
    );
  };

  const handleAddWaypoint = (trekId) => {
    setItems((prev) =>
      prev.map((trek) =>
        trek.id === trekId ? { ...trek, waypoints: [...(trek.waypoints || []), ['', '', '']] } : trek
      )
    );
  };

  const handleRemoveWaypoint = (trekId, rowIdx) => {
    setItems((prev) =>
      prev.map((trek) =>
        trek.id === trekId
          ? { ...trek, waypoints: (trek.waypoints || []).filter((_, i) => i !== rowIdx) }
          : trek
      )
    );
  };

  const handleSaveTrek = async (trekId) => {
    const trek = items.find((item) => item.id === trekId);
    if (!trek) {
      return;
    }

    setSavingById((prev) => ({ ...prev, [trekId]: true }));
    setTrekMessage('');

    try {
      const response = await fetch(`/api/treks/${trekId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trek.name,
          durationDays: Number(trek.durationDays),
          level: trek.level,
          region: trek.region,
          description: trek.description || '',
          isFeatured: Boolean(trek.isFeatured),
          routeGeojson: waypointsToRouteGeojson(trek.waypoints),
          elevationMinM: trek.elevationMinM ? Number(trek.elevationMinM) : null,
          elevationMaxM: trek.elevationMaxM ? Number(trek.elevationMaxM) : null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update trek');
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === trekId
            ? {
                ...item,
                name: payload.trek.name,
                durationDays: payload.trek.duration_days,
                level: payload.trek.level,
                region: payload.trek.region,
                description: payload.trek.description || '',
                isFeatured: payload.trek.is_featured,
                routeGeojson: payload.trek.route_geojson || null,
                waypoints: parseWaypointsFromGeojson(payload.trek.route_geojson),
                elevationMinM: payload.trek.elevation_min_m || null,
                elevationMaxM: payload.trek.elevation_max_m || null,
              }
            : item
        )
      );

      setEditingById((prev) => ({ ...prev, [trekId]: false }));
      setTrekMessage(`Updated trek details for ${payload.trek.name}.`);
    } catch (error) {
      setTrekMessage(error.message || 'Failed to update trek');
    } finally {
      setSavingById((prev) => ({ ...prev, [trekId]: false }));
    }
  };

  const saveUserRole = async (targetUserId) => {
    const selectedRole = draftRolesById[targetUserId];

    setUpdatingRoleById((prev) => ({ ...prev, [targetUserId]: true }));
    setUsersMessage('');

    try {
      const response = await fetch(`/api/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update user role');
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === targetUserId ? { ...item, role: payload.user.role } : item))
      );
      setDraftRolesById((prev) => ({ ...prev, [targetUserId]: payload.user.role }));
      setUsersMessage(`Updated role for ${payload.user.email || payload.user.username} to ${payload.user.role}.`);
    } catch (error) {
      setUsersMessage(error.message || 'Failed to update user role');
    } finally {
      setUpdatingRoleById((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleStayFieldChange = (id, field, value) => {
    setStayItems((prev) => prev.map((stay) => (stay.id === id ? { ...stay, [field]: value } : stay)));
  };

  const handleSaveStay = async (stayId) => {
    const stay = stayItems.find((s) => s.id === stayId);
    if (!stay) return;

    setSavingStayById((prev) => ({ ...prev, [stayId]: true }));
    setStayMessage('');

    try {
      const response = await fetch(`/api/stays/${stayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stay.name,
          slug: stay.slug,
          stayType: stay.stayType,
          location: stay.location,
          description: stay.description,
          imageUrl: stay.imageUrl,
          contactPhone: stay.contactPhone,
          latitude: stay.latitude !== '' ? Number(stay.latitude) : null,
          longitude: stay.longitude !== '' ? Number(stay.longitude) : null,
          menuItems: stay.menuItems,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to update stay');

      setStayItems((prev) =>
        prev.map((s) =>
          s.id === stayId
            ? {
                ...s,
                name: payload.stay.name,
                slug: payload.stay.slug,
                stayType: payload.stay.stay_type,
                location: payload.stay.location,
                description: payload.stay.description || '',
                imageUrl: payload.stay.image_url || '',
                contactPhone: payload.stay.contact_phone || '',
                pricePerNight: payload.stay.price_per_night,
                latitude: payload.stay.latitude || '',
                longitude: payload.stay.longitude || '',
              }
            : s
        )
      );
      setEditingStayById((prev) => ({ ...prev, [stayId]: false }));
      setStayMessage(`Updated stay: ${payload.stay.name}`);
    } catch (error) {
      setStayMessage(error.message || 'Failed to update stay');
    } finally {
      setSavingStayById((prev) => ({ ...prev, [stayId]: false }));
    }
  };

return (
    <>
      <Head>
        <title>Dashboard | NepalTrex</title>
      </Head>

      <AppBar
        position="sticky"
        elevation={0}
        sx={{ backdropFilter: 'blur(8px)' }}
      >
        <Toolbar>
          <Box
            component={Link}
            href="/"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.8,
              minWidth: 0,
              textDecoration: 'none',
              mr: 'auto',
            }}
          >
            <Box
              component="img"
              src="/brand/banner-mountains.svg"
              alt="NepalTrex mountain logo"
              sx={{ width: 44, height: 32, objectFit: 'contain' }}
            />
            <Typography
              variant="h6"
              sx={(theme) => ({
                fontWeight: 800,
                letterSpacing: 0.2,
                color: theme.palette.mode === 'dark' ? '#B0E4CC' : '#0f766e',
              })}
            >
              NepalTrex
            </Typography>
          </Box>
          <Chip label={`Role: ${user?.role || 'user'}`} color="secondary" sx={{ mr: 1 }} />
          <IconButton
            color="inherit"
            onClick={(event) => setUserMenuAnchor(event.currentTarget)}
            sx={(theme) => ({
              border: '1px solid',
              borderColor: theme.palette.divider,
              borderRadius: 999,
              p: 0.4,
            })}
            aria-label="Open user menu"
          >
            <Avatar
              src={user?.image || ''}
              alt={user?.name || user?.email || 'User'}
              sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}
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
        <Paper
          sx={(theme) => ({
            p: { xs: 2, md: 3 },
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f2fbf9 100%)',
            boxShadow: '0 18px 36px rgba(15, 23, 42, 0.14)',
          })}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
            <Box>
              <Typography variant="h4">Welcome, {user?.name || user?.email}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Manage treks and users from one place.
              </Typography>
            </Box>
            {isAdminOrSuperUser && (
              <AppButton component={Link} href="/admin" variant="contained" startIcon={<DashboardIcon />}>
                Admin Dashboard
              </AppButton>
            )}
          </Stack>

          {notification && <Alert severity="success" sx={{ mb: 2 }}>{notification}</Alert>}

          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mt: 2 }}
          >
            <Tab value="treks" label="Trek Updates" />
            {canManage && <Tab value="stays" label="Stay Management" />}
            {canManage && <Tab value="users" label="User Management" />}
          </Tabs>

          {activeTab === 'treks' && (
            <Box sx={{ mt: 2 }}>
              {canManage ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  As superUser, you can update all trek fields below.
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You can view trek information. Only superUsers can save trek changes.
                </Alert>
              )}

              {trekMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {trekMessage}
                </Alert>
              )}

              <Paper sx={{ p: 1.5, mb: 2 }}>
                <Stack spacing={1.2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <InputLabel id="region-filter-label">Region</InputLabel>
                      <Select
                        labelId="region-filter-label"
                        label="Region"
                        value={regionFilter}
                        onChange={(event) => setRegionFilter(event.target.value)}
                      >
                        <MenuItem value="all">All regions</MenuItem>
                        {availableRegions.map((region) => (
                          <MenuItem key={region} value={region}>
                            {region}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id="level-filter-label">Difficulty</InputLabel>
                      <Select
                        labelId="level-filter-label"
                        label="Difficulty"
                        value={levelFilter}
                        onChange={(event) => setLevelFilter(event.target.value)}
                      >
                        <MenuItem value="all">All levels</MenuItem>
                        {LEVEL_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel id="route-filter-label">Route status</InputLabel>
                      <Select
                        labelId="route-filter-label"
                        label="Route status"
                        value={routeFilter}
                        onChange={(event) => setRouteFilter(event.target.value)}
                      >
                        <MenuItem value="all">All routes</MenuItem>
                        <MenuItem value="with-route">With route</MenuItem>
                        <MenuItem value="missing-route">Missing route</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel id="sort-by-label">Sort by</InputLabel>
                      <Select
                        labelId="sort-by-label"
                        label="Sort by"
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                      >
                        <MenuItem value="name">Name</MenuItem>
                        <MenuItem value="region">Region</MenuItem>
                        <MenuItem value="level">Difficulty</MenuItem>
                        <MenuItem value="duration">Duration</MenuItem>
                        <MenuItem value="route">Route points</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel id="sort-direction-label">Direction</InputLabel>
                      <Select
                        labelId="sort-direction-label"
                        label="Direction"
                        value={sortDirection}
                        onChange={(event) => setSortDirection(event.target.value)}
                      >
                        <MenuItem value="asc">Ascending</MenuItem>
                        <MenuItem value="desc">Descending</MenuItem>
                      </Select>
                    </FormControl>
                    <AppButton
                      variant="outlined"
                      onClick={() => {
                        setRegionFilter('all');
                        setLevelFilter('all');
                        setRouteFilter('all');
                        setSortBy('name');
                        setSortDirection('asc');
                      }}
                    >
                      Reset filters
                    </AppButton>
                  </Stack>
                </Stack>
              </Paper>

              <Stack spacing={2}>
                {visibleItems.map((trek) => {
                  const isEditing = Boolean(editingById[trek.id]);
                  const isSaving = Boolean(savingById[trek.id]);

                  return (
                    <Card
                      key={trek.id}
                      sx={(theme) => ({
                        background:
                          theme.palette.mode === 'dark'
                            ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                            : 'linear-gradient(145deg, rgba(255,251,245,0.98) 0%, rgba(250,244,236,0.96) 100%)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                        border: '1px solid',
                        borderColor:
                          theme.palette.mode === 'dark' ? 'rgba(232, 240, 247, 0.22)' : 'rgba(11, 31, 42, 0.08)',
                      })}
                    >
                      <CardContent>
                        {!isEditing ? (
                          /* ── Collapsed summary ── */
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ sm: 'center' }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {trek.name}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={0.8}
                                sx={{ mt: 0.8, flexWrap: 'wrap', gap: 0.5 }}
                              >
                                <Chip size="small" label={trek.region} />
                                <Chip
                                  size="small"
                                  label={trek.level}
                                  sx={{ textTransform: 'capitalize' }}
                                />
                                <Chip size="small" label={`${trek.durationDays} days`} />
                                {trek.elevationMaxM && (
                                  <Chip size="small" variant="outlined" label={`↑ ${trek.elevationMaxM.toLocaleString()}m`} />
                                )}
                                {trek.isFeatured && (
                                  <Chip size="small" color="warning" label="Featured" />
                                )}
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={
                                    (trek.waypoints || []).length > 0
                                      ? `Route: ${trek.waypoints.length} pts`
                                      : 'No route'
                                  }
                                />
                              </Stack>
                            </Box>
                            {canManage && (
                              <AppButton
                                variant="outlined"
                                onClick={() =>
                                  setEditingById((prev) => ({ ...prev, [trek.id]: true }))
                                }
                              >
                                Edit
                              </AppButton>
                            )}
                          </Stack>
                        ) : (
                          /* ── Expanded edit form ── */
                          <Stack spacing={1.5}>
                            <TextField
                              label="Trek Name"
                              value={trek.name}
                              onChange={(event) =>
                                handleTrekFieldChange(trek.id, 'name', event.target.value)
                              }
                              disabled={isSaving}
                              fullWidth
                            />
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <TextField
                                label="Duration (days)"
                                type="number"
                                value={trek.durationDays}
                                onChange={(event) =>
                                  handleTrekFieldChange(
                                    trek.id,
                                    'durationDays',
                                    Number(event.target.value || 0)
                                  )
                                }
                                disabled={isSaving}
                                fullWidth
                                inputProps={{ min: 1 }}
                              />
                              <FormControl fullWidth size="small" disabled={isSaving}>
                                <InputLabel id={`level-${trek.id}`}>Level</InputLabel>
                                <Select
                                  labelId={`level-${trek.id}`}
                                  label="Level"
                                  value={trek.level}
                                  onChange={(event) =>
                                    handleTrekFieldChange(trek.id, 'level', event.target.value)
                                  }
                                >
                                  {LEVEL_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                      {option}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Stack>
                            <TextField
                              label="Region"
                              value={trek.region}
                              onChange={(event) =>
                                handleTrekFieldChange(trek.id, 'region', event.target.value)
                              }
                              disabled={isSaving}
                              fullWidth
                            />
                            <TextField
                              label="Description"
                              multiline
                              minRows={4}
                              value={trek.description || ''}
                              onChange={(event) =>
                                handleTrekFieldChange(trek.id, 'description', event.target.value)
                              }
                              disabled={isSaving}
                              fullWidth
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={Boolean(trek.isFeatured)}
                                  onChange={(event) =>
                                    handleTrekFieldChange(
                                      trek.id,
                                      'isFeatured',
                                      event.target.checked
                                    )
                                  }
                                  disabled={isSaving}
                                />
                              }
                              label="Featured trek"
                            />

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <TextField
                                label="Min Elevation (m)"
                                type="number"
                                value={trek.elevationMinM || ''}
                                onChange={(event) =>
                                  handleTrekFieldChange(trek.id, 'elevationMinM', event.target.value)
                                }
                                disabled={isSaving}
                                fullWidth
                                inputProps={{ min: 0 }}
                              />
                              <TextField
                                label="Max Elevation (m)"
                                type="number"
                                value={trek.elevationMaxM || ''}
                                onChange={(event) =>
                                  handleTrekFieldChange(trek.id, 'elevationMaxM', event.target.value)
                                }
                                disabled={isSaving}
                                fullWidth
                                inputProps={{ min: 0 }}
                              />
                            </Stack>

                            {/* ── Route Coordinates editor ── */}
                            <Box>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <Typography variant="subtitle2">Route Coordinates</Typography>
                                <AppButton
                                  size="small"
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  onClick={() => handleAddWaypoint(trek.id)}
                                  disabled={isSaving}
                                >
                                  Add Point
                                </AppButton>
                              </Stack>
                              {(trek.waypoints || []).length === 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  No route coordinates yet. Add points above.
                                </Typography>
                              )}
                              <Stack spacing={1}>
                                {(trek.waypoints || []).map(([lat, lng, place], rowIdx) => (
                                  <Stack
                                    key={`wp-${trek.id}-${rowIdx}`}
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    alignItems={{ sm: 'center' }}
                                  >
                                    <TextField
                                      label="Latitude"
                                      type="number"
                                      value={lat}
                                      onChange={(e) =>
                                        handleWaypointChange(trek.id, rowIdx, 0, e.target.value)
                                      }
                                      disabled={isSaving}
                                      size="small"
                                      sx={{ width: { sm: 140 } }}
                                      inputProps={{ step: 'any' }}
                                    />
                                    <TextField
                                      label="Longitude"
                                      type="number"
                                      value={lng}
                                      onChange={(e) =>
                                        handleWaypointChange(trek.id, rowIdx, 1, e.target.value)
                                      }
                                      disabled={isSaving}
                                      size="small"
                                      sx={{ width: { sm: 140 } }}
                                      inputProps={{ step: 'any' }}
                                    />
                                    <TextField
                                      label="Place name"
                                      value={place || ''}
                                      onChange={(e) =>
                                        handleWaypointChange(trek.id, rowIdx, 2, e.target.value)
                                      }
                                      disabled={isSaving}
                                      size="small"
                                      sx={{ flex: 1 }}
                                    />
                                    <AppButton
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      startIcon={<DeleteOutlineIcon />}
                                      onClick={() => handleRemoveWaypoint(trek.id, rowIdx)}
                                      disabled={isSaving}
                                      sx={{ minWidth: 90, flexShrink: 0 }}
                                    >
                                      Remove
                                    </AppButton>
                                  </Stack>
                                ))}
                              </Stack>
                            </Box>

                            <Stack direction="row" spacing={1}>
                              <AppButton
                                variant="contained"
                                onClick={() => handleSaveTrek(trek.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? 'Saving...' : 'Save Trek'}
                              </AppButton>
                              <AppButton
                                variant="outlined"
                                onClick={() =>
                                  setEditingById((prev) => ({ ...prev, [trek.id]: false }))
                                }
                                disabled={isSaving}
                              >
                                Cancel
                              </AppButton>
                            </Stack>
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {visibleItems.length === 0 && (
                  <Alert severity="info">No treks match the current filters.</Alert>
                )}
              </Stack>
            </Box>
          )}

          {activeTab === 'stays' && canManage && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                As superUser, you can update all stay fields. Menu items are preserved when saving.
              </Alert>

              {stayMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {stayMessage}
                </Alert>
              )}

              <Stack spacing={2}>
                {stayItems.map((stay) => {
                  const isEditing = Boolean(editingStayById[stay.id]);
                  const isSaving = Boolean(savingStayById[stay.id]);

                  return (
                    <Card
                      key={stay.id}
                      sx={(theme) => ({
                        background:
                          theme.palette.mode === 'dark'
                            ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                            : 'linear-gradient(145deg, rgba(255,251,245,0.98) 0%, rgba(250,244,236,0.96) 100%)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                        border: '1px solid',
                        borderColor:
                          theme.palette.mode === 'dark' ? 'rgba(232, 240, 247, 0.22)' : 'rgba(11, 31, 42, 0.08)',
                      })}
                    >
                      <CardContent>
                        {!isEditing ? (
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ sm: 'center' }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {stay.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.8 }}>
                                {stay.location}
                              </Typography>
                              <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                <Chip size="small" label={stay.stayType} sx={{ textTransform: 'capitalize' }} />
                                {stay.pricePerNight && (
                                  <Chip size="small" variant="outlined" label={`NPR ${Number(stay.pricePerNight).toLocaleString()}/night`} />
                                )}
                                <Chip
                                  size="small"
                                  color="secondary"
                                  label={`Owner: ${stay.ownerEmail}`}
                                />
                              </Stack>
                            </Box>
                            <AppButton
                              variant="outlined"
                              onClick={() => setEditingStayById((prev) => ({ ...prev, [stay.id]: true }))}
                            >
                              Edit
                            </AppButton>
                          </Stack>
                        ) : (
                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <TextField
                                label="Name"
                                value={stay.name}
                                onChange={(e) => handleStayFieldChange(stay.id, 'name', e.target.value)}
                                disabled={isSaving}
                                fullWidth
                              />
                              <TextField
                                label="Slug"
                                value={stay.slug}
                                onChange={(e) => handleStayFieldChange(stay.id, 'slug', e.target.value)}
                                disabled={isSaving}
                                fullWidth
                              />
                            </Stack>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <FormControl fullWidth size="small" disabled={isSaving}>
                                <InputLabel id={`stay-type-${stay.id}`}>Type</InputLabel>
                                <Select
                                  labelId={`stay-type-${stay.id}`}
                                  label="Type"
                                  value={stay.stayType}
                                  onChange={(e) => handleStayFieldChange(stay.id, 'stayType', e.target.value)}
                                >
                                  <MenuItem value="hotel">Hotel</MenuItem>
                                  <MenuItem value="homestay">Homestay</MenuItem>
                                </Select>
                              </FormControl>
                              <TextField
                                label="Contact Phone"
                                value={stay.contactPhone}
                                onChange={(e) => handleStayFieldChange(stay.id, 'contactPhone', e.target.value)}
                                disabled={isSaving}
                                fullWidth
                              />
                            </Stack>
                            <TextField
                              label="Location"
                              value={stay.location}
                              onChange={(e) => handleStayFieldChange(stay.id, 'location', e.target.value)}
                              disabled={isSaving}
                              fullWidth
                            />
                            <TextField
                              label="Description"
                              multiline
                              minRows={3}
                              value={stay.description}
                              onChange={(e) => handleStayFieldChange(stay.id, 'description', e.target.value)}
                              disabled={isSaving}
                              fullWidth
                            />
                            <TextField
                              label="Image URL"
                              value={stay.imageUrl}
                              onChange={(e) => handleStayFieldChange(stay.id, 'imageUrl', e.target.value)}
                              disabled={isSaving}
                              fullWidth
                            />
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <TextField
                                label="Latitude"
                                type="number"
                                value={stay.latitude}
                                onChange={(e) => handleStayFieldChange(stay.id, 'latitude', e.target.value)}
                                disabled={isSaving}
                                fullWidth
                                inputProps={{ step: 'any' }}
                              />
                              <TextField
                                label="Longitude"
                                type="number"
                                value={stay.longitude}
                                onChange={(e) => handleStayFieldChange(stay.id, 'longitude', e.target.value)}
                                disabled={isSaving}
                                fullWidth
                                inputProps={{ step: 'any' }}
                              />
                            </Stack>
                            <Chip
                              size="small"
                              color="secondary"
                              label={`Owner: ${stay.ownerEmail}`}
                              sx={{ alignSelf: 'flex-start' }}
                            />
                            <Stack direction="row" spacing={1}>
                              <AppButton
                                variant="contained"
                                onClick={() => handleSaveStay(stay.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? 'Saving...' : 'Save Stay'}
                              </AppButton>
                              <AppButton
                                variant="outlined"
                                onClick={() => setEditingStayById((prev) => ({ ...prev, [stay.id]: false }))}
                                disabled={isSaving}
                              >
                                Cancel
                              </AppButton>
                            </Stack>
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {stayItems.length === 0 && (
                  <Alert severity="info">No stays found in the database.</Alert>
                )}
              </Stack>
            </Box>
          )}

          {activeTab === 'users' && canManage && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                User Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Search users and update roles, including revoking admin or superUser access.
              </Typography>

              <Box
                component="form"
                sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  fetchUsers(userSearch);
                }}
              >
                <TextField
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by username, email, or display name"
                  fullWidth
                  sx={{ flex: 1, minWidth: 240 }}
                />
                <AppButton variant="contained" type="submit" disabled={usersLoading}>
                  {usersLoading ? 'Searching...' : 'Search'}
                </AppButton>
                <AppButton
                  variant="outlined"
                  type="button"
                  disabled={usersLoading}
                  onClick={() => {
                    setUserSearch('');
                    fetchUsers('');
                  }}
                >
                  Reset
                </AppButton>
              </Box>

              {usersMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {usersMessage}
                </Alert>
              )}

              <Stack spacing={1.5}>
                {users.map((entry) => {
                  const isSaving = Boolean(updatingRoleById[entry.id]);
                  const currentDraft = draftRolesById[entry.id] || entry.role || 'user';
                  const isSelf = entry.id === user.id;

                  return (
                    <Card
                      key={entry.id}
                      sx={(theme) => ({
                        background:
                          theme.palette.mode === 'dark'
                            ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                            : 'linear-gradient(145deg, rgba(255,251,245,0.98) 0%, rgba(250,244,236,0.96) 100%)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
                      })}
                    >
                      <CardContent>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={2}
                          justifyContent="space-between"
                        >
                          <Stack direction="row" spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ flex: 1 }}>
                            <Avatar
                              src={entry.profileImageUrl || ''}
                              alt={entry.displayName || entry.username || 'User'}
                              sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 18, fontWeight: 700 }}
                            >
                              {(entry.displayName || entry.username || 'U').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1">
                                {entry.displayName || entry.username || 'N/A'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {entry.email || 'N/A'}
                              </Typography>
                              <Chip label={`Current role: ${entry.role || 'user'}`} size="small" sx={{ mt: 1 }} />
                            </Box>
                          </Stack>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                            <AppButton
                              component={Link}
                              href={`/user/${normalizeHandle(entry.displayName || entry.username || entry.email?.split('@')[0] || 'user')}`}
                              variant="outlined"
                              size="small"
                              sx={{ minWidth: 120, height: 36 }}
                            >
                              View Profile
                            </AppButton>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                              <InputLabel id={`role-input-${entry.id}`}>Role</InputLabel>
                              <Select
                                labelId={`role-input-${entry.id}`}
                                label="Role"
                                value={currentDraft}
                                onChange={(event) =>
                                  setDraftRolesById((prev) => ({ ...prev, [entry.id]: event.target.value }))
                                }
                                disabled={isSaving || isSelf}
                              >
                                {ROLE_OPTIONS.map((roleOption) => (
                                  <MenuItem key={roleOption} value={roleOption}>
                                    {roleOption}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <AppButton
                              variant="contained"
                              disabled={isSaving || isSelf || currentDraft === entry.role}
                              onClick={() => saveUserRole(entry.id)}
                              sx={{
                                height: 36,
                                minHeight: 36,
                                px: 1.8,
                                fontSize: '0.82rem',
                                lineHeight: 1.15,
                                background: '#0f766e',
                                color: '#ffffff',
                                '&:hover': {
                                  background: '#0b5f58',
                                },
                                '&.Mui-disabled': {
                                  background: '#94a3b8',
                                  color: '#ffffff',
                                },
                              }}
                            >
                              {isSaving ? 'Saving...' : 'Update Role'}
                            </AppButton>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Paper>
      </Container>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=%2Fdashboard',
        permanent: false,
      },
    };
  }

  const trekRows = await query(
    `
      SELECT id, name, duration_days, level, region, description, route_geojson, is_featured, elevation_min_m, elevation_max_m
      FROM treks
      ORDER BY name ASC
    `
  );

  const treks = trekRows.rows.map((row) => ({
    id: row.id,
    name: row.name,
    durationDays: row.duration_days,
    level: row.level,
    region: row.region,
    description: row.description || '',
    routeGeojson: row.route_geojson || null,
    isFeatured: row.is_featured,
    elevationMinM: row.elevation_min_m || null,
    elevationMaxM: row.elevation_max_m || null,
  }));

  let stays = [];
  if (session.user?.role === 'superUser') {
    const stayRows = await query(
      `
        SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.price_per_night,
          s.contact_phone, s.image_url, s.menu_items, s.latitude, s.longitude, s.owner_user_id,
          u.email AS owner_email
        FROM stays s
        LEFT JOIN users u ON u.id = s.owner_user_id
        ORDER BY s.created_at DESC
      `
    );
    stays = stayRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      stayType: row.stay_type,
      location: row.location,
      description: row.description || '',
      pricePerNight: row.price_per_night,
      contactPhone: row.contact_phone || '',
      imageUrl: row.image_url || '',
      menuItems: row.menu_items || [],
      latitude: row.latitude ?? '',
      longitude: row.longitude ?? '',
      ownerEmail: row.owner_email || 'N/A',
      ownerUserId: row.owner_user_id,
    }));
  }

  return {
    props: {
      user: {
        ...session.user,
        role: session.user?.role || 'user',
      },
      treks,
      stays,
    },
  };
}
