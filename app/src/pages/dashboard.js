import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import {
  Alert,
  AppBar,
  Autocomplete,
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
  FormControlLabel,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Pagination,
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
import NepalTrexLogo from '../components/NepalTrexLogo';
import SiteHeader from '../components/SiteHeader';
import { getTrekImage, slugifyTrekName } from '../lib/treks';

const ROLE_OPTIONS = ['user', 'admin', 'superUser'];
const LEVEL_OPTIONS = ['easy', 'moderate', 'challenging'];
const DASHBOARD_TAB_STORAGE_KEY = 'nepaltrex-dashboard-active-tab';
const USERS_PER_PAGE = 10;
const STAYS_PER_PAGE = 8;
const DEFAULT_STAY_IMAGE = 'https://placehold.co/1000x620?text=NepalTrex+Stay';
const DEFAULT_MENU_IMAGE = 'https://placehold.co/600x380?text=Menu+Item';

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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export default function DashboardPage({ user, treks, stays = [], ownerCandidates = [] }) {
  const router = useRouter();
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
  const [showTrekFilters, setShowTrekFilters] = useState(false);
  const [showStayFilters, setShowStayFilters] = useState(false);
  const [showUserFilters, setShowUserFilters] = useState(false);

  const [activeTab, setActiveTab] = useState('treks');
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState('');
  const [usersMessageSeverity, setUsersMessageSeverity] = useState('success');
  const [updatingRoleById, setUpdatingRoleById] = useState({});
  const [updatingBanById, setUpdatingBanById] = useState({});
  const [deletingUserById, setDeletingUserById] = useState({});
  const [draftRolesById, setDraftRolesById] = useState({});
  const [userPage, setUserPage] = useState(1);
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Stay management state
  const [stayItems, setStayItems] = useState(() => stays.map((s) => ({ ...s })));
  const [editingStayById, setEditingStayById] = useState({});
  const [savingStayById, setSavingStayById] = useState({});
  const [stayMessage, setStayMessage] = useState('');
  const [staySearch, setStaySearch] = useState('');
  const [stayPage, setStayPage] = useState(1);

  const [orders, setOrders] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);

  const canManage = useMemo(() => user?.role === 'superUser', [user?.role]);
  const isSuperUser = user?.role === 'superUser';
  const isAdminOrSuperUser = ['admin', 'superUser'].includes(user?.role || '');
  const isUserMenuOpen = Boolean(userMenuAnchor);
  const isNotificationsOpen = Boolean(notificationsAnchor);
  const profileHandle = normalizeHandle(user?.name || (user?.email || '').split('@')[0]);
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === 'pending'), [orders]);

  const fetchOrders = useCallback(async () => {
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
  }, [ordersLoaded]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
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

  const filteredUsers = useMemo(() => {
    if (userRoleFilter === 'all') {
      return users;
    }
    return users.filter((u) => u.role === userRoleFilter);
  }, [users, userRoleFilter]);

  const totalUserPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE)),
    [filteredUsers.length]
  );

  const paginatedUsers = useMemo(() => {
    const startIndex = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [userPage, filteredUsers]);

  const filteredStays = useMemo(() => {
    const needle = staySearch.trim().toLowerCase();
    if (!needle) {
      return stayItems;
    }

    return stayItems.filter((stay) => {
      const name = String(stay.name || '').toLowerCase();
      const ownerEmail = String(stay.ownerEmail || '').toLowerCase();
      const ownerUsername = String(stay.ownerUsername || '').toLowerCase();
      const ownerDisplayName = String(stay.ownerDisplayName || '').toLowerCase();
      return (
        name.includes(needle) ||
        ownerEmail.includes(needle) ||
        ownerUsername.includes(needle) ||
        ownerDisplayName.includes(needle)
      );
    });
  }, [stayItems, staySearch]);

  const totalStayPages = useMemo(
    () => Math.max(1, Math.ceil(filteredStays.length / STAYS_PER_PAGE)),
    [filteredStays.length]
  );

  const paginatedStays = useMemo(() => {
    const startIndex = (stayPage - 1) * STAYS_PER_PAGE;
    return filteredStays.slice(startIndex, startIndex + STAYS_PER_PAGE);
  }, [filteredStays, stayPage]);

  const openOrderFromMenu = (orderId) => {
    setNotificationsAnchor(null);
    router.push(`/admin?orderId=${encodeURIComponent(orderId)}`);
  };

  const fetchUsers = useCallback(
    async (search = '') => {
      if (!canManage) {
        return;
      }

      setUsersLoading(true);
      setUsersMessage('');
      setUsersMessageSeverity('success');

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
        setUserPage(1);
        setDraftRolesById(
          fetchedUsers.reduce((acc, current) => {
            acc[current.id] = current.role || 'user';
            return acc;
          }, {})
        );

        if (search.trim()) {
          setUsersMessage(`Found ${fetchedUsers.length} matching users.`);
          setUsersMessageSeverity('success');
        }
      } catch (error) {
        setUsersMessage(error.message || 'Failed to fetch users');
        setUsersMessageSeverity('error');
      } finally {
        setUsersLoading(false);
      }
    },
    [canManage]
  );

  useEffect(() => {
    if (userPage > totalUserPages && totalUserPages > 0) {
      setUserPage(totalUserPages);
    }
  }, [totalUserPages, userPage]);

  useEffect(() => {
    if (stayPage > totalStayPages && totalStayPages > 0) {
      setStayPage(totalStayPages);
    }
  }, [stayPage, totalStayPages]);

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
    setUsersMessageSeverity('success');

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
      setUsersMessageSeverity('success');
    } catch (error) {
      setUsersMessage(error.message || 'Failed to update user role');
      setUsersMessageSeverity('error');
    } finally {
      setUpdatingRoleById((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const toggleUserBan = async (targetUserId, nextIsBanned) => {
    setUpdatingBanById((prev) => ({ ...prev, [targetUserId]: true }));
    setUsersMessage('');

    try {
      const response = await fetch(`/api/users/${targetUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isBanned: nextIsBanned }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update user status');
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === targetUserId ? { ...item, isBanned: Boolean(payload.user.isBanned) } : item
        )
      );
      setUsersMessage(
        `${payload.user.email || payload.user.username} ${payload.user.isBanned ? 'was banned' : 'was unbanned'}.`
      );
      setUsersMessageSeverity('success');
    } catch (error) {
      setUsersMessage(error.message || 'Failed to update ban status');
      setUsersMessageSeverity('error');
    } finally {
      setUpdatingBanById((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const deleteUser = async (targetUserId, label) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete ${label}? This cannot be undone.`);
      if (!confirmed) {
        return;
      }
    }

    setDeletingUserById((prev) => ({ ...prev, [targetUserId]: true }));
    setUsersMessage('');

    try {
      const response = await fetch(`/api/users/${targetUserId}`, {
        method: 'DELETE',
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((item) => item.id !== targetUserId));
      setDraftRolesById((prev) => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });
      setUsersMessage(`Deleted ${payload.user.email || payload.user.username || label}.`);
      setUsersMessageSeverity('success');
    } catch (error) {
      setUsersMessage(error.message || 'Failed to delete user');
      setUsersMessageSeverity('error');
    } finally {
      setDeletingUserById((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleStayFieldChange = (id, field, value) => {
    setStayItems((prev) => prev.map((stay) => (stay.id === id ? { ...stay, [field]: value } : stay)));
  };

  const handleStayMenuItemFieldChange = (stayId, index, field, value) => {
    setStayItems((prev) =>
      prev.map((stay) => {
        if (stay.id !== stayId) return stay;
        const menuItems = Array.isArray(stay.menuItems) ? [...stay.menuItems] : [];
        const current = menuItems[index] || {};
        menuItems[index] = { ...current, [field]: value };
        return { ...stay, menuItems };
      })
    );
  };

  const handleStayImageUpload = async (stayId, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) return;
      handleStayFieldChange(stayId, 'imageUrl', dataUrl);
    } catch (error) {
      setStayMessage(error.message || 'Failed to upload stay image');
    }
  };

  const handleStayMenuImageUpload = async (stayId, index, file) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl) return;
      handleStayMenuItemFieldChange(stayId, index, 'imageUrl', dataUrl);
    } catch (error) {
      setStayMessage(error.message || 'Failed to upload menu image');
    }
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
          ownerUserId: stay.ownerUserId || null,
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
                ownerEmail: payload.stay.owner_email || s.ownerEmail || 'N/A',
                ownerUsername: payload.stay.owner_username || s.ownerUsername || '',
                ownerDisplayName: payload.stay.owner_display_name || s.ownerDisplayName || '',
                ownerUserId: payload.stay.owner_user_id || s.ownerUserId || '',
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

      <SiteHeader />

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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                Role: {user?.role || 'user'}
              </Typography>
            </Box>
          </Stack>

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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2 }}>
                <AppButton variant="outlined" onClick={() => setShowTrekFilters((prev) => !prev)}>
                  {showTrekFilters ? 'Hide Filters' : 'Filters'}
                </AppButton>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Showing {visibleItems.length} trek{visibleItems.length === 1 ? '' : 's'}
                </Typography>
              </Stack>

              {showTrekFilters && (
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
              )}

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(3, minmax(0, 1fr))',
                  },
                }}
              >
                {visibleItems.map((trek) => {
                  const isEditing = Boolean(editingById[trek.id]);
                  const isSaving = Boolean(savingById[trek.id]);
                  const trekSlug = slugifyTrekName(trek.name);

                  return (
                    <Card
                      key={trek.id}
                      sx={(theme) => ({
                        gridColumn: isEditing ? '1 / -1' : 'auto',
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
                      <Link href={`/treks/${trekSlug}`}>
                        <CardMedia
                          component="img"
                          height="180"
                          image={getTrekImage(trek.name)}
                          alt={trek.name}
                          sx={{ objectFit: 'cover', objectPosition: 'center', cursor: 'pointer' }}
                        />
                      </Link>
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
                                sx={{ height: 40, minHeight: 40 }}
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
              </Box>
            </Box>
          )}

          {activeTab === 'stays' && canManage && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                As superUser, you can update stay fields and menu item image links/uploads.
              </Alert>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2 }}>
                <AppButton variant="outlined" onClick={() => setShowStayFilters((prev) => !prev)}>
                  {showStayFilters ? 'Hide Filters' : 'Filters'}
                </AppButton>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Showing {filteredStays.length} stay{filteredStays.length === 1 ? '' : 's'}
                </Typography>
              </Stack>

              {showStayFilters && (
                <Box
                  component="form"
                  sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'flex-end' }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    setStayPage(1);
                  }}
                >
                  <TextField
                    value={staySearch}
                    onChange={(event) => {
                      setStaySearch(event.target.value);
                      setStayPage(1);
                    }}
                    placeholder="Search by stay name or owner"
                    fullWidth
                    sx={{ flex: 1, minWidth: 240 }}
                  />
                  <AppButton
                    variant="outlined"
                    type="button"
                    onClick={() => {
                      setStaySearch('');
                      setStayPage(1);
                    }}
                  >
                    Reset
                  </AppButton>
                </Box>
              )}

              {stayMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {stayMessage}
                </Alert>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(3, minmax(0, 1fr))',
                  },
                }}
              >
                {paginatedStays.map((stay) => {
                  const isEditing = Boolean(editingStayById[stay.id]);
                  const isSaving = Boolean(savingStayById[stay.id]);
                  const selectedOwner = ownerCandidates.find((candidate) => candidate.id === stay.ownerUserId) || null;
                  const ownerHandle = normalizeHandle(
                    stay.ownerDisplayName || stay.ownerUsername || stay.ownerEmail?.split('@')[0] || 'user'
                  );
                  const ownerLabel = stay.ownerDisplayName || stay.ownerUsername || stay.ownerEmail || 'N/A';

                  return (
                    <Card
                      key={stay.id}
                      sx={(theme) => ({
                        gridColumn: isEditing ? '1 / -1' : 'auto',
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
                      <Link href={`/stays/${stay.slug}`}>
                        <CardMedia
                          component="img"
                          height="180"
                          image={stay.imageUrl || DEFAULT_STAY_IMAGE}
                          alt={stay.name}
                          sx={{ objectFit: 'cover', objectPosition: 'center', cursor: 'pointer' }}
                        />
                      </Link>
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
                                  component={Link}
                                  href={`/user/${ownerHandle}`}
                                  clickable
                                  label={`Owner: ${ownerLabel}`}
                                />
                              </Stack>
                            </Box>
                            <AppButton
                              variant="outlined"
                              onClick={() => setEditingStayById((prev) => ({ ...prev, [stay.id]: true }))}
                              sx={{ height: 40, minHeight: 40 }}
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
                              <Autocomplete
                                fullWidth
                                options={ownerCandidates}
                                value={selectedOwner}
                                onChange={(_, value) => handleStayFieldChange(stay.id, 'ownerUserId', value?.id || '')}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                getOptionLabel={(option) => option.label || ''}
                                filterOptions={(options, state) => {
                                  const needle = state.inputValue.trim().toLowerCase();
                                  if (!needle) return options;
                                  return options.filter((option) =>
                                    `${option.label} ${option.role}`.toLowerCase().includes(needle)
                                  );
                                }}
                                disabled={isSaving}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Search Owner"
                                    helperText="Selecting a regular user auto-upgrades them to admin"
                                  />
                                )}
                                renderOption={(props, option) => (
                                  <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                      {option.label}
                                    </Typography>
                                    <Chip size="small" label={option.role} />
                                  </Box>
                                )}
                              />
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
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                              <TextField
                                label="Image URL"
                                value={stay.imageUrl}
                                onChange={(e) => handleStayFieldChange(stay.id, 'imageUrl', e.target.value)}
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
                            {Array.isArray(stay.menuItems) && stay.menuItems.length > 0 && (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                  Menu Item Images
                                </Typography>
                                <Stack spacing={1.1}>
                                  {stay.menuItems.map((item, index) => (
                                    <Paper key={`${stay.id}-menu-image-${index}`} variant="outlined" sx={{ p: 1.1 }}>
                                      <Stack spacing={0.8}>
                                        <Typography variant="caption" color="text.secondary">
                                          {item.name || `Item ${index + 1}`} ({item.category || 'menu'})
                                        </Typography>
                                        <TextField
                                          label="Menu Image URL"
                                          size="small"
                                          value={item.imageUrl || DEFAULT_MENU_IMAGE}
                                          onChange={(e) => handleStayMenuItemFieldChange(stay.id, index, 'imageUrl', e.target.value)}
                                          disabled={isSaving}
                                          fullWidth
                                        />
                                        <AppButton component="label" size="small" variant="outlined" disabled={isSaving} sx={{ alignSelf: 'flex-start' }}>
                                          Upload Menu Image
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
                                      </Stack>
                                    </Paper>
                                  ))}
                                </Stack>
                              </Box>
                            )}
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
                              component={Link}
                              href={`/user/${ownerHandle}`}
                              clickable
                              label={`Owner: ${ownerLabel}`}
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
                {filteredStays.length === 0 && (
                  <Alert severity="info">No stays found in the database.</Alert>
                )}
              </Box>

              {filteredStays.length > STAYS_PER_PAGE && (
                <Stack direction="row" justifyContent="center" sx={{ mt: 2.5 }}>
                  <Pagination
                    count={totalStayPages}
                    page={stayPage}
                    onChange={(_, value) => setStayPage(value)}
                    color="primary"
                    shape="rounded"
                  />
                </Stack>
              )}
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2 }}>
                <AppButton variant="outlined" onClick={() => setShowUserFilters((prev) => !prev)}>
                  {showUserFilters ? 'Hide Filters' : 'Filters'}
                </AppButton>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Showing {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}
                </Typography>
              </Stack>

              {showUserFilters && (
                <Box
                  component="form"
                  sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'flex-end' }}
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
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="user-role-filter-label">Role Filter</InputLabel>
                    <Select
                      labelId="user-role-filter-label"
                      label="Role Filter"
                      value={userRoleFilter}
                      onChange={(event) => {
                        setUserRoleFilter(event.target.value);
                        setUserPage(1);
                      }}
                    >
                      <MenuItem value="all">All Users</MenuItem>
                      <MenuItem value="admin">Admins</MenuItem>
                      <MenuItem value="superUser">SuperUsers</MenuItem>
                    </Select>
                  </FormControl>
                  <AppButton variant="contained" type="submit" disabled={usersLoading}>
                    {usersLoading ? 'Searching...' : 'Search'}
                  </AppButton>
                  <AppButton
                    variant="outlined"
                    type="button"
                    disabled={usersLoading}
                    onClick={() => {
                      setUserSearch('');
                      setUserRoleFilter('all');
                      setUserPage(1);
                      fetchUsers('');
                    }}
                  >
                    Reset
                  </AppButton>
                </Box>
              )}

              {usersMessage && (
                <Alert severity={usersMessageSeverity} sx={{ mb: 2 }}>
                  {usersMessage}
                </Alert>
              )}

              <Stack spacing={1.5}>
                {paginatedUsers.map((entry) => {
                  const isSaving = Boolean(updatingRoleById[entry.id]);
                  const isUpdatingBan = Boolean(updatingBanById[entry.id]);
                  const isDeleting = Boolean(deletingUserById[entry.id]);
                  const currentDraft = draftRolesById[entry.id] || entry.role || 'user';
                  const isSelf = entry.id === user.id;
                  const isAdminLike = ['admin', 'superUser'].includes(entry.role || '');
                  const ownedStays = stayItems.filter((stay) => String(stay.ownerUserId) === String(entry.id));
                  const displayLabel = entry.displayName || entry.username || entry.email || 'User';

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
                              src={entry.profileImageUrl}
                              alt={entry.displayName || entry.username || 'User'}
                              sx={{ width: 56, height: 56, bgcolor: entry.profileImageUrl ? 'transparent' : 'primary.main', color: entry.profileImageUrl ? 'inherit' : 'white', fontSize: 18, fontWeight: 700 }}
                            >
                              {!entry.profileImageUrl && (entry.displayName || entry.username || 'U').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1">
                                {displayLabel}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {entry.email || 'N/A'}
                              </Typography>
                              <Stack direction="row" spacing={0.8} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                <Chip label={`Current role: ${entry.role || 'user'}`} size="small" />
                                <Chip
                                  label={entry.isBanned ? 'Banned' : 'Active'}
                                  size="small"
                                  color={entry.isBanned ? 'error' : 'success'}
                                  variant={entry.isBanned ? 'filled' : 'outlined'}
                                />
                              </Stack>
                              {isAdminLike && (
                                <Box sx={{ mt: 1.2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.6 }}>
                                    Owned stays ({ownedStays.length})
                                  </Typography>
                                  <Stack direction="row" spacing={0.7} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                    {ownedStays.map((stay) => (
                                      <Chip
                                        key={stay.id}
                                        component={Link}
                                        href={`/stays/${stay.slug}`}
                                        clickable
                                        size="small"
                                        variant="outlined"
                                        label={stay.name}
                                      />
                                    ))}
                                    {ownedStays.length === 0 && (
                                      <Typography variant="caption" color="text.secondary">
                                        No stays assigned.
                                      </Typography>
                                    )}
                                  </Stack>
                                </Box>
                              )}
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
                                disabled={isSaving || isUpdatingBan || isDeleting || isSelf}
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
                              disabled={isSaving || isUpdatingBan || isDeleting || isSelf || currentDraft === entry.role}
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
                            <AppButton
                              variant="outlined"
                              disabled={isSaving || isUpdatingBan || isDeleting || isSelf}
                              onClick={() => toggleUserBan(entry.id, !entry.isBanned)}
                              sx={{
                                height: 36,
                                minHeight: 36,
                                px: 1.8,
                                color: entry.isBanned ? '#0f766e' : '#b45309',
                                borderColor: entry.isBanned ? 'rgba(15, 118, 110, 0.45)' : 'rgba(180, 83, 9, 0.45)',
                              }}
                            >
                              {isUpdatingBan ? 'Saving...' : entry.isBanned ? 'Unban' : 'Ban'}
                            </AppButton>
                            <AppButton
                              variant="outlined"
                              disabled={isSaving || isUpdatingBan || isDeleting || isSelf}
                              onClick={() => deleteUser(entry.id, displayLabel)}
                              sx={{
                                height: 36,
                                minHeight: 36,
                                px: 1.8,
                                color: '#b91c1c',
                                borderColor: 'rgba(185, 28, 28, 0.38)',
                              }}
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </AppButton>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>

              {filteredUsers.length > USERS_PER_PAGE && (
                <Stack direction="row" justifyContent="center" sx={{ mt: 2.5 }}>
                  <Pagination
                    count={totalUserPages}
                    page={userPage}
                    onChange={(_, value) => setUserPage(value)}
                    color="primary"
                    shape="rounded"
                  />
                </Stack>
              )}
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
  let ownerCandidates = [];
  if (session.user?.role === 'superUser') {
    const stayRows = await query(
      `
        SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.price_per_night,
          s.contact_phone, s.image_url, s.latitude, s.longitude, s.owner_user_id,
          u.email AS owner_email, u.username AS owner_username, u.display_name AS owner_display_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id', m.id, 'category', m.category, 'name', m.name, 'description', m.description,
                'price', m.price, 'imageUrl', m.image_url, 'available', m.available
              ) ORDER BY m.sort_order, m.created_at
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) AS menu_items
        FROM stays s
        LEFT JOIN users u ON u.id = s.owner_user_id
        LEFT JOIN menu_items m ON m.stay_id = s.id
        GROUP BY s.id, u.email, u.username, u.display_name
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
      menuItems: Array.isArray(row.menu_items) ? row.menu_items : [],
      latitude: row.latitude ?? '',
      longitude: row.longitude ?? '',
      ownerEmail: row.owner_email || 'N/A',
      ownerUsername: row.owner_username || '',
      ownerDisplayName: row.owner_display_name || '',
      ownerUserId: row.owner_user_id,
    }));

    const ownerRows = await query(
      `
        SELECT id, email, username, display_name, role
        FROM users
        ORDER BY CASE WHEN role = 'superUser' THEN 0 WHEN role = 'admin' THEN 1 ELSE 2 END,
                 COALESCE(display_name, username, email)
      `
    );

    ownerCandidates = ownerRows.rows.map((row) => {
      const primary = row.display_name || row.username || row.email || row.id;
      const emailPart = row.email ? ` (${row.email})` : '';
      return {
        id: row.id,
        label: `${primary}${emailPart}`,
        role: row.role || 'user',
      };
    });
  }

  return {
    props: {
      user: {
        ...session.user,
        role: session.user?.role || 'user',
      },
      treks,
      stays,
      ownerCandidates,
    },
  };
}
